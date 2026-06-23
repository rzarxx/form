import { NextResponse } from "next/server";
import crypto from "crypto";
import { sql } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { triggerResponseNotifications } from "@/lib/notifications";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-callback-signature");

    if (!signature) {
      console.warn("[Tripay Webhook] Missing x-callback-signature header.");
      return new Response("Missing signature", { status: 400 });
    }

    const privateKey = await getSetting("tripay_private_key");
    if (!privateKey) {
      console.error("[Tripay Webhook] Private key is not configured in settings.");
      return new Response("Webhook configuration missing", { status: 500 });
    }

    // Hitung HMAC-SHA256 signature
    const computedSignature = crypto
      .createHmac("sha256", privateKey)
      .update(rawBody)
      .digest("hex");

    if (computedSignature !== signature) {
      console.warn("[Tripay Webhook] Signature verification failed. Computed:", computedSignature, "Received:", signature);
      return new Response("Invalid signature", { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    console.log("[Tripay Webhook] Signature verified. Received callback payload:", payload);

    const { reference, status } = payload;

    // Cari transaksi di database
    const txRes = await sql`
      SELECT id, user_id, form_id, status, type, form_response_answers, payer_name, payer_email
      FROM transactions WHERE reference = ${reference} LIMIT 1
    `;

    if (txRes.length === 0) {
      console.warn(`[Tripay Webhook] Transaction reference not found in database: ${reference}`);
      return new Response("Transaction not found", { status: 404 });
    }

    const tx = txRes[0];

    // Cegah double-claim / replay attacks
    if (tx.status === "paid") {
      return NextResponse.json({ success: true, message: "Transaction already processed." });
    }

    if (status === "PAID") {
      if (tx.type === "subscription") {
        // Upgrade user ke premium (30 hari dari sekarang)
        if (tx.user_id) {
          await sql`
            UPDATE users 
            SET is_premium = true, premium_expires_at = NOW() + INTERVAL '30 days'
            WHERE id = ${tx.user_id}
          `;
          console.log(`[Tripay Webhook] Upgraded user ${tx.user_id} to Premium.`);
        }
        
        // Update status transaksi di db
        await sql`
          UPDATE transactions
          SET status = 'paid', updated_at = CURRENT_TIMESTAMP
          WHERE id = ${tx.id}
        `;
      } else if (tx.type === "form_payment") {
        // Proses penyimpanan jawaban form yang tertunda
        const answers = tx.form_response_answers;
        const formId = tx.form_id;

        if (formId && answers) {
          // Ambil detail form untuk notifikasi
          const formRes = await sql`
            SELECT title, fields, webhook_url, notify_email
            FROM forms WHERE id = ${formId} LIMIT 1
          `;
          
          if (formRes.length > 0) {
            const form = formRes[0];
            
            // Simpan jawaban ke form_responses
            const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
            const insertRes = await sql`
              INSERT INTO form_responses (form_id, answers, ip_address)
              VALUES (${formId}, ${sql.json(answers)}, ${ip})
              RETURNING id
            `;
            const responseId = insertRes[0]?.id;

            // Update status transaksi dengan response_id
            await sql`
              UPDATE transactions
              SET status = 'paid', form_response_id = ${responseId}, updated_at = CURRENT_TIMESTAMP
              WHERE id = ${tx.id}
            `;

            console.log(`[Tripay Webhook] Saved paid form response ID: ${responseId} for form: ${formId}`);

            // Picu notifikasi (webhook & email)
            await triggerResponseNotifications({
              form: {
                id: formId,
                title: form.title,
                fields: form.fields,
                webhook_url: form.webhook_url,
                notify_email: form.notify_email,
              },
              answers: answers,
              ip: ip,
            });
          }
        }
      }
    } else if (status === "EXPIRED" || status === "FAILED") {
      // Update status transaksi di database
      await sql`
        UPDATE transactions
        SET status = ${status.toLowerCase()}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${tx.id}
      `;
      console.log(`[Tripay Webhook] Transaction ${reference} status updated to: ${status}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Tripay Webhook] Error processing callback:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

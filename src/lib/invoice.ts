import { sql } from "./db";
import { getSetting } from "./settings";
import { jsPDF } from "jspdf";
import { put } from "@vercel/blob";

export async function generateAndSendInvoice(txId: string) {
  try {
    // 1. Fetch transaction and form owner status
    const txRes = await sql`
      SELECT t.id, t.reference, t.amount, t.payer_name, t.payer_email, t.payment_method, t.created_at, t.form_id,
             f.title as form_title, f.user_id as creator_id, u.is_premium as creator_is_premium
      FROM transactions t
      JOIN forms f ON t.form_id = f.id
      JOIN users u ON f.user_id = u.id
      WHERE t.id = ${txId} LIMIT 1
    `;

    if (txRes.length === 0) return;
    const tx = txRes[0];

    // Only generate invoice if the creator is premium/pro
    if (!tx.creator_is_premium) {
      console.log(`[Invoice] Creator is not premium. Skipping invoice generation for tx: ${txId}`);
      return;
    }

    if (!tx.payer_email) {
      console.log(`[Invoice] Payer email is missing. Skipping invoice generation for tx: ${txId}`);
      return;
    }

    console.log(`[Invoice] Generating PDF invoice for transaction ${tx.reference}...`);

    // 2. Generate PDF using jsPDF
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    // Simple, clean invoice layout
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(79, 70, 229); // indigo-600
    doc.text("INVOICE PEMBAYARAN", 20, 25);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(`No. Referensi: ${tx.reference}`, 20, 32);
    doc.text(`Tanggal: ${new Date(tx.created_at).toLocaleString("id-ID")}`, 20, 37);

    // Form / Platform info
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text("Penyedia Formulir:", 20, 50);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`${tx.form_title}`, 20, 56);

    // Buyer info
    doc.setFont("helvetica", "bold");
    doc.text("Ditujukan Kepada:", 120, 50);
    doc.setFont("helvetica", "normal");
    doc.text(`Nama: ${tx.payer_name || "-"}`, 120, 56);
    doc.text(`Email: ${tx.payer_email}`, 120, 61);

    // Divider line
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.line(20, 70, 190, 70);

    // Table Header
    doc.setFont("helvetica", "bold");
    doc.text("Deskripsi Layanan", 20, 80);
    doc.text("Metode", 120, 80);
    doc.text("Total", 160, 80);

    // Table content
    doc.setFont("helvetica", "normal");
    doc.text(`Akses Pendaftaran / Pembayaran Form: ${tx.form_title}`, 20, 90, { maxWidth: 90 });
    doc.text(`${tx.payment_method || "-"}`, 120, 90);
    doc.text(`Rp ${tx.amount.toLocaleString("id-ID")}`, 160, 90);

    doc.line(20, 105, 190, 105);

    // Summary
    doc.setFont("helvetica", "bold");
    doc.text("Total Pembayaran:", 120, 115);
    doc.text(`Rp ${tx.amount.toLocaleString("id-ID")}`, 160, 115);

    // Status Watermark stamp
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(16, 185, 129); // emerald-500
    doc.text("STATUS: PAID (LUNAS)", 20, 135);

    // Footer
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text("Terima kasih atas pembayaran Anda. Dokumen ini adalah bukti transaksi sah yang dihasilkan secara otomatis.", 20, 270);

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

    // 3. Upload PDF to Vercel Blob
    const blobFilename = `invoices/${tx.reference}.pdf`;
    const blobResult = await put(blobFilename, pdfBuffer, {
      access: "public",
      contentType: "application/pdf"
    });

    console.log(`[Invoice] PDF invoice successfully uploaded to: ${blobResult.url}`);

    // 4. Send email via Resend
    const resendApiKey = await getSetting("resend_api_key");
    if (!resendApiKey) {
      console.warn("[Invoice] Resend API Key is not configured. Cannot send email.");
      return;
    }

    const emailPayload = {
      from: "Personal Form Builder <onboarding@resend.dev>",
      to: tx.payer_email,
      subject: `Bukti Pembayaran Sukses: ${tx.form_title}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 12px;">
          <h3 style="color: #4f46e5; margin-top: 0;">Pembayaran Berhasil!</h3>
          <p style="color: #333; font-size: 14px;">Halo ${tx.payer_name || "Pelanggan"},</p>
          <p style="color: #666; font-size: 14px;">Terima kasih atas pembayaran Anda untuk pengisian formulir <strong>${tx.form_title}</strong>.</p>
          <p style="color: #666; font-size: 14px;">Kami telah menerbitkan invoice pembayaran resmi untuk Anda. Silakan unduh dokumen invoice PDF melalui tautan di bawah ini:</p>
          <div style="margin: 20px 0; text-align: center;">
            <a href="${blobResult.url}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Unduh Invoice PDF</a>
          </div>
          <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 14px;">
            <tr style="background: #f9fafb;">
              <td style="padding: 8px; border: 1px solid #eee; font-weight: bold;">No. Referensi</td>
              <td style="padding: 8px; border: 1px solid #eee;">${tx.reference}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #eee; font-weight: bold;">Metode Pembayaran</td>
              <td style="padding: 8px; border: 1px solid #eee;">${tx.payment_method}</td>
            </tr>
            <tr style="background: #f9fafb;">
              <td style="padding: 8px; border: 1px solid #eee; font-weight: bold;">Total Biaya</td>
              <td style="padding: 8px; border: 1px solid #eee; font-weight: bold;">Rp ${tx.amount.toLocaleString("id-ID")}</td>
            </tr>
          </table>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #999; font-size: 11px; text-align: center; margin-bottom: 0;">
            Personal Form Builder
          </p>
        </div>
      `
    };

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`
      },
      body: JSON.stringify(emailPayload)
    });

    const emailResJson = await emailRes.json();
    console.log(`[Invoice] Email successfully sent to ${tx.payer_email}. Resend ID:`, emailResJson);

  } catch (error) {
    console.error(`[Invoice] Failed to generate/send invoice for tx: ${txId}`, error);
  }
}

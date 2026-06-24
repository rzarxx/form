import { getSetting } from "./settings";
import { sql } from "./db";

interface NotificationParams {
  form: {
    id: string;
    title: string;
    fields: any;
    webhook_url?: string;
    notify_email?: string;
  };
  answers: Record<string, any>;
  ip: string;
}

/**
 * Memicu pengiriman webhook pihak ketiga (Discord/Slack/Custom) dan notifikasi email Resend
 */
export async function triggerResponseNotifications({ form, answers, ip }: NotificationParams) {
  // Fetch form owner's premium status
  let isPremium = false;
  try {
    const ownerRes = await sql`
      SELECT u.is_premium, u.role 
      FROM forms f
      JOIN users u ON f.user_id = u.id
      WHERE f.id = ${form.id} LIMIT 1
    `;
    if (ownerRes.length > 0) {
      isPremium = !!ownerRes[0].is_premium || ownerRes[0].role === "super_admin";
    }
  } catch (dbErr) {
    console.error("[Notifications] Failed to verify owner premium status:", dbErr);
  }

  // 1. Send real-time webhook notification if configured (Discord/Slack/Custom)
  // ONLY trigger if the owner has premium status
  if (isPremium && form.webhook_url && form.webhook_url.trim()) {
    const formFields = Array.isArray(form.fields)
      ? form.fields
      : typeof form.fields === "string"
        ? JSON.parse(form.fields)
        : [];

    const fieldsList = Object.entries(answers).map(([key, value]) => {
      const field = formFields.find((f: any) => f.id === key);
      const label = field ? field.label : key;
      let strVal = String(value);
      if (Array.isArray(value)) {
        strVal = value.join(", ");
      }
      return { label, value: strVal };
    });

    const url = form.webhook_url.trim();
    let payload: any = {};

    if (url.includes("discord.com/api/webhooks")) {
      payload = {
        embeds: [
          {
            title: `🎯 Tanggapan Baru: ${form.title}`,
            description: `Seseorang baru saja mengisi formulir Anda.`,
            color: 5814783, // blurple color
            fields: fieldsList.map(item => ({
              name: item.label,
              value: item.value || "-",
              inline: false
            })),
            timestamp: new Date().toISOString(),
            footer: {
              text: `Personal Form Builder • IP: ${ip}`
            }
          }
        ]
      };
    } else if (url.includes("hooks.slack.com")) {
      payload = {
        text: `🎯 *Tanggapan Baru untuk Formulir: ${form.title}*`,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*🎯 Tanggapan Baru untuk Formulir: ${form.title}*\nSeseorang baru saja mengisi formulir Anda.`
            }
          },
          {
            type: "divider"
          },
          ...fieldsList.map(item => ({
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*${item.label}*\n${item.value || "-"}`
            }
          })),
          {
            type: "divider"
          },
          {
            type: "context",
            elements: [
              {
                type: "mrkdwn",
                text: `Dikirim pada ${new Date().toLocaleString("id-ID")} • IP: ${ip}`
              }
            ]
          }
        ]
      };
    } else {
      payload = {
        event: "form.submitted",
        form_id: form.id,
        form_title: form.title,
        submitted_at: new Date().toISOString(),
        ip_address: ip,
        answers: answers
      };
    }

    try {
      await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(5000) // 5s secure timeout check
      });
    } catch (webhookErr) {
      console.error("Error sending webhook notification:", webhookErr);
    }
  }

  const formFields = Array.isArray(form.fields)
    ? form.fields
    : typeof form.fields === "string"
      ? JSON.parse(form.fields)
      : [];

  const fieldsListHtml = Object.entries(answers).map(([key, value]) => {
    const field = formFields.find((f: any) => f.id === key);
    const label = field ? field.label : key;
    let strVal = String(value);
    if (Array.isArray(value)) {
      strVal = value.join(", ");
    }
    return `<tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">${label}</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${strVal || "-"}</td></tr>`;
  }).join("");

  const resendApiKey = await getSetting("resend_api_key");

  // 2. Send real-time email notification if notify_email is configured
  if (form.notify_email && form.notify_email.trim() && resendApiKey) {
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: "Personal Form Builder <onboarding@resend.dev>",
          to: form.notify_email,
          subject: `Tanggapan Baru: ${form.title}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 12px;">
              <h3 style="color: #4f46e5; margin-top: 0;">Tanggapan Baru untuk Formulir: ${form.title}</h3>
              <p style="color: #666; font-size: 14px;">Seseorang baru saja mengisi formulir Anda pada ${new Date().toLocaleString("id-ID")}.</p>
              <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 14px;">
                <thead>
                  <tr style="background: #f9fafb; text-align: left;">
                    <th style="padding: 8px; border-bottom: 2px solid #ddd;">Pertanyaan</th>
                    <th style="padding: 8px; border-bottom: 2px solid #ddd;">Jawaban</th>
                  </tr>
                </thead>
                <tbody>
                  ${fieldsListHtml}
                </tbody>
              </table>
              <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
              <p style="color: #999; font-size: 11px; text-align: center; margin-bottom: 0;">
                Personal Form Builder • IP Pengirim: ${ip}
              </p>
            </div>
          `,
        }),
      });
    } catch (emailErr) {
      console.error("Error sending email notification:", emailErr);
    }
  }

  // 3. Autoresponder Copy Email to Respondent (Premium/Pro Feature)
  if (isPremium && resendApiKey) {
    // Find respondent's email in answers
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const respondentEmailEntry = Object.entries(answers).find(([_, value]) => {
      return typeof value === "string" && emailRegex.test(value.trim());
    });

    if (respondentEmailEntry) {
      const respondentEmail = respondentEmailEntry[1].trim();
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: "Personal Form Builder <onboarding@resend.dev>",
            to: respondentEmail,
            subject: `Salinan Tanggapan Anda: ${form.title}`,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 12px;">
                <h3 style="color: #4f46e5; margin-top: 0;">Salinan Tanggapan Anda</h3>
                <p style="color: #333; font-size: 14px;">Halo,</p>
                <p style="color: #666; font-size: 14px;">Terima kasih telah mengisi formulir <strong>${form.title}</strong>. Berikut adalah rincian jawaban yang telah Anda kirimkan:</p>
                <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 14px;">
                  <thead>
                    <tr style="background: #f9fafb; text-align: left;">
                      <th style="padding: 8px; border-bottom: 2px solid #ddd;">Pertanyaan</th>
                      <th style="padding: 8px; border-bottom: 2px solid #ddd;">Jawaban</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${fieldsListHtml}
                  </tbody>
                </table>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
                <p style="color: #999; font-size: 11px; text-align: center; margin-bottom: 0;">
                  Personal Form Builder
                </p>
              </div>
            `,
          }),
        });
        console.log(`[Autoresponder] Confirmation email sent to ${respondentEmail}`);
      } catch (autoErr) {
        console.error("[Autoresponder] Failed to send email copy:", autoErr);
      }
    }
  }

  // 4. WhatsApp Autoresponder (Premium/Pro Feature)
  if (isPremium) {
    const fonnteToken = await getSetting("fonnte_token");
    if (fonnteToken && fonnteToken.trim()) {
      const phoneRegex = /^[0-9+ -]{9,15}$/;
      const phoneEntry = Object.entries(answers).find(([_, value]) => {
        if (typeof value !== "string") return false;
        const cleanVal = value.replace(/[-\s+]/g, "");
        return phoneRegex.test(value.trim()) && (cleanVal.startsWith("08") || cleanVal.startsWith("628"));
      });

      if (phoneEntry) {
        const rawPhone = phoneEntry[1].trim();
        let cleanPhone = rawPhone.replace(/[-\s+]/g, "");
        if (cleanPhone.startsWith("08")) {
          cleanPhone = "62" + cleanPhone.substring(1);
        }

        try {
          await fetch("https://api.fonnte.com/send", {
            method: "POST",
            headers: {
              Authorization: fonnteToken.trim(),
            },
            body: new URLSearchParams({
              target: cleanPhone,
              message: `Halo! Terima kasih telah mengisi formulir "${form.title}". Tanggapan Anda telah kami terima secara resmi.\n\nPersonal Form Builder`,
            }),
          });
          console.log(`[Autoresponder WA] WhatsApp confirmation successfully sent to ${cleanPhone}`);
        } catch (waErr) {
          console.error("[Autoresponder WA] WhatsApp API call failed:", waErr);
        }
      }
    }
  }
}

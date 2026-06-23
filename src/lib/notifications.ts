import { getSetting } from "./settings";

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
  // 1. Send real-time webhook notification if configured (Discord/Slack/Custom)
  if (form.webhook_url && form.webhook_url.trim()) {
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
        body: JSON.stringify(payload)
      });
    } catch (webhookErr) {
      console.error("Error sending webhook notification:", webhookErr);
    }
  }

  // 2. Send real-time email notification if notify_email is configured
  if (form.notify_email && form.notify_email.trim()) {
    const formFields = Array.isArray(form.fields)
      ? form.fields
      : typeof form.fields === "string"
        ? JSON.parse(form.fields)
        : [];

    const resendApiKey = await getSetting("resend_api_key");
    if (resendApiKey) {
      try {
        const fieldsListHtml = Object.entries(answers).map(([key, value]) => {
          const field = formFields.find((f: any) => f.id === key);
          const label = field ? field.label : key;
          let strVal = String(value);
          if (Array.isArray(value)) {
            strVal = value.join(", ");
          }
          return `<tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">${label}</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${strVal || "-"}</td></tr>`;
        }).join("");

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
  }
}

"use server";

import { cookies, headers } from "next/headers";
import { sql } from "@/lib/db";
import { initDatabase } from "@/lib/db-init";
import { verifyAdminSession } from "@/lib/auth-helper";
import { del } from "@vercel/blob";
import { promises as fs } from "fs";
import path from "path";

// Simple in-memory rate limiter
const ipRequestCounts = new Map<string, { timestamp: number; count: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const timeframe = 60 * 1000; // 1 minute
  const maxLimit = 5;

  const clientData = ipRequestCounts.get(ip);

  if (!clientData) {
    ipRequestCounts.set(ip, { timestamp: now, count: 1 });
    return true;
  }

  if (now - clientData.timestamp > timeframe) {
    // Reset window
    ipRequestCounts.set(ip, { timestamp: now, count: 1 });
    return true;
  }

  if (clientData.count >= maxLimit) {
    return false;
  }

  clientData.count += 1;
  return true;
}

// Helper to enforce authentication in admin actions
async function requireAuth() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("admin_session")?.value;
  const isAuthenticated = await verifyAdminSession(sessionToken);
  if (!isAuthenticated) {
    throw new Error("Unauthorized: Anda harus masuk sebagai admin.");
  }
}

// Helper to extract URLs from JSON answers and delete them
async function deleteResponseBlobs(answersJson: any) {
  let answers: Record<string, any> = {};
  try {
    if (typeof answersJson === "string") {
      answers = JSON.parse(answersJson);
    } else if (answersJson && typeof answersJson === "object") {
      answers = answersJson;
    }
  } catch (e) {
    console.error("Failed to parse answers for blob deletion:", e);
    return;
  }

  const urls: string[] = [];
  for (const key in answers) {
    const val = answers[key];
    if (typeof val === "string") {
      if (val.includes("public.blob.vercel-storage.com")) {
        urls.push(val);
      } else if (val.startsWith("/uploads/")) {
        urls.push(val);
      }
    }
  }

  if (urls.length === 0) return;

  console.log("Found blob URLs in response to delete:", urls);
  for (const url of urls) {
    try {
      if (url.includes("public.blob.vercel-storage.com")) {
        if (process.env.BLOB_READ_WRITE_TOKEN) {
          await del(url);
          console.log("Successfully deleted Vercel Blob:", url);
        } else {
          console.warn("BLOB_READ_WRITE_TOKEN is missing. Cannot delete blob from Vercel:", url);
        }
      } else if (url.startsWith("/uploads/")) {
        const filename = url.replace("/uploads/", "");
        const filePath = path.join(process.cwd(), "public", "uploads", filename);
        await fs.unlink(filePath);
        console.log("Successfully deleted local upload:", filePath);
      }
    } catch (err: any) {
      console.error(`Failed to delete asset ${url}:`, err.message || err);
    }
  }
}

export async function createFormAction(
  title: string,
  description: string,
  fields: any[],
  bannerUrl?: string | null,
  maxResponses: number = 0,
  customSuccessMessage?: string | null,
  redirectUrl?: string | null,
  expiryDate?: string | null,
  notifyEmail?: string | null,
  isActive: boolean = true
) {
  try {
    await requireAuth();
    await initDatabase();

    if (!title) {
      return { success: false, error: "Judul formulir wajib diisi." };
    }

    const fieldsJson = JSON.stringify(fields);

    const result = await sql`
      INSERT INTO forms (
        title, description, fields, banner_url, max_responses, is_active,
        custom_success_message, redirect_url, expiry_date, notify_email
      )
      VALUES (
        ${title}, ${description || null}, ${fieldsJson}, ${bannerUrl || null}, ${maxResponses}, ${isActive},
        ${customSuccessMessage || null}, ${redirectUrl || null}, 
        ${expiryDate ? new Date(expiryDate) : null}, ${notifyEmail || null}
      )
      RETURNING id, title, created_at
    `;

    return { success: true, data: result[0] };
  } catch (error: any) {
    console.error("Error creating form:", error);
    return { success: false, error: error.message || "Gagal membuat formulir." };
  }
}

export async function updateFormAction(
  formId: string,
  title: string,
  description: string,
  fields: any[],
  bannerUrl?: string | null,
  maxResponses: number = 0,
  customSuccessMessage?: string | null,
  redirectUrl?: string | null,
  expiryDate?: string | null,
  notifyEmail?: string | null,
  isActive: boolean = true
) {
  try {
    await requireAuth();
    await initDatabase();

    if (!formId) {
      return { success: false, error: "ID formulir tidak valid." };
    }
    if (!title) {
      return { success: false, error: "Judul formulir wajib diisi." };
    }

    const fieldsJson = JSON.stringify(fields);

    await sql`
      UPDATE forms
      SET 
        title = ${title},
        description = ${description || null},
        fields = ${fieldsJson},
        banner_url = ${bannerUrl || null},
        max_responses = ${maxResponses},
        custom_success_message = ${customSuccessMessage || null},
        redirect_url = ${redirectUrl || null},
        expiry_date = ${expiryDate ? new Date(expiryDate) : null},
        notify_email = ${notifyEmail || null},
        is_active = ${isActive}
      WHERE id = ${formId}
    `;

    return { success: true };
  } catch (error: any) {
    console.error("Error updating form:", error);
    return { success: false, error: error.message || "Gagal memperbarui formulir." };
  }
}

export async function getFormsAction() {
  try {
    await requireAuth();
    await initDatabase();

    // Fetch forms along with response counts using a LEFT JOIN and GROUP BY
    const forms = await sql`
      SELECT f.id, f.title, f.description, f.created_at, f.fields, f.banner_url, f.max_responses, f.is_active,
             f.custom_success_message, f.redirect_url, f.expiry_date, f.notify_email,
             COUNT(r.id)::int as response_count
      FROM forms f
      LEFT JOIN form_responses r ON f.id = r.form_id
      GROUP BY f.id
      ORDER BY f.created_at DESC
    `;

    return { success: true, data: forms };
  } catch (error: any) {
    console.error("Error fetching forms:", error);
    return { success: false, error: error.message || "Gagal memuat daftar formulir." };
  }
}

export async function getFormDetailAction(formId: string) {
  try {
    await requireAuth();
    await initDatabase();

    // Fetch form configuration
    const formResult = await sql`
      SELECT id, title, description, created_at, fields, banner_url, max_responses, is_active,
             custom_success_message, redirect_url, expiry_date, notify_email
      FROM forms
      WHERE id = ${formId}
    `;

    if (formResult.length === 0) {
      return { success: false, error: "Formulir tidak ditemukan." };
    }

    // Fetch responses for this form
    const responses = await sql`
      SELECT id, created_at, answers, ip_address
      FROM form_responses
      WHERE form_id = ${formId}
      ORDER BY created_at DESC
    `;

    return {
      success: true,
      data: {
        form: formResult[0],
        responses: responses,
      },
    };
  } catch (error: any) {
    console.error("Error fetching form details:", error);
    return { success: false, error: error.message || "Gagal memuat detail formulir." };
  }
}

export async function deleteFormAction(formId: string) {
  try {
    await requireAuth();
    await initDatabase();

    // 1. Get form to delete banner
    const formRes = await sql`
      SELECT banner_url FROM forms WHERE id = ${formId}
    `;

    // 2. Get all responses to delete uploaded assets
    const responses = await sql`
      SELECT answers FROM form_responses WHERE form_id = ${formId}
    `;

    // Delete response files
    for (const r of responses) {
      await deleteResponseBlobs(r.answers);
    }

    // Delete banner
    if (formRes.length > 0 && formRes[0].banner_url) {
      const bannerUrl = formRes[0].banner_url;
      try {
        if (bannerUrl.includes("public.blob.vercel-storage.com")) {
          if (process.env.BLOB_READ_WRITE_TOKEN) {
            await del(bannerUrl);
          }
        } else if (bannerUrl.startsWith("/uploads/")) {
          const filename = bannerUrl.replace("/uploads/", "");
          const filePath = path.join(process.cwd(), "public", "uploads", filename);
          await fs.unlink(filePath);
        }
      } catch (err) {
        console.error("Failed to delete banner:", err);
      }
    }

    // 3. Delete form (which cascades deleted responses)
    await sql`
      DELETE FROM forms
      WHERE id = ${formId}
    `;

    return { success: true };
  } catch (error: any) {
    console.error("Error deleting form:", error);
    return { success: false, error: error.message || "Gagal menghapus formulir." };
  }
}

export async function deleteResponseAction(responseId: number) {
  try {
    await requireAuth();
    await initDatabase();

    // 1. Get response details to delete assets
    const responseRes = await sql`
      SELECT answers FROM form_responses WHERE id = ${responseId}
    `;

    if (responseRes.length > 0) {
      await deleteResponseBlobs(responseRes[0].answers);
    }

    // 2. Delete response row
    await sql`
      DELETE FROM form_responses
      WHERE id = ${responseId}
    `;

    return { success: true };
  } catch (error: any) {
    console.error("Error deleting response:", error);
    return { success: false, error: error.message || "Gagal menghapus tanggapan." };
  }
}

export async function submitResponseAction(formId: string, answers: Record<string, any>) {
  try {
    await initDatabase();

    if (!formId) {
      return { success: false, error: "ID formulir tidak valid." };
    }

    // 1. Get client IP address
    const headerList = await headers();
    const ip = headerList.get("x-forwarded-for")?.split(",")[0] || headerList.get("x-real-ip") || "127.0.0.1";

    // 2. Check rate limit (Max 5 submissions per minute per IP)
    const allowed = checkRateLimit(ip);
    if (!allowed) {
      return { success: false, error: "Terlalu banyak permintaan. Silakan tunggu 1 menit sebelum mengirim lagi (Rate Limit)." };
    }

    // 3. Fetch form details to verify if active, limits, and expiry
    const formResult = await sql`
      SELECT title, is_active, max_responses, expiry_date, notify_email, fields FROM forms WHERE id = ${formId}
    `;

    if (formResult.length === 0) {
      return { success: false, error: "Formulir tidak ditemukan." };
    }

    const form = formResult[0];

    // 4. Check if form is active
    if (!form.is_active) {
      return { success: false, error: "Formulir ini sudah ditutup dan tidak menerima tanggapan lagi." };
    }

    // 5. Check if deadline has passed
    if (form.expiry_date) {
      const now = new Date();
      const expiry = new Date(form.expiry_date);
      if (now > expiry) {
        return { success: false, error: "Formulir sudah kadaluarsa (Batas waktu pengisian berakhir)." };
      }
    }

    // 6. Check if max responses per IP is limited
    if (form.max_responses === 1) {
      const existingResponse = await sql`
        SELECT id FROM form_responses 
        WHERE form_id = ${formId} AND ip_address = ${ip} 
        LIMIT 1
      `;
      if (existingResponse.length > 0) {
        return { success: false, error: "Anda sudah mengirimkan tanggapan untuk formulir ini (Batasi 1 Tanggapan per IP)." };
      }
    }

    // 7. Insert response (using sql.json helper for proper JSONB serialization)
    await sql`
      INSERT INTO form_responses (form_id, answers, ip_address)
      VALUES (${formId}, ${sql.json(answers)}, ${ip})
    `;

    // 8. Send real-time email notification if notify_email is configured
    if (form.notify_email && form.notify_email.trim()) {
      const formFields = Array.isArray(form.fields)
        ? form.fields
        : typeof form.fields === "string"
          ? JSON.parse(form.fields)
          : [];

      if (process.env.RESEND_API_KEY) {
        try {
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            },
            body: JSON.stringify({
              from: "Personal Form Builder <onboarding@resend.dev>",
              to: form.notify_email,
              subject: `Tanggapan Baru: ${form.title}`,
              html: `
                <h3>Tanggapan Baru untuk Formulir: ${form.title}</h3>
                <p>Seseorang baru saja mengisi formulir Anda pada ${new Date().toLocaleString("id-ID")}.</p>
                <h4>Detail Jawaban:</h4>
                <ul>
                  ${Object.entries(answers)
                    .map(([key, value]) => {
                      const field = formFields.find((f: any) => f.id === key);
                      const label = field ? field.label : key;
                      return `<li><strong>${label}:</strong> ${value}</li>`;
                    })
                    .join("")}
                </ul>
                <hr />
                <p>IP Address Pengisi: <code>${ip}</code></p>
              `,
            }),
          });
          if (!res.ok) {
            const errText = await res.text();
            console.error("Resend API error response:", errText);
          } else {
            console.log("Email notification sent to:", form.notify_email);
          }
        } catch (emailErr) {
          console.error("Error sending email notification via Resend:", emailErr);
        }
      } else {
        console.log("-----------------------------------------");
        console.log("FALLBACK EMAIL LOG (RESEND_API_KEY not set):");
        console.log("To:", form.notify_email);
        console.log("Subject: Tanggapan Baru: " + form.title);
        console.log("Answers:", answers);
        console.log("-----------------------------------------");
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error submitting response:", error);
    return { success: false, error: error.message || "Gagal mengirim tanggapan." };
  }
}

export async function getPublicFormAction(formId: string) {
  try {
    await initDatabase();

    const formResult = await sql`
      SELECT id, title, description, fields, banner_url, max_responses, is_active,
             custom_success_message, redirect_url, expiry_date, notify_email
      FROM forms
      WHERE id = ${formId}
    `;

    if (formResult.length === 0) {
      return { success: false, error: "Formulir tidak ditemukan." };
    }

    return { success: true, data: formResult[0] };
  } catch (error: any) {
    console.error("Error fetching public form:", error);
    return { success: false, error: error.message || "Gagal memuat formulir." };
  }
}

export async function checkIpSubmissionAction(formId: string) {
  try {
    await initDatabase();
    
    const headerList = await headers();
    const ip = headerList.get("x-forwarded-for")?.split(",")[0] || headerList.get("x-real-ip") || "127.0.0.1";

    const existing = await sql`
      SELECT id FROM form_responses
      WHERE form_id = ${formId} AND ip_address = ${ip}
      LIMIT 1
    `;

    return { success: true, submitted: existing.length > 0 };
  } catch (error: any) {
    console.error("Error checking IP submission:", error);
    return { success: false, error: error.message };
  }
}

export async function toggleFormActiveAction(formId: string, isActive: boolean) {
  try {
    await requireAuth();
    await initDatabase();

    await sql`
      UPDATE forms
      SET is_active = ${isActive}
      WHERE id = ${formId}
    `;

    return { success: true };
  } catch (error: any) {
    console.error("Error toggling form active status:", error);
    return { success: false, error: error.message || "Gagal memperbarui status formulir." };
  }
}

export async function generateFormWithAIAction(prompt: string, userApiKey?: string) {
  try {
    const apiKey = (process.env.OPENROUTER_API_KEY || userApiKey || "").trim();
    if (!apiKey) {
      return { success: false, error: "Kunci API OpenRouter tidak ditemukan. Silakan masukkan API Key di Pengaturan AI terlebih dahulu." };
    }

    const systemPrompt = `Anda adalah asisten pembuat formulir AI yang handal.
Tugas Anda adalah merancang formulir berdasarkan deskripsi/prompt pengguna dalam format JSON.

Format JSON harus berupa objek tunggal dengan struktur sebagai berikut:
{
  "title": "Judul formulir yang menarik",
  "description": "Deskripsi formulir yang informatif",
  "fields": [
    {
      "id": "field_unique_id",
      "label": "Pertanyaan atau label input",
      "type": "text" | "textarea" | "select" | "radio" | "file",
      "required": true atau false,
      "options": ["Pilihan A", "Pilihan B"] (Wajib ada jika type adalah "select" atau "radio")
    }
  ]
}

Aturan penting:
1. Respons harus berupa JSON yang valid. Jangan sertakan teks penjelasan sebelum atau sesudah JSON.
2. Field "type" hanya boleh salah satu dari: "text", "textarea", "select", "radio", "file".
3. Buat minimal 3 pertanyaan dan maksimal 10 pertanyaan yang relevan dengan topik.
4. Buat opsi pilihan ganda yang cerdas dan lengkap untuk tipe "select" atau "radio".
5. Gunakan Bahasa Indonesia.`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://github.com/rzarxx/form",
        "X-Title": "Personal Form Builder",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenRouter API error:", errorText);
      return { success: false, error: `Gagal menghubungi OpenRouter: ${response.statusText} (${response.status})` };
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content?.trim();

    if (!content) {
      return { success: false, error: "Respons kosong dari AI." };
    }

    // Try parsing JSON. Clean the output first if the model included backticks
    let jsonString = content;
    if (jsonString.startsWith("```")) {
      const match = jsonString.match(/```(?:json)?([\s\S]*?)```/);
      if (match) {
        jsonString = match[1].trim();
      }
    }

    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed.title || !Array.isArray(parsed.fields)) {
        return { success: false, error: "Format formulir hasil AI tidak sesuai dengan skema." };
      }

      // Sanitize fields
      const sanitizedFields = parsed.fields.map((f: any, idx: number) => {
        const id = f.id || `field_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 4)}`;
        const type = ["text", "textarea", "select", "radio", "file"].includes(f.type) ? f.type : "text";
        return {
          id,
          label: f.label || `Pertanyaan ${idx + 1}`,
          type,
          required: !!f.required,
          options: (type === "select" || type === "radio") ? (Array.isArray(f.options) ? f.options : ["Pilihan 1"]) : undefined,
          fileTypes: type === "file" ? "*" : undefined,
        };
      });

      return {
        success: true,
        data: {
          title: parsed.title,
          description: parsed.description || "",
          fields: sanitizedFields,
        }
      };
    } catch (e: any) {
      console.error("Failed to parse AI JSON response:", content, e);
      return { success: false, error: "Gagal memproses respons format formulir AI. Silakan coba lagi." };
    }
  } catch (error: any) {
    console.error("Error in generateFormWithAIAction:", error);
    return { success: false, error: error.message || "Terjadi kesalahan internal saat memanggil AI." };
  }
}


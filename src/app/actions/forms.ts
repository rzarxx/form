"use server";

import { cookies, headers } from "next/headers";
import { sql } from "@/lib/db";
import { initDatabase } from "@/lib/db-init";
import { verifyAdminSession, getSessionUser } from "@/lib/auth-helper";
import { getSetting } from "@/lib/settings";
import { del } from "@vercel/blob";
import { triggerResponseNotifications } from "@/lib/notifications";
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

// Helper to enforce authentication in admin actions and return user ID
async function requireAuth(): Promise<string> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("admin_session")?.value;
  const user = await getSessionUser(sessionToken);
  if (!user) {
    throw new Error("Unauthorized: Anda harus masuk.");
  }
  return user.id;
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
  isActive: boolean = true,
  limitOnePerIp: boolean = false,
  maxTotalResponses: number = 0,
  accessPassword?: string | null,
  webhookUrl?: string | null,
  enableTurnstile: boolean = false,
  isPaidForm: boolean = false,
  formPrice: number = 0,
  formPaymentDescription?: string | null
) {
  try {
    const userId = await requireAuth();
    await initDatabase();

    if (!title) {
      return { success: false, error: "Judul formulir wajib diisi." };
    }

    // Check if user is premium
    const userRes = await sql`
      SELECT is_premium, role FROM users WHERE id = ${userId} LIMIT 1
    `;
    const user = userRes[0];
    const isPremium = user ? (!!user.is_premium || user.role === "super_admin") : false;

    if (!isPremium) {
      // Check active forms count limit
      const countRes = await sql`
        SELECT COUNT(*)::int as count FROM forms WHERE user_id = ${userId}
      `;
      if (countRes[0].count >= 3) {
        return { success: false, error: "Batas formulir aktif tercapai. Akun Free dibatasi maksimal 3 formulir. Silakan upgrade ke Premium." };
      }

      // Restrict premium features
      if (enableTurnstile) {
        return { success: false, error: "Fitur Cloudflare Turnstile hanya tersedia untuk anggota Premium." };
      }
      if (redirectUrl) {
        return { success: false, error: "Fitur Custom Redirect URL hanya tersedia untuk anggota Premium." };
      }
      if (webhookUrl) {
        return { success: false, error: "Fitur Webhook hanya tersedia untuk anggota Premium." };
      }
      const hasFileField = fields.some((f: any) => f.type === "file");
      if (hasFileField) {
        return { success: false, error: "Tipe pertanyaan Unggah Berkas hanya tersedia untuk anggota Premium." };
      }
      if (isPaidForm) {
        return { success: false, error: "Fitur Formulir Berbayar hanya tersedia untuk anggota Premium." };
      }
    }

    const fieldsJson = JSON.stringify(fields);

    const result = await sql`
      INSERT INTO forms (
        title, description, fields, banner_url, max_responses, is_active,
        custom_success_message, redirect_url, expiry_date, notify_email,
        limit_one_per_ip, max_total_responses, access_password, webhook_url, enable_turnstile,
        user_id, is_paid_form, form_price, form_payment_description
      )
      VALUES (
        ${title}, ${description || null}, ${fieldsJson}, ${bannerUrl || null}, ${maxResponses}, ${isActive},
        ${customSuccessMessage || null}, ${redirectUrl || null}, 
        ${expiryDate ? new Date(expiryDate) : null}, ${notifyEmail || null},
        ${limitOnePerIp}, ${maxTotalResponses}, ${accessPassword || null}, ${webhookUrl || null}, ${enableTurnstile},
        ${userId}, ${isPaidForm}, ${formPrice}, ${formPaymentDescription || null}
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
  isActive: boolean = true,
  limitOnePerIp: boolean = false,
  maxTotalResponses: number = 0,
  accessPassword?: string | null,
  webhookUrl?: string | null,
  enableTurnstile: boolean = false,
  isPaidForm: boolean = false,
  formPrice: number = 0,
  formPaymentDescription?: string | null
) {
  try {
    const userId = await requireAuth();
    await initDatabase();

    if (!formId) {
      return { success: false, error: "ID formulir tidak valid." };
    }

    // Pengecekan kepemilikan form
    const ownerCheck = await sql`
      SELECT id FROM forms 
      WHERE id = ${formId} AND (user_id = ${userId} OR (user_id IS NULL AND ${userId} = '00000000-0000-0000-0000-000000000000'))
    `;
    if (ownerCheck.length === 0) {
      return { success: false, error: "Unauthorized: Anda tidak memiliki akses untuk mengubah formulir ini." };
    }

    if (!title) {
      return { success: false, error: "Judul formulir wajib diisi." };
    }

    // Check if user is premium
    const userRes = await sql`
      SELECT is_premium, role FROM users WHERE id = ${userId} LIMIT 1
    `;
    const user = userRes[0];
    const isPremium = user ? (!!user.is_premium || user.role === "super_admin") : false;

    if (!isPremium) {
      // Restrict premium features
      if (enableTurnstile) {
        return { success: false, error: "Fitur Cloudflare Turnstile hanya tersedia untuk anggota Premium." };
      }
      if (redirectUrl) {
        return { success: false, error: "Fitur Custom Redirect URL hanya tersedia untuk anggota Premium." };
      }
      if (webhookUrl) {
        return { success: false, error: "Fitur Webhook hanya tersedia untuk anggota Premium." };
      }
      const hasFileField = fields.some((f: any) => f.type === "file");
      if (hasFileField) {
        return { success: false, error: "Tipe pertanyaan Unggah Berkas hanya tersedia untuk anggota Premium." };
      }
      if (isPaidForm) {
        return { success: false, error: "Fitur Formulir Berbayar hanya tersedia untuk anggota Premium." };
      }
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
        is_active = ${isActive},
        limit_one_per_ip = ${limitOnePerIp},
        max_total_responses = ${maxTotalResponses},
        access_password = ${accessPassword || null},
        webhook_url = ${webhookUrl || null},
        enable_turnstile = ${enableTurnstile},
        is_paid_form = ${isPaidForm},
        form_price = ${formPrice},
        form_payment_description = ${formPaymentDescription || null}
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
    const userId = await requireAuth();
    await initDatabase();

    // Fetch forms along with response counts using a LEFT JOIN and GROUP BY
    const forms = await sql`
      SELECT f.id, f.title, f.description, f.created_at, f.fields, f.banner_url, f.max_responses, f.is_active,
             f.custom_success_message, f.redirect_url, f.expiry_date, f.notify_email,
             COUNT(r.id)::int as response_count
      FROM forms f
      LEFT JOIN form_responses r ON f.id = r.form_id
      WHERE f.user_id = ${userId} OR (f.user_id IS NULL AND ${userId} = '00000000-0000-0000-0000-000000000000')
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
    const userId = await requireAuth();
    await initDatabase();

    // Fetch form configuration with ownership check
    const formResult = await sql`
      SELECT id, title, description, created_at, fields, banner_url, max_responses, is_active,
             custom_success_message, redirect_url, expiry_date, notify_email,
             limit_one_per_ip, max_total_responses, access_password, webhook_url, enable_turnstile,
             is_paid_form, form_price, form_payment_description
      FROM forms
      WHERE id = ${formId} AND (user_id = ${userId} OR (user_id IS NULL AND ${userId} = '00000000-0000-0000-0000-000000000000'))
    `;

    if (formResult.length === 0) {
      return { success: false, error: "Formulir tidak ditemukan atau Anda tidak memiliki akses." };
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
    const userId = await requireAuth();
    await initDatabase();

    // 1. Verify ownership and get banner URL
    const formRes = await sql`
      SELECT banner_url FROM forms 
      WHERE id = ${formId} AND (user_id = ${userId} OR (user_id IS NULL AND ${userId} = '00000000-0000-0000-0000-000000000000'))
    `;

    if (formRes.length === 0) {
      return { success: false, error: "Unauthorized: Anda tidak memiliki akses untuk menghapus formulir ini." };
    }

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
    const userId = await requireAuth();
    await initDatabase();

    // 1. Verify ownership and get response details
    const responseRes = await sql`
      SELECT r.answers 
      FROM form_responses r
      JOIN forms f ON r.form_id = f.id
      WHERE r.id = ${responseId} AND (f.user_id = ${userId} OR (f.user_id IS NULL AND ${userId} = '00000000-0000-0000-0000-000000000000'))
    `;

    if (responseRes.length === 0) {
      return { success: false, error: "Unauthorized: Anda tidak memiliki akses untuk menghapus tanggapan ini." };
    }

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

export async function verifyFormPasswordAction(formId: string, password?: string) {
  try {
    await initDatabase();
    if (!formId) {
      return { success: false, error: "ID formulir tidak valid." };
    }
    const formResult = await sql`
      SELECT access_password FROM forms WHERE id = ${formId}
    `;
    if (formResult.length === 0) {
      return { success: false, error: "Formulir tidak ditemukan." };
    }
    const form = formResult[0];
    if (!form.access_password || form.access_password.trim() === "") {
      return { success: true };
    }
    if (form.access_password === password) {
      return { success: true };
    }
    return { success: false, error: "Kata sandi akses salah." };
  } catch (error: any) {
    console.error("Error verifying form password:", error);
    return { success: false, error: error.message || "Gagal memverifikasi kata sandi." };
  }
}

export async function submitResponseAction(
  formId: string,
  answers: Record<string, any>,
  password?: string,
  turnstileToken?: string
) {
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
      SELECT title, is_active, max_responses, expiry_date, notify_email, fields,
             limit_one_per_ip, max_total_responses, access_password, webhook_url, enable_turnstile,
             is_paid_form, form_price, form_payment_description, user_id
      FROM forms WHERE id = ${formId}
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

    // 6. Check Password Protection
    if (form.access_password && form.access_password.trim() !== "") {
      if (form.access_password !== password) {
        return { success: false, error: "Kata sandi akses formulir salah atau tidak disertakan." };
      }
    }

    // 7. Check Cloudflare Turnstile Captcha
    if (form.enable_turnstile) {
      const secretKey = await getSetting("cloudflare_turnstile_secret_key");
      if (secretKey) {
        if (!turnstileToken) {
          return { success: false, error: "Verifikasi Turnstile diperlukan." };
        }
        try {
          console.log("[Turnstile Debug] Verifying token for IP:", ip, "token length:", turnstileToken.length);
          const verifyRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              secret: secretKey,
              response: turnstileToken,
              remoteip: ip || "",
            }).toString(),
          });
          const verifyData = await verifyRes.json();
          if (!verifyData.success) {
            console.error("[Turnstile Debug] Cloudflare verification failed. Response data:", verifyData);
            const errorCodes = verifyData["error-codes"] ? verifyData["error-codes"].join(", ") : "unknown-error";
            return { 
              success: false, 
              error: `Gagal memverifikasi Turnstile Captcha (Kode: ${errorCodes}). Silakan periksa kembali konfigurasi Site Key & Secret Key Anda.` 
            };
          }
          console.log("[Turnstile Debug] Verification successful.");
        } catch (err) {
          console.error("Turnstile verification failed:", err);
          return { success: false, error: "Terjadi kesalahan saat memverifikasi Turnstile Captcha." };
        }
      } else {
        console.warn("CLOUDFLARE_TURNSTILE_SECRET_KEY is not defined. Skipping Turnstile verification.");
      }
    }

    // 8. Enforce Non-Premium Response Limits (Max 100 Responses)
    const ownerRes = await sql`
      SELECT u.is_premium, u.role FROM forms f
      LEFT JOIN users u ON f.user_id = u.id
      WHERE f.id = ${formId}
    `;
    const isOwnerPremium = ownerRes[0] ? (!!ownerRes[0].is_premium || ownerRes[0].role === "super_admin") : false;

    if (!isOwnerPremium) {
      const responseCountResult = await sql`
        SELECT COUNT(id)::int as count FROM form_responses WHERE form_id = ${formId}
      `;
      const count = responseCountResult[0]?.count || 0;
      if (count >= 100) {
        return { success: false, error: "Batas kuota tanggapan untuk formulir gratis (Non-Premium) telah tercapai (Maksimal 100 tanggapan). Silakan upgrade ke Premium untuk menerima lebih banyak tanggapan." };
      }
    }

    // 9. Check if total responses exceeded (custom quota set by creator)
    if (form.max_total_responses && form.max_total_responses > 0) {
      const responseCountResult = await sql`
        SELECT COUNT(id)::int as count FROM form_responses WHERE form_id = ${formId}
      `;
      const count = responseCountResult[0]?.count || 0;
      if (count >= form.max_total_responses) {
        return { success: false, error: `Batas kuota tanggapan formulir ini telah terpenuhi (${form.max_total_responses} tanggapan).` };
      }
    }

    // 10. Check if max responses per IP is limited (limit_one_per_ip or max_responses === 1)
    if (form.limit_one_per_ip || form.max_responses === 1) {
      const existingResponse = await sql`
        SELECT id FROM form_responses 
        WHERE form_id = ${formId} AND ip_address = ${ip} 
        LIMIT 1
      `;
      if (existingResponse.length > 0) {
        return { success: false, error: "Anda sudah mengirimkan tanggapan untuk formulir ini (Batasi 1 Tanggapan per IP)." };
      }
    }

    // 11. Check if paid form checkout is required
    if (form.is_paid_form) {
      return {
        success: true,
        requiresPayment: true,
        formPrice: form.form_price,
        formTitle: form.title,
        formPaymentDescription: form.form_payment_description,
      };
    }

    // 12. Insert response (using sql.json helper for proper JSONB serialization)
    const insertResult = await sql`
      INSERT INTO form_responses (form_id, answers, ip_address)
      VALUES (${formId}, ${sql.json(answers)}, ${ip})
      RETURNING id, created_at
    `;
    const newResponse = insertResult[0];

    // 13. Trigger notifications (webhook and email)
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

    return { success: true, responseId: newResponse?.id };
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
             custom_success_message, redirect_url, expiry_date, notify_email,
             limit_one_per_ip, max_total_responses, enable_turnstile,
             is_paid_form, form_price, form_payment_description,
             (access_password IS NOT NULL AND access_password != '') as has_password
      FROM forms
      WHERE id = ${formId}
    `;

    if (formResult.length === 0) {
      return { success: false, error: "Formulir tidak ditemukan." };
    }

    const form = formResult[0];
    const turnstileSiteKey = await getSetting("cloudflare_turnstile_site_key");

    return { 
      success: true, 
      data: { 
        ...form, 
        turnstile_site_key: turnstileSiteKey 
      } 
    };
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
    const userId = await requireAuth();
    await initDatabase();

    // Verify ownership
    const ownerCheck = await sql`
      SELECT id FROM forms 
      WHERE id = ${formId} AND (user_id = ${userId} OR (user_id IS NULL AND ${userId} = '00000000-0000-0000-0000-000000000000'))
    `;
    if (ownerCheck.length === 0) {
      return { success: false, error: "Unauthorized: Anda tidak memiliki akses untuk mengubah status formulir ini." };
    }

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

export async function generateFormWithAIAction(prompt: string, userApiKey?: string, userModel?: string) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("admin_session")?.value;
    const user = await getSessionUser(sessionToken);

    if (!user) {
      return { success: false, error: "Unauthorized: Silakan masuk terlebih dahulu." };
    }

    let apiKey = (userApiKey || "").trim();
    if (!apiKey) {
      if (user.id !== "00000000-0000-0000-0000-000000000000") {
        try {
          const userRes = await sql`
            SELECT openrouter_api_key FROM users WHERE id = ${user.id} LIMIT 1
          `;
          if (userRes.length > 0 && userRes[0].openrouter_api_key) {
            apiKey = userRes[0].openrouter_api_key.trim();
          }
        } catch (err) {
          console.error("Gagal membaca setelan AI user:", err);
        }
      }
    }

    // Pengguna biasa wajib menggunakan API Key kustom mereka sendiri demi keamanan dan privasi
    if (!apiKey && user.role === "user") {
      return { 
        success: false, 
        error: "Kunci API OpenRouter kustom belum diatur. Untuk keamanan dan privasi, silakan masukkan API Key Anda sendiri di menu 'Setelan AI Akun'." 
      };
    }

    // Hanya Super Admin yang diizinkan menggunakan fallback kunci global/server
    if (!apiKey && user.role === "super_admin") {
      apiKey = (await getSetting("openrouter_api_key")).trim();
    }

    if (!apiKey) {
      return { success: false, error: "Kunci API OpenRouter tidak ditemukan. Silakan hubungi Super Admin untuk mengonfigurasi API Key di Setelan Global." };
    }

    let model = (userModel || "").trim();
    if (!model) {
      try {
        const cookieStore = await cookies();
        const sessionToken = cookieStore.get("admin_session")?.value;
        const user = await getSessionUser(sessionToken);
        if (user && user.id !== "00000000-0000-0000-0000-000000000000") {
          const userRes = await sql`
            SELECT openrouter_model FROM users WHERE id = ${user.id} LIMIT 1
          `;
          if (userRes.length > 0 && userRes[0].openrouter_model) {
            model = userRes[0].openrouter_model.trim();
          }
        }
      } catch (err) {
        console.error("Gagal membaca model AI user:", err);
      }
    }

    if (!model) {
      model = (await getSetting("openrouter_model")).trim();
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
        model: model,
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

export async function getUserFormCreationStatusAction() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("admin_session")?.value;
    const user = await getSessionUser(sessionToken);
    
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const isPremium = !!user.is_premium || user.role === "super_admin";
    
    const countRes = await sql`
      SELECT COUNT(*)::int as count FROM forms WHERE user_id = ${user.id}
    `;
    const count = countRes[0]?.count || 0;

    return {
      success: true,
      isPremium,
      activeFormsCount: count,
      limitExceeded: !isPremium && count >= 3,
    };
  } catch (err: any) {
    console.error("Gagal mendapatkan status pembuatan form:", err);
    return { success: false, error: err.message || "Gagal mendapatkan status." };
  }
}


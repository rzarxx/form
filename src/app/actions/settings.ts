"use server";

import { cookies } from "next/headers";
import { sql } from "@/lib/db";
import { initDatabase } from "@/lib/db-init";
import { verifyAdminSession } from "@/lib/auth-helper";

// Helper untuk validasi sesi admin
async function requireAuth() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("admin_session")?.value;
  const isAuthenticated = await verifyAdminSession(sessionToken);
  if (!isAuthenticated) {
    throw new Error("Unauthorized: Anda harus masuk sebagai admin.");
  }
}

// Helper untuk menyamarkan nilai kunci rahasia/sensitif
function maskSecret(val: string): string {
  if (!val) return "";
  if (val.length <= 8) return "••••••••";
  return val.substring(0, 6) + "••••••••" + val.substring(val.length - 2);
}

/**
 * Mengambil setelan global yang terkonfigurasi.
 * Mengembalikan data tersamar untuk kunci rahasia.
 */
export async function getGlobalSettingsAction() {
  await requireAuth();
  await initDatabase();

  try {
    const dbSettings = await sql`SELECT key, value FROM settings`;
    const settingsMap: Record<string, string> = {};
    dbSettings.forEach((row) => {
      settingsMap[row.key] = row.value || "";
    });

    const openrouterApiKey = settingsMap["openrouter_api_key"] || process.env.OPENROUTER_API_KEY || "";
    const openrouterModel = settingsMap["openrouter_model"] || process.env.OPENROUTER_MODEL || "google/gemini-2.5-flash";
    const turnstileSiteKey = settingsMap["cloudflare_turnstile_site_key"] || process.env.CLOUDFLARE_TURNSTILE_SITE_KEY || "";
    const turnstileSecretKey = settingsMap["cloudflare_turnstile_secret_key"] || process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY || "";
    const resendApiKey = settingsMap["resend_api_key"] || process.env.RESEND_API_KEY || "";

    return {
      success: true,
      data: {
        openrouter_api_key: openrouterApiKey ? maskSecret(openrouterApiKey) : "",
        openrouter_model: openrouterModel,
        cloudflare_turnstile_site_key: turnstileSiteKey, // Site key publik, tidak perlu disamarkan secara ketat
        cloudflare_turnstile_secret_key: turnstileSecretKey ? maskSecret(turnstileSecretKey) : "",
        resend_api_key: resendApiKey ? maskSecret(resendApiKey) : "",
        // Penanda asal konfigurasi
        has_db_openrouter_key: !!settingsMap["openrouter_api_key"],
        has_env_openrouter_key: !!process.env.OPENROUTER_API_KEY,
        has_db_turnstile_secret: !!settingsMap["cloudflare_turnstile_secret_key"],
        has_env_turnstile_secret: !!process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY,
        has_db_resend_key: !!settingsMap["resend_api_key"],
        has_env_resend_key: !!process.env.RESEND_API_KEY,
      }
    };
  } catch (error) {
    console.error("Gagal mengambil setelan global:", error);
    return { success: false, error: "Gagal mengambil data setelan dari database." };
  }
}

/**
 * Menyimpan setelan global ke database.
 * Jika nilai input mengandung '••••' (tersamar), data tersebut dilewati (tidak ditimpa).
 */
export async function saveSettingsAction(formData: Record<string, string>) {
  await requireAuth();
  await initDatabase();

  try {
    const keysToSave = [
      "openrouter_api_key",
      "openrouter_model",
      "cloudflare_turnstile_site_key",
      "cloudflare_turnstile_secret_key",
      "resend_api_key",
    ];

    for (const key of keysToSave) {
      const val = formData[key];
      if (val === undefined) continue;

      // Jika nilai mengandung karakter penyamaran, artinya user tidak mengubahnya.
      if (val.includes("••••")) {
        continue;
      }

      // Lakukan UPSERT ke tabel settings
      await sql`
        INSERT INTO settings (key, value)
        VALUES (${key}, ${val})
        ON CONFLICT (key) DO UPDATE
        SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP
      `;
    }

    return { success: true };
  } catch (error) {
    console.error("Gagal menyimpan setelan global:", error);
    return { success: false, error: "Gagal menyimpan setelan ke database." };
  }
}

import { sql } from "./db";
import { initDatabase } from "./db-init";

/**
 * Mengambil nilai pengaturan global berdasarkan key.
 * Mencari di database terlebih dahulu, jika kosong/gagal akan fallback ke env variable.
 */
export async function getSetting(key: string): Promise<string> {
  await initDatabase();
  try {
    const result = await sql`
      SELECT value FROM settings WHERE key = ${key} LIMIT 1
    `;
    if (result.length > 0) {
      return result[0].value || "";
    }
  } catch (error) {
    console.error(`Gagal mendapatkan setelan untuk key "${key}":`, error);
  }

  // Fallback ke Environment Variables (.env)
  switch (key) {
    case "openrouter_api_key":
      return process.env.OPENROUTER_API_KEY || "";
    case "openrouter_model":
      return process.env.OPENROUTER_MODEL || "google/gemini-2.5-flash";
    case "cloudflare_turnstile_site_key":
      return process.env.CLOUDFLARE_TURNSTILE_SITE_KEY || "0x4AAAAAAAxgf3w7tWexJp15";
    case "cloudflare_turnstile_secret_key":
      return process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY || "";
    case "resend_api_key":
      return process.env.RESEND_API_KEY || "";
    default:
      return "";
  }
}

"use server";

import { cookies } from "next/headers";
import { sql } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-helper";
import { initDatabase } from "@/lib/db-init";

async function requireAuth() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("admin_session")?.value;
  const user = await getSessionUser(sessionToken);
  if (!user) {
    throw new Error("Unauthorized: Anda harus masuk.");
  }
  return user;
}

function maskSecret(val: string): string {
  if (!val) return "";
  if (val.length <= 8) return "••••••••";
  return val.substring(0, 6) + "••••••••" + val.substring(val.length - 2);
}

/**
 * Mengambil setelan API Key AI (OpenRouter) khusus tingkat user (akun sendiri).
 */
export async function getUserSettingsAction() {
  try {
    const user = await requireAuth();
    await initDatabase();

    // Jika user adalah legacy super_admin (ID virtual), dia tidak ada di tabel users
    if (user.id === "00000000-0000-0000-0000-000000000000") {
      return {
        success: true,
        data: {
          openrouter_api_key: "",
          openrouter_model: "google/gemini-2.5-flash",
          is_legacy_admin: true,
        }
      };
    }

    // Ambil setelan AI kustom pengguna dari tabel users
    const userRes = await sql`
      SELECT openrouter_api_key, openrouter_model
      FROM users
      WHERE id = ${user.id}
      LIMIT 1
    `;

    if (userRes.length === 0) {
      return { success: false, error: "Data pengguna tidak ditemukan di database." };
    }

    const userData = userRes[0];
    const apiKey = userData.openrouter_api_key || "";
    const model = userData.openrouter_model || "google/gemini-2.5-flash";

    return {
      success: true,
      data: {
        openrouter_api_key: apiKey ? maskSecret(apiKey) : "",
        openrouter_model: model,
        is_legacy_admin: false,
      }
    };
  } catch (err: any) {
    console.error("Gagal memuat setelan profil user:", err);
    return { success: false, error: err.message || "Gagal memuat setelan profil." };
  }
}

/**
 * Menyimpan setelan API Key AI (OpenRouter) tingkat user.
 */
export async function saveUserSettingsAction(openrouterApiKey: string, openrouterModel: string) {
  try {
    const user = await requireAuth();
    await initDatabase();

    if (user.id === "00000000-0000-0000-0000-000000000000") {
      return { success: false, error: "Legacy Admin tidak memiliki profil database. Setelan AI Anda dikelola lewat Setelan Global." };
    }

    if (openrouterApiKey.includes("••••")) {
      // Hanya perbarui model, jangan timpa API Key (karena ter-masking)
      await sql`
        UPDATE users
        SET openrouter_model = ${openrouterModel}
        WHERE id = ${user.id}
      `;
    } else {
      // Perbarui API Key dan Model sekaligus
      await sql`
        UPDATE users
        SET openrouter_api_key = ${openrouterApiKey}, openrouter_model = ${openrouterModel}
        WHERE id = ${user.id}
      `;
    }

    return { success: true };
  } catch (err: any) {
    console.error("Gagal menyimpan setelan profil user:", err);
    return { success: false, error: err.message || "Gagal menyimpan setelan profil." };
  }
}

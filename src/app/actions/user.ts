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
          ai_provider: "openrouter",
          openrouter_api_key: "",
          openrouter_model: "google/gemini-2.5-flash",
          gemini_api_key: "",
          gemini_model: "gemini-2.5-flash",
          openai_api_key: "",
          openai_model: "gpt-4o-mini",
          is_legacy_admin: true,
        }
      };
    }

    // Ambil setelan AI kustom pengguna dari tabel users
    const userRes = await sql`
      SELECT ai_provider, openrouter_api_key, openrouter_model,
             gemini_api_key, gemini_model, openai_api_key, openai_model
      FROM users
      WHERE id = ${user.id}
      LIMIT 1
    `;

    if (userRes.length === 0) {
      return { success: false, error: "Data pengguna tidak ditemukan di database." };
    }

    const userData = userRes[0];
    const aiProvider = userData.ai_provider || "openrouter";
    const openrouterApiKey = userData.openrouter_api_key || "";
    const openrouterModel = userData.openrouter_model || "google/gemini-2.5-flash";
    const geminiApiKey = userData.gemini_api_key || "";
    const geminiModel = userData.gemini_model || "gemini-2.5-flash";
    const openaiApiKey = userData.openai_api_key || "";
    const openaiModel = userData.openai_model || "gpt-4o-mini";

    return {
      success: true,
      data: {
        ai_provider: aiProvider,
        openrouter_api_key: openrouterApiKey ? maskSecret(openrouterApiKey) : "",
        openrouter_model: openrouterModel,
        gemini_api_key: geminiApiKey ? maskSecret(geminiApiKey) : "",
        gemini_model: geminiModel,
        openai_api_key: openaiApiKey ? maskSecret(openaiApiKey) : "",
        openai_model: openaiModel,
        is_legacy_admin: false,
      }
    };
  } catch (err: any) {
    console.error("Gagal memuat setelan profil user:", err);
    return { success: false, error: err.message || "Gagal memuat setelan profil." };
  }
}

/**
 * Menyimpan setelan API Key AI tingkat user.
 */
export async function saveUserSettingsAction(settings: {
  ai_provider: string;
  openrouter_api_key: string;
  openrouter_model: string;
  gemini_api_key: string;
  gemini_model: string;
  openai_api_key: string;
  openai_model: string;
}) {
  try {
    const user = await requireAuth();
    await initDatabase();

    if (user.id === "00000000-0000-0000-0000-000000000000") {
      return { success: false, error: "Legacy Admin tidak memiliki profil database. Setelan AI Anda dikelola lewat Setelan Global." };
    }

    const userRes = await sql`
      SELECT openrouter_api_key, gemini_api_key, openai_api_key
      FROM users
      WHERE id = ${user.id}
      LIMIT 1
    `;
    if (userRes.length === 0) {
      return { success: false, error: "Data pengguna tidak ditemukan." };
    }
    const currentUser = userRes[0];

    const finalOpenrouterKey = settings.openrouter_api_key.includes("••••") 
      ? currentUser.openrouter_api_key 
      : settings.openrouter_api_key;

    const finalGeminiKey = settings.gemini_api_key.includes("••••") 
      ? currentUser.gemini_api_key 
      : settings.gemini_api_key;

    const finalOpenaiKey = settings.openai_api_key.includes("••••") 
      ? currentUser.openai_api_key 
      : settings.openai_api_key;

    await sql`
      UPDATE users
      SET ai_provider = ${settings.ai_provider},
          openrouter_api_key = ${finalOpenrouterKey},
          openrouter_model = ${settings.openrouter_model},
          gemini_api_key = ${finalGeminiKey},
          gemini_model = ${settings.gemini_model},
          openai_api_key = ${finalOpenaiKey},
          openai_model = ${settings.openai_model}
      WHERE id = ${user.id}
    `;

    return { success: true };
  } catch (err: any) {
    console.error("Gagal menyimpan setelan profil user:", err);
    return { success: false, error: err.message || "Gagal menyimpan setelan profil." };
  }
}

import { sql } from "./db";
import bcrypt from "bcryptjs";

// Legacy SHA-256 password hashing for session tokens and old accounts verification
export async function hashPasswordLegacy(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "salt-for-form-builder");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Hash password baru menggunakan bcrypt dengan 10 salt rounds.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Memverifikasi sandi raw dengan hash (mendukung bcrypt dan fallback SHA-256 lama).
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<{ isValid: boolean; needsMigration: boolean }> {
  // Bcrypt hash dimulai dengan prefix '$2a$', '$2b$', atau '$2y$'
  const isBcrypt = hash.startsWith("$2");
  if (isBcrypt) {
    const isValid = await bcrypt.compare(password, hash);
    return { isValid, needsMigration: false };
  } else {
    // Fallback ke hash SHA-256 lama
    const legacyHash = await hashPasswordLegacy(password);
    const isValid = legacyHash === hash;
    return { isValid, needsMigration: isValid };
  }
}

/**
 * Mendapatkan data pengguna yang sedang aktif berdasarkan token sesi.
 * Mendukung sesi database (UUID) dan legacy admin (SHA-256 hash).
 */
export async function getSessionUser(sessionToken: string | undefined): Promise<{ id: string, email: string, role: string, is_premium?: boolean, premium_expires_at?: string | null } | null> {
  if (!sessionToken) return null;

  // 1. Cek sesi database (Panjang UUID standard adalah 36)
  if (sessionToken.length === 36 && sessionToken.includes("-")) {
    try {
      const sessionRes = await sql`
        SELECT s.user_id, u.email, u.role, u.is_premium, u.premium_expires_at
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.id = ${sessionToken} AND s.expires_at > CURRENT_TIMESTAMP
        LIMIT 1
      `;
      if (sessionRes.length > 0) {
        const dbUser = sessionRes[0];
        const isPremiumActive = dbUser.is_premium === true && (dbUser.premium_expires_at === null || new Date(dbUser.premium_expires_at) > new Date());
        
        return {
          id: dbUser.user_id,
          email: dbUser.email,
          role: dbUser.role || "user",
          is_premium: isPremiumActive,
          premium_expires_at: dbUser.premium_expires_at ? new Date(dbUser.premium_expires_at).toISOString() : null,
        };
      }
    } catch (error) {
      console.error("Gagal memverifikasi sesi database:", error);
    }
  }

  // 2. Fallback untuk legacy single-user admin (ADMIN_PASSWORD di .env)
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
  const expectedToken = await hashPasswordLegacy(adminPassword);
  if (sessionToken === expectedToken) {
    return {
      id: "00000000-0000-0000-0000-000000000000",
      email: "admin@form.com",
      role: "super_admin",
      is_premium: true,
      premium_expires_at: null,
    };
  }

  return null;
}

export async function verifyAdminSession(sessionToken: string | undefined): Promise<boolean> {
  const user = await getSessionUser(sessionToken);
  return user !== null;
}

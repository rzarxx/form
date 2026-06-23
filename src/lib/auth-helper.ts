import { sql } from "./db";

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "salt-for-form-builder");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
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
  const expectedToken = await hashPassword(adminPassword);
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

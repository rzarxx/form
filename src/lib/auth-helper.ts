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
export async function getSessionUser(sessionToken: string | undefined): Promise<{ id: string, email: string, role: string } | null> {
  if (!sessionToken) return null;

  // 1. Cek sesi database (Panjang UUID standard adalah 36)
  if (sessionToken.length === 36 && sessionToken.includes("-")) {
    try {
      const sessionRes = await sql`
        SELECT s.user_id, u.email, u.role
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.id = ${sessionToken} AND s.expires_at > CURRENT_TIMESTAMP
        LIMIT 1
      `;
      if (sessionRes.length > 0) {
        return {
          id: sessionRes[0].user_id,
          email: sessionRes[0].email,
          role: sessionRes[0].role || "user",
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
    };
  }

  return null;
}

export async function verifyAdminSession(sessionToken: string | undefined): Promise<boolean> {
  const user = await getSessionUser(sessionToken);
  return user !== null;
}

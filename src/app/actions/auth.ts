"use server";

import { cookies } from "next/headers";
import { sql } from "@/lib/db";
import { hashPassword, getSessionUser } from "@/lib/auth-helper";
import { initDatabase } from "@/lib/db-init";

/**
 * Helper untuk memastikan pemanggil adalah Super Admin.
 */
async function requireSuperAdmin() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("admin_session")?.value;
  const user = await getSessionUser(sessionToken);
  if (!user || user.role !== "super_admin") {
    throw new Error("Unauthorized: Hanya Super Admin yang diizinkan.");
  }
}

/**
 * Melakukan verifikasi login.
 * Mendukung email + password dari database, atau password saja untuk legacy admin.
 */
export async function loginAction(password: string, email?: string) {
  await initDatabase();

  const trimmedEmail = email?.trim().toLowerCase();

  // 1. Login menggunakan akun terdaftar (Email & Password)
  if (trimmedEmail && trimmedEmail !== "") {
    try {
      const userRes = await sql`
        SELECT id, email, password_hash, role
        FROM users
        WHERE email = ${trimmedEmail}
        LIMIT 1
      `;

      if (userRes.length === 0) {
        return { success: false, error: "Email atau Password salah!" };
      }

      const user = userRes[0];
      const hashedPasswordInput = await hashPassword(password);

      if (user.password_hash !== hashedPasswordInput) {
        return { success: false, error: "Email atau Password salah!" };
      }

      // Buat sesi di database
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 7); // Valid 1 minggu

      const sessionRes = await sql`
        INSERT INTO sessions (user_id, expires_at)
        VALUES (${user.id}, ${expiry})
        RETURNING id
      `;

      const sessionId = sessionRes[0].id;
      const cookieStore = await cookies();
      cookieStore.set("admin_session", sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });

      return { success: true };
    } catch (err) {
      console.error("Login error:", err);
      return { success: false, error: "Gagal memproses login ke database." };
    }
  }

  // 2. Fallback login menggunakan ADMIN_PASSWORD .env (Legacy Admin)
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
  if (password === adminPassword) {
    const token = await hashPassword(adminPassword);
    const cookieStore = await cookies();
    cookieStore.set("admin_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return { success: true };
  }

  return { success: false, error: "Sandi salah!" };
}

/**
 * Mendaftarkan akun publik baru (berperan sebagai 'user' secara default).
 */
export async function registerAction(email: string, password: string) {
  await initDatabase();

  const trimmedEmail = email.trim().toLowerCase();
  if (!trimmedEmail || !password) {
    return { success: false, error: "Email dan Password wajib diisi." };
  }

  try {
    // Periksa apakah email sudah terdaftar
    const existing = await sql`
      SELECT id FROM users WHERE email = ${trimmedEmail} LIMIT 1
    `;
    if (existing.length > 0) {
      return { success: false, error: "Email tersebut sudah terdaftar." };
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Daftarkan pengguna baru (Role 'user' secara default)
    const userRes = await sql`
      INSERT INTO users (email, password_hash, role)
      VALUES (${trimmedEmail}, ${hashedPassword}, 'user')
      RETURNING id
    `;
    const userId = userRes[0].id;

    // Buat sesi otomatis setelah mendaftar
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 7);

    const sessionRes = await sql`
      INSERT INTO sessions (user_id, expires_at)
      VALUES (${userId}, ${expiry})
      RETURNING id
    `;
    const sessionId = sessionRes[0].id;

    const cookieStore = await cookies();
    cookieStore.set("admin_session", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return { success: true };
  } catch (err) {
    console.error("Registration error:", err);
    return { success: false, error: "Terjadi kesalahan sistem saat mendaftar." };
  }
}

/**
 * Melakukan peniruan identitas (Impersonate) sebagai pengguna lain.
 * Hanya diizinkan bagi Super Admin.
 */
export async function impersonateUserAction(targetUserId: string) {
  try {
    await requireSuperAdmin();
    await initDatabase();

    // Pastikan user target terdaftar
    const targetUser = await sql`
      SELECT id, email, role FROM users WHERE id = ${targetUserId} LIMIT 1
    `;
    if (targetUser.length === 0) {
      return { success: false, error: "Pengguna target tidak ditemukan." };
    }

    // Buat sesi untuk user target
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 7);

    const sessionRes = await sql`
      INSERT INTO sessions (user_id, expires_at)
      VALUES (${targetUserId}, ${expiry})
      RETURNING id
    `;
    const sessionId = sessionRes[0].id;

    // Timpa cookie sesi dengan sesi pengguna target
    const cookieStore = await cookies();
    cookieStore.set("admin_session", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return { success: true };
  } catch (err: any) {
    console.error("Impersonation error:", err);
    return { success: false, error: err.message || "Gagal masuk sebagai pengguna." };
  }
}

/**
 * Mengambil daftar seluruh pengguna terdaftar di sistem.
 * Hanya untuk Super Admin.
 */
export async function getUsersAction() {
  try {
    await requireSuperAdmin();
    await initDatabase();

    const users = await sql`
      SELECT id, email, role, created_at
      FROM users
      ORDER BY created_at DESC
    `;

    return { success: true, data: users };
  } catch (err: any) {
    console.error("Get users error:", err);
    return { success: false, error: err.message || "Gagal mengambil daftar pengguna." };
  }
}

/**
 * Keluar dari sesi admin/user.
 */
export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete("admin_session");
  return { success: true };
}

/**
 * Mengambil data pengguna aktif beserta perannya (role).
 */
export async function getCurrentUserAction() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("admin_session")?.value;
    const user = await getSessionUser(sessionToken);
    if (!user) {
      return { success: false, error: "Sesi tidak ditemukan atau kedaluwarsa." };
    }
    return { success: true, user };
  } catch (err) {
    console.error("Gagal mendapatkan user aktif:", err);
    return { success: false, error: "Gagal mengambil data pengguna." };
  }
}

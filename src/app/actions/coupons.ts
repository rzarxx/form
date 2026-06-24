"use server";

import { cookies } from "next/headers";
import { sql } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-helper";
import { initDatabase } from "@/lib/db-init";

async function requireUser() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("admin_session")?.value;
  const user = await getSessionUser(sessionToken);
  if (!user) {
    throw new Error("Unauthorized: Anda harus login terlebih dahulu.");
  }
  return user;
}

/**
 * Mengambil seluruh daftar kupon yang aktif/non-aktif untuk formulir tertentu (untuk Creator)
 */
export async function getFormCouponsAction(formId: string) {
  try {
    await initDatabase();
    const user = await requireUser();

    // Pastikan form tersebut milik user
    const formOwner = await sql`
      SELECT user_id FROM forms WHERE id = ${formId} LIMIT 1
    `;
    if (formOwner.length === 0 || formOwner[0].user_id !== user.id) {
      return { success: false, error: "Unauthorized: Formulir tidak ditemukan atau bukan milik Anda." };
    }

    const res = await sql`
      SELECT id, code, discount_type, discount_value, max_uses, used_count, is_active, expires_at, created_at
      FROM coupons
      WHERE form_id = ${formId}
      ORDER BY created_at DESC
    `;

    return { success: true, data: res };
  } catch (err: any) {
    console.error("Error getFormCouponsAction:", err);
    return { success: false, error: err.message || "Gagal memuat daftar kupon." };
  }
}

/**
 * Membuat kupon diskon baru untuk sebuah formulir (untuk Creator)
 */
export async function createCouponAction(formData: {
  formId: string;
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  maxUses: number | null;
  expiresAt: string | null;
}) {
  try {
    await initDatabase();
    const user = await requireUser();

    const { formId, code, discountType, discountValue, maxUses, expiresAt } = formData;

    if (!code || !code.trim()) {
      return { success: false, error: "Kode kupon wajib diisi." };
    }

    const cleanCode = code.trim().toUpperCase();

    if (discountValue <= 0) {
      return { success: false, error: "Nilai potongan kupon harus lebih dari 0." };
    }

    if (discountType === "percentage" && discountValue > 100) {
      return { success: false, error: "Potongan persentase tidak boleh melebihi 100%." };
    }

    // Pastikan form milik user
    const formOwner = await sql`
      SELECT user_id FROM forms WHERE id = ${formId} LIMIT 1
    `;
    if (formOwner.length === 0 || formOwner[0].user_id !== user.id) {
      return { success: false, error: "Unauthorized: Formulir tidak ditemukan." };
    }

    // Cek apakah kode kupon sudah digunakan di form yang sama
    const duplicateRes = await sql`
      SELECT id FROM coupons WHERE form_id = ${formId} AND code = ${cleanCode} LIMIT 1
    `;
    if (duplicateRes.length > 0) {
      return { success: false, error: "Kupon dengan kode tersebut sudah ada untuk formulir ini." };
    }

    await sql`
      INSERT INTO coupons (
        form_id,
        code,
        discount_type,
        discount_value,
        max_uses,
        expires_at
      ) VALUES (
        ${formId},
        ${cleanCode},
        ${discountType},
        ${discountValue},
        ${maxUses || null},
        ${expiresAt || null}
      )
    `;

    return { success: true, message: `Kupon ${cleanCode} berhasil dibuat!` };
  } catch (err: any) {
    console.error("Error createCouponAction:", err);
    return { success: false, error: err.message || "Gagal membuat kupon." };
  }
}

/**
 * Menghapus kupon diskon (untuk Creator)
 */
export async function deleteCouponAction(couponId: string) {
  try {
    await initDatabase();
    const user = await requireUser();

    // Cek kepemilikan form terkait kupon
    const couponRes = await sql`
      SELECT c.form_id, f.user_id 
      FROM coupons c
      JOIN forms f ON c.form_id = f.id
      WHERE c.id = ${couponId}
      LIMIT 1
    `;

    if (couponRes.length === 0 || couponRes[0].user_id !== user.id) {
      return { success: false, error: "Unauthorized: Kupon tidak ditemukan." };
    }

    await sql`
      DELETE FROM coupons WHERE id = ${couponId}
    `;

    return { success: true, message: "Kupon berhasil dihapus." };
  } catch (err: any) {
    console.error("Error deleteCouponAction:", err);
    return { success: false, error: err.message || "Gagal menghapus kupon." };
  }
}

/**
 * Memvalidasi kode kupon saat responden mengisi form (Publik)
 */
export async function validateCouponAction(formId: string, code: string, originalPrice: number) {
  try {
    await initDatabase();
    
    if (!code || !code.trim()) {
      return { success: false, error: "Kode kupon belum dimasukkan." };
    }

    const cleanCode = code.trim().toUpperCase();

    const couponRes = await sql`
      SELECT id, discount_type, discount_value, max_uses, used_count, is_active, expires_at
      FROM coupons
      WHERE form_id = ${formId} AND code = ${cleanCode} LIMIT 1
    `;

    if (couponRes.length === 0) {
      return { success: false, error: "Kode kupon tidak valid atau tidak terdaftar untuk formulir ini." };
    }

    const coupon = couponRes[0];

    if (!coupon.is_active) {
      return { success: false, error: "Kupon ini sudah tidak aktif." };
    }

    if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
      return { success: false, error: "Kuota pemakaian kupon ini sudah habis." };
    }

    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return { success: false, error: "Kupon ini sudah kedaluwarsa." };
    }

    // Hitung potongan
    let discountAmount = 0;
    if (coupon.discount_type === "percentage") {
      discountAmount = Math.round(originalPrice * (coupon.discount_value / 100));
    } else {
      discountAmount = coupon.discount_value;
    }

    // Pastikan diskon tidak melebihi harga asli
    if (discountAmount > originalPrice) {
      discountAmount = originalPrice;
    }

    const finalPrice = originalPrice - discountAmount;

    return { 
      success: true, 
      data: {
        couponId: coupon.id,
        discountType: coupon.discount_type,
        discountValue: coupon.discount_value,
        discountAmount: discountAmount,
        finalPrice: finalPrice
      }
    };
  } catch (err: any) {
    console.error("Error validateCouponAction:", err);
    return { success: false, error: err.message || "Gagal memverifikasi kupon." };
  }
}

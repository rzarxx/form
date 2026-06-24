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

async function requireSuperAdmin() {
  const user = await requireUser();
  if (user.role !== "super_admin") {
    throw new Error("Unauthorized: Hanya Super Admin yang diizinkan.");
  }
  return user;
}

/**
 * Mengambil data saldo aktif dan statistik penarikan Creator
 */
export async function getCreatorBalanceAction() {
  try {
    await initDatabase();
    const user = await requireUser();

    const res = await sql`
      SELECT balance, total_earned, total_withdrawn, updated_at
      FROM balances
      WHERE user_id = ${user.id}
      LIMIT 1
    `;

    if (res.length === 0) {
      return {
        success: true,
        data: {
          balance: 0,
          total_earned: 0,
          total_withdrawn: 0,
          updated_at: new Date().toISOString()
        }
      };
    }

    return { success: true, data: res[0] };
  } catch (err: any) {
    console.error("Error getCreatorBalanceAction:", err);
    return { success: false, error: err.message || "Gagal mengambil data saldo." };
  }
}

/**
 * Mengajukan penarikan dana baru oleh Creator
 */
export async function requestWithdrawalAction(formData: {
  amount: number;
  bankName: string;
  accountNumber: string;
  accountName: string;
}) {
  try {
    await initDatabase();
    const user = await requireUser();

    const { amount, bankName, accountNumber, accountName } = formData;

    if (!amount || amount <= 0) {
      return { success: false, error: "Jumlah penarikan harus lebih dari 0." };
    }

    if (amount < 20000) {
      return { success: false, error: "Minimal penarikan dana adalah Rp20.000." };
    }

    if (!bankName.trim() || !accountNumber.trim() || !accountName.trim()) {
      return { success: false, error: "Semua informasi rekening bank wajib diisi." };
    }

    // Ambil saldo aktif saat ini
    const balanceRes = await sql`
      SELECT balance FROM balances WHERE user_id = ${user.id} LIMIT 1
    `;

    const currentBalance = balanceRes.length > 0 ? balanceRes[0].balance : 0;

    if (currentBalance < amount) {
      return { success: false, error: `Saldo Anda tidak mencukupi. Saldo aktif Anda saat ini: Rp${currentBalance.toLocaleString("id-ID")}` };
    }

    // Lakukan pemotongan saldo dan pembuatan penarikan dalam satu alur
    // 1. Kurangi saldo aktif Creator
    await sql`
      UPDATE balances
      SET balance = balance - ${amount},
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ${user.id}
    `;

    // 2. Buat record penarikan
    await sql`
      INSERT INTO withdrawals (
        user_id,
        amount,
        bank_name,
        account_number,
        account_name,
        status
      ) VALUES (
        ${user.id},
        ${amount},
        ${bankName},
        ${accountNumber},
        ${accountName},
        'pending'
      )
    `;

    return { success: true, message: "Pengajuan penarikan dana berhasil dikirim dan sedang diproses oleh admin." };
  } catch (err: any) {
    console.error("Error requestWithdrawalAction:", err);
    return { success: false, error: err.message || "Gagal mengajukan penarikan dana." };
  }
}

/**
 * Mengambil riwayat penarikan dana milik Creator
 */
export async function getWithdrawalHistoryAction() {
  try {
    await initDatabase();
    const user = await requireUser();

    const res = await sql`
      SELECT id, amount, bank_name, account_number, account_name, status, created_at, completed_at
      FROM withdrawals
      WHERE user_id = ${user.id}
      ORDER BY created_at DESC
    `;

    return { success: true, data: res };
  } catch (err: any) {
    console.error("Error getWithdrawalHistoryAction:", err);
    return { success: false, error: err.message || "Gagal mengambil riwayat penarikan." };
  }
}

/**
 * Mengambil seluruh daftar penarikan dana (untuk Super Admin)
 */
export async function getAdminPendingWithdrawalsAction() {
  try {
    await initDatabase();
    await requireSuperAdmin();

    const res = await sql`
      SELECT w.id, w.user_id, u.email as user_email, w.amount, w.bank_name, w.account_number, w.account_name, w.status, w.created_at
      FROM withdrawals w
      JOIN users u ON w.user_id = u.id
      ORDER BY w.created_at ASC
    `;

    return { success: true, data: res };
  } catch (err: any) {
    console.error("Error getAdminPendingWithdrawalsAction:", err);
    return { success: false, error: err.message || "Gagal memuat antrean penarikan." };
  }
}

/**
 * Memproses pengajuan penarikan dana (Disetujui/Ditolak) oleh Super Admin
 */
export async function processWithdrawalAction(withdrawalId: string, status: "completed" | "rejected") {
  try {
    await initDatabase();
    await requireSuperAdmin();

    if (status !== "completed" && status !== "rejected") {
      return { success: false, error: "Status penarikan tidak valid." };
    }

    // Ambil data penarikan
    const withdrawalRes = await sql`
      SELECT user_id, amount, status FROM withdrawals WHERE id = ${withdrawalId} LIMIT 1
    `;

    if (withdrawalRes.length === 0) {
      return { success: false, error: "Data pengajuan penarikan tidak ditemukan." };
    }

    const request = withdrawalRes[0];

    if (request.status !== "pending") {
      return { success: false, error: "Pengajuan penarikan ini sudah diproses sebelumnya." };
    }

    if (status === "completed") {
      // Disetujui: update status dan total yang ditarik
      await sql`
        UPDATE withdrawals
        SET status = 'completed', completed_at = CURRENT_TIMESTAMP
        WHERE id = ${withdrawalId}
      `;

      await sql`
        UPDATE balances
        SET total_withdrawn = total_withdrawn + ${request.amount},
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ${request.user_id}
      `;
    } else {
      // Ditolak: update status dan kembalikan dana ke saldo aktif Creator
      await sql`
        UPDATE withdrawals
        SET status = 'rejected', completed_at = CURRENT_TIMESTAMP
        WHERE id = ${withdrawalId}
      `;

      await sql`
        UPDATE balances
        SET balance = balance + ${request.amount},
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ${request.user_id}
      `;
    }

    return { success: true, message: `Pengajuan penarikan dana berhasil ditandai sebagai ${status === "completed" ? "Selesai" : "Ditolak"}.` };
  } catch (err: any) {
    console.error("Error processWithdrawalAction:", err);
    return { success: false, error: err.message || "Gagal memproses penarikan dana." };
  }
}

/**
 * Mengambil daftar riwayat transaksi masuk (pendapatan) Creator dari form_payment
 */
export async function getCreatorTransactionsAction() {
  try {
    await initDatabase();
    const user = await requireUser();

    // Query untuk mengambil transaksi form berbayar milik Creator
    const res = await sql`
      SELECT t.id, t.reference, t.amount, t.platform_commission, t.creator_amount, t.payment_method, t.status, t.payer_name, t.payer_email, t.created_at, f.title as form_title
      FROM transactions t
      JOIN forms f ON t.form_id = f.id
      WHERE f.user_id = ${user.id} AND t.type = 'form_payment' AND t.status = 'paid'
      ORDER BY t.created_at DESC
    `;

    return { success: true, data: res };
  } catch (err: any) {
    console.error("Error getCreatorTransactionsAction:", err);
    return { success: false, error: err.message || "Gagal mengambil data transaksi masuk." };
  }
}

"use server";

import { cookies, headers } from "next/headers";
import { sql } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { getSessionUser } from "@/lib/auth-helper";
import { createTripayTransaction, getTripayPaymentChannels } from "@/lib/tripay";

// Helper for admin authentication check
async function requireAdmin() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("admin_session")?.value;
  const user = await getSessionUser(sessionToken);
  if (!user || user.role !== "super_admin") {
    throw new Error("Unauthorized: Hanya Super Admin yang diizinkan mengakses menu ini.");
  }
}

// Helper to mask secret keys
function maskSecret(val: string): string {
  if (!val) return "";
  if (val.length <= 8) return "••••••••";
  return val.substring(0, 6) + "••••••••" + val.substring(val.length - 2);
}

/**
 * Mengambil konfigurasi Tripay (hanya untuk Super Admin)
 */
export async function getTripaySettingsAction() {
  await requireAdmin();

  try {
    const dbSettings = await sql`SELECT key, value FROM settings WHERE key LIKE 'tripay_%' OR key = 'premium_monthly_price'`;
    const settingsMap: Record<string, string> = {};
    dbSettings.forEach((row) => {
      settingsMap[row.key] = row.value || "";
    });

    const mode = settingsMap["tripay_mode"] || "sandbox";
    const merchantCode = settingsMap["tripay_merchant_code"] || "";
    const apiKey = settingsMap["tripay_api_key"] || "";
    const privateKey = settingsMap["tripay_private_key"] || "";
    const premiumPrice = parseInt(settingsMap["premium_monthly_price"] || "50000", 10);
    
    let enabledChannels: string[] = [];
    try {
      enabledChannels = JSON.parse(settingsMap["tripay_payment_channels"] || "[]");
    } catch {
      enabledChannels = [];
    }

    // Ambil payment channels aktif langsung dari API Tripay untuk pilihan checklist
    const availableChannels = await getTripayPaymentChannels();

    return {
      success: true,
      data: {
        tripay_mode: mode,
        tripay_merchant_code: merchantCode,
        tripay_api_key: apiKey ? maskSecret(apiKey) : "",
        tripay_private_key: privateKey ? maskSecret(privateKey) : "",
        premium_monthly_price: premiumPrice,
        enabled_channels: enabledChannels,
        available_channels: availableChannels,
        has_api_key: !!apiKey,
        has_private_key: !!privateKey,
      }
    };
  } catch (err) {
    console.error("Gagal memuat setelan Tripay:", err);
    return { success: false, error: "Gagal mengambil data pengaturan Tripay." };
  }
}

/**
 * Menyimpan konfigurasi Tripay (hanya untuk Super Admin)
 */
export async function saveTripaySettingsAction(formData: {
  tripay_mode: string;
  tripay_merchant_code: string;
  tripay_api_key: string;
  tripay_private_key: string;
  premium_monthly_price: number;
  tripay_payment_channels: string[];
}) {
  await requireAdmin();

  try {
    const keysToSave = {
      tripay_mode: formData.tripay_mode,
      tripay_merchant_code: formData.tripay_merchant_code,
      premium_monthly_price: formData.premium_monthly_price.toString(),
      tripay_payment_channels: JSON.stringify(formData.tripay_payment_channels || []),
    };

    // Save standard keys
    for (const [key, val] of Object.entries(keysToSave)) {
      await sql`
        INSERT INTO settings (key, value)
        VALUES (${key}, ${val})
        ON CONFLICT (key) DO UPDATE
        SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP
      `;
    }

    // Save api_key and private_key ONLY if they were changed (not masked)
    if (formData.tripay_api_key && !formData.tripay_api_key.includes("••••")) {
      await sql`
        INSERT INTO settings (key, value)
        VALUES ('tripay_api_key', ${formData.tripay_api_key})
        ON CONFLICT (key) DO UPDATE
        SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP
      `;
    }

    if (formData.tripay_private_key && !formData.tripay_private_key.includes("••••")) {
      await sql`
        INSERT INTO settings (key, value)
        VALUES ('tripay_private_key', ${formData.tripay_private_key})
        ON CONFLICT (key) DO UPDATE
        SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP
      `;
    }

    return { success: true };
  } catch (err) {
    console.error("Gagal menyimpan setelan Tripay:", err);
    return { success: false, error: "Gagal menyimpan data pengaturan Tripay." };
  }
}

/**
 * Membuat transaksi baru di Tripay (Closed Payment)
 * Terbuka untuk umum (form berbayar) dan User (langganan premium)
 */
export async function createPaymentAction(params: {
  type: "subscription" | "form_payment";
  method: string;
  payerName: string;
  payerEmail: string;
  formId?: string;
  formResponseAnswers?: Record<string, any>;
}) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("admin_session")?.value;
    const user = await getSessionUser(sessionToken);

    // Get client's original IP address
    const headerList = await headers();
    const ip = headerList.get("x-forwarded-for")?.split(",")[0] || headerList.get("x-real-ip") || "127.0.0.1";

    let amount = 0;
    let orderItems: any[] = [];
    let merchantRef = "";

    if (params.type === "subscription") {
      if (!user) {
        return { success: false, error: "Silakan login terlebih dahulu untuk berlangganan premium." };
      }
      const rawPrice = await getSetting("premium_monthly_price");
      amount = parseInt(rawPrice || "50000", 10);
      merchantRef = `REF-SUB-${user.id.substring(0, 8)}-${Date.now()}`;
      orderItems = [
        {
          name: "Masa Aktif Premium 30 Hari",
          price: amount,
          quantity: 1,
        }
      ];
    } else if (params.type === "form_payment") {
      if (!params.formId) {
        return { success: false, error: "Form ID tidak valid." };
      }

      // Ambil detail form dari db
      const formRes = await sql`
        SELECT title, is_paid_form, form_price, form_payment_description
        FROM forms WHERE id = ${params.formId} LIMIT 1
      `;
      if (formRes.length === 0) {
        return { success: false, error: "Formulir tidak ditemukan." };
      }

      const form = formRes[0];
      if (!form.is_paid_form) {
        return { success: false, error: "Formulir ini tidak mewajibkan pembayaran." };
      }

      amount = form.form_price || 0;
      merchantRef = `REF-FORM-${params.formId.substring(0, 8)}-${Date.now()}`;
      orderItems = [
        {
          name: `Akses Form: ${form.title}`,
          price: amount,
          quantity: 1,
        }
      ];
    }

    // Panggil API Tripay
    const tripayRes = await createTripayTransaction({
      method: params.method,
      merchantRef: merchantRef,
      amount: amount,
      customerName: params.payerName,
      customerEmail: params.payerEmail,
      orderItems: orderItems,
      returnUrl: params.type === "subscription" 
        ? `${process.env.NEXT_PUBLIC_APP_URL || "https://kapankonserlagi.my.id"}/admin/premium`
        : `${process.env.NEXT_PUBLIC_APP_URL || "https://kapankonserlagi.my.id"}/forms/${params.formId}`,
    });

    if (!tripayRes.success) {
      console.error("[Tripay Debug] Create transaction failed:", tripayRes);
      return { success: false, error: tripayRes.message || "Gagal membuat transaksi di Tripay." };
    }

    const data = tripayRes.data;

    // Catat ke database transaksi
    await sql`
      INSERT INTO transactions (
        user_id,
        form_id,
        reference,
        tripay_reference,
        payment_method,
        amount,
        status,
        type,
        payer_name,
        payer_email,
        ip_address,
        form_response_answers
      ) VALUES (
        ${user ? user.id : null},
        ${params.formId || null},
        ${merchantRef},
        ${data.reference},
        ${params.method},
        ${amount},
        'unpaid',
        ${params.type},
        ${params.payerName},
        ${params.payerEmail},
        ${ip},
        ${params.formResponseAnswers ? JSON.stringify(params.formResponseAnswers) : null}
      )
    `;

    return {
      success: true,
      reference: merchantRef,
      checkoutUrl: data.checkout_url,
      qrUrl: data.qr_url || null,
      qrString: data.qr_string || null,
      payCode: data.pay_code || null,
      instructions: data.instructions || [],
    };
  } catch (err) {
    console.error("Gagal memproses transaksi Tripay:", err);
    return { success: false, error: "Terjadi kesalahan internal saat memproses transaksi pembayaran." };
  }
}

/**
 * Mengecek status pembayaran transaksi di database
 */
export async function checkTransactionStatusAction(reference: string) {
  try {
    const res = await sql`
      SELECT status, form_response_id FROM transactions WHERE reference = ${reference} LIMIT 1
    `;
    if (res.length > 0) {
      return { 
        success: true, 
        status: res[0].status,
        responseId: res[0].form_response_id
      };
    }
    return { success: false, error: "Transaksi tidak ditemukan." };
  } catch (err) {
    console.error("Gagal mengecek status transaksi:", err);
    return { success: false, error: "Gagal mengecek status transaksi." };
  }
}

/**
 * Mengambil harga premium dan metode pembayaran yang aktif (untuk user biasa/umum)
 */
export async function getPremiumPricingAndChannelsAction() {
  try {
    const rawPrice = await getSetting("premium_monthly_price");
    const amount = parseInt(rawPrice || "50000", 10);

    const dbSettings = await sql`SELECT value FROM settings WHERE key = 'tripay_payment_channels' LIMIT 1`;
    let enabledChannels: string[] = [];
    if (dbSettings.length > 0) {
      try {
        enabledChannels = JSON.parse(dbSettings[0].value || "[]");
      } catch {
        enabledChannels = [];
      }
    }

    // Ambil payment channels aktif dari API Tripay
    const availableChannels = await getTripayPaymentChannels();
    const activeChannels = availableChannels.filter((c: any) => enabledChannels.includes(c.code));

    return {
      success: true,
      price: amount,
      channels: activeChannels.length > 0 ? activeChannels : availableChannels
    };
  } catch (err) {
    console.error("Gagal memuat info premium:", err);
    return { success: false, error: "Gagal mengambil data paket premium." };
  }
}

/**
 * Sinkronisasi/mengambil daftar metode pembayaran dari API Tripay secara langsung (untuk Admin settings)
 */
export async function syncTripayPaymentChannelsAction(tempApiKey?: string, tempMode?: string) {
  await requireAdmin();

  try {
    let apiKey = tempApiKey;
    if (!apiKey || apiKey.includes("••••")) {
      apiKey = await getSetting("tripay_api_key");
    }

    if (!apiKey) {
      return { success: false, error: "Kunci API (API Key) belum dikonfigurasi." };
    }

    const mode = tempMode || await getSetting("tripay_mode") || "sandbox";
    const baseUrl = mode === "production"
      ? "https://tripay.co.id/api"
      : "https://tripay.co.id/api-sandbox";

    const res = await fetch(`${baseUrl}/merchant/payment-channel`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    const data = await res.json();
    if (data.success && Array.isArray(data.data)) {
      const activeChannels = data.data.filter((item: any) => item.active === true);
      return { success: true, data: activeChannels };
    }
    return { success: false, error: data.message || "Gagal mengambil payment channels dari Tripay." };
  } catch (err: any) {
    console.error("Gagal sinkronisasi payment channels:", err);
    return { success: false, error: err.message || "Gagal sinkronisasi data dari Tripay." };
  }
}

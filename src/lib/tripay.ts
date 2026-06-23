import crypto from "crypto";
import { getSetting } from "./settings";

interface OrderItem {
  name: string;
  price: number;
  quantity: number;
}

interface CreateTransactionParams {
  method: string;
  merchantRef: string;
  amount: number;
  customerName: string;
  customerEmail: string;
  orderItems: OrderItem[];
  returnUrl?: string;
}

/**
 * Mendapatkan URL API Tripay berdasarkan mode (sandbox/production)
 */
async function getTripayBaseUrl(): Promise<string> {
  const mode = await getSetting("tripay_mode");
  return mode === "production"
    ? "https://tripay.co.id/api"
    : "https://tripay.co.id/api-sandbox";
}

/**
 * Membuat transaksi Closed Payment di Tripay
 */
export async function createTripayTransaction(params: CreateTransactionParams) {
  const merchantCode = await getSetting("tripay_merchant_code");
  const apiKey = await getSetting("tripay_api_key");
  const privateKey = await getSetting("tripay_private_key");

  if (!merchantCode || !apiKey || !privateKey) {
    throw new Error("Konfigurasi payment gateway Tripay belum lengkap. Silakan lengkapi di Setelan Global.");
  }

  const baseUrl = await getTripayBaseUrl();

  // Signature: merchant_code + merchant_ref + amount
  const signature = crypto
    .createHmac("sha256", privateKey)
    .update(merchantCode + params.merchantRef + params.amount)
    .digest("hex");

  const payload = {
    method: params.method,
    merchant_ref: params.merchantRef,
    amount: params.amount,
    customer_name: params.customerName,
    customer_email: params.customerEmail,
    order_items: params.orderItems.map((item) => ({
      name: item.name,
      price: item.price,
      quantity: item.quantity,
    })),
    signature: signature,
    callback_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://kapankonserlagi.my.id"}/api/webhooks/tripay`,
    return_url: params.returnUrl || `${process.env.NEXT_PUBLIC_APP_URL || "https://kapankonserlagi.my.id"}/admin`,
    expired_time: Math.floor(Date.now() / 1000) + 24 * 3600, // Expire in 24 hours
  };

  try {
    const res = await fetch(`${baseUrl}/transaction/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("Tripay API Request failed:", error);
    return { success: false, message: "Terjadi kesalahan koneksi ke payment gateway Tripay." };
  }
}

/**
 * Mengambil daftar metode pembayaran yang aktif di Tripay
 */
export async function getTripayPaymentChannels() {
  const apiKey = await getSetting("tripay_api_key");
  if (!apiKey) {
    return [];
  }

  const baseUrl = await getTripayBaseUrl();

  try {
    const res = await fetch(`${baseUrl}/merchant/payment-channel`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    const data = await res.json();
    if (data.success && Array.isArray(data.data)) {
      return data.data.filter((item: any) => item.active === true);
    }
    return [];
  } catch (error) {
    console.error("Gagal mengambil payment channels dari Tripay:", error);
    return [];
  }
}

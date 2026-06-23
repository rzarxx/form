"use client";

import React, { useState, useEffect, useTransition } from "react";
import { getCurrentUserAction } from "@/app/actions/auth";
import { getPremiumPricingAndChannelsAction, createPaymentAction, checkTransactionStatusAction } from "@/app/actions/tripay";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface PaymentChannel {
  code: string;
  name: string;
  type: string;
  fee_customer: {
    flat: number;
    percent: number;
  };
}

interface PaymentInstruction {
  title: string;
  steps: string[];
}

export default function PremiumPage() {
  const [user, setUser] = useState<{ email: string; is_premium: boolean; premium_expires_at?: string } | null>(null);
  const [premiumPrice, setPremiumPrice] = useState(50000);
  const [channels, setChannels] = useState<PaymentChannel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string>("");
  
  // Checkout & Pending state
  const [checkoutData, setCheckoutData] = useState<{
    reference: string;
    payCode: string | null;
    qrUrl: string | null;
    qrString: string | null;
    instructions: PaymentInstruction[];
  } | null>(null);

  const [payerName, setPayerName] = useState("");
  const [payerEmail, setPayerEmail] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<string>("unpaid");
  
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Load user & pricing details
  const loadData = async () => {
    try {
      const userRes = await getCurrentUserAction();
      if (userRes.success && userRes.user) {
        setUser({
          email: userRes.user.email,
          is_premium: !!userRes.user.is_premium,
          premium_expires_at: userRes.user.premium_expires_at || undefined,
        });
        setPayerEmail(userRes.user.email);
        setPayerName(userRes.user.email.split("@")[0]);
      }

      const pricingRes = await getPremiumPricingAndChannelsAction();
      if (pricingRes.success && pricingRes.price !== undefined) {
        setPremiumPrice(pricingRes.price);
        setChannels(pricingRes.channels || []);
        if (pricingRes.channels && pricingRes.channels.length > 0) {
          setSelectedChannel(pricingRes.channels[0].code);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Gagal memuat informasi halaman premium.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Poll transaction status if payment is initiated and unpaid
  useEffect(() => {
    if (!checkoutData || paymentStatus === "paid" || paymentStatus === "expired" || paymentStatus === "failed") {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const res = await checkTransactionStatusAction(checkoutData.reference);
        if (res.success && res.status) {
          setPaymentStatus(res.status);
          if (res.status === "paid") {
            toast.success("Pembayaran berhasil! Akun Anda kini aktif sebagai Premium.");
            clearInterval(interval);
            loadData(); // Reload user state
          } else if (res.status === "failed" || res.status === "expired") {
            toast.error("Transaksi kedaluwarsa atau gagal.");
            clearInterval(interval);
          }
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [checkoutData, paymentStatus]);

  const handleUpgrade = () => {
    if (!selectedChannel) {
      toast.error("Silakan pilih metode pembayaran.");
      return;
    }
    if (!payerName.trim() || !payerEmail.trim()) {
      toast.error("Nama dan Email pembayar wajib diisi.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await createPaymentAction({
          type: "subscription",
          method: selectedChannel,
          payerName,
          payerEmail,
        });

        if (res.success && res.reference) {
          toast.success("Invoice pembayaran berhasil dibuat!");
          setCheckoutData({
            reference: res.reference,
            payCode: res.payCode || null,
            qrUrl: res.qrUrl || null,
            qrString: res.qrString || null,
            instructions: (res.instructions || []) as PaymentInstruction[],
          });
          setPaymentStatus("unpaid");
        } else {
          toast.error(res.error || "Gagal membuat tagihan pembayaran.");
        }
      } catch (err) {
        console.error(err);
        toast.error("Terjadi kesalahan sistem saat membuat pembayaran.");
      }
    });
  };

  const handleResetPayment = () => {
    setCheckoutData(null);
    setPaymentStatus("unpaid");
  };

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        <span className="ml-3 text-slate-500 font-medium">Memuat info premium...</span>
      </div>
    );
  }

  // Indonesian Date Formatter
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
          <i className="fa-solid fa-crown text-amber-500"></i> Akun Premium 
        </h1>
        <p className="text-sm text-slate-500">
          Nikmati fitur lengkap tanpa batas untuk mengoptimalkan form online Anda.
        </p>
      </div>

      {user?.is_premium ? (
        <Card className="border border-amber-300 bg-gradient-to-br from-amber-50 to-amber-100/50 shadow-md">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="h-12 w-12 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-600 text-2xl shadow-sm">
                👑
              </div>
              <div>
                <CardTitle className="text-amber-800 text-xl font-bold">Premium Aktif</CardTitle>
                <CardDescription className="text-amber-700/80 text-xs">
                  Anda telah mengaktifkan keanggotaan premium. Terima kasih atas dukungan Anda!
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-white/70 p-4 border border-amber-200/60 shadow-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Status Langganan</span>
                  <span className="text-sm font-semibold text-emerald-600 flex items-center gap-1.5 mt-0.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Aktif (Premium Member)
                  </span>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Masa Berlaku Hingga</span>
                  <span className="text-sm font-semibold text-slate-800 mt-0.5 block">
                    {formatDate(user.premium_expires_at)}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fitur premium yang Anda miliki:</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-slate-700">
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-circle-check text-emerald-500 shrink-0"></i>
                  <span>Formulir aktif tanpa batas</span>
                </div>
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-circle-check text-emerald-500 shrink-0"></i>
                  <span>Tanggapan per formulir tanpa batas</span>
                </div>
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-circle-check text-emerald-500 shrink-0"></i>
                  <span>Keamanan Cloudflare Turnstile anti-bot</span>
                </div>
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-circle-check text-emerald-500 shrink-0"></i>
                  <span>Unggah file tanggapan (upload file)</span>
                </div>
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-circle-check text-emerald-500 shrink-0"></i>
                  <span>Custom URL redirect setelah kirim form</span>
                </div>
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-circle-check text-emerald-500 shrink-0"></i>
                  <span>Integrasi Webhook tanggapan eksternal</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Comparison benefits Card */}
          <div className="lg:col-span-3 space-y-6">
            <Card className="shadow-md border border-slate-200">
              <CardHeader>
                <CardTitle className="text-lg">Bandingkan Fitur</CardTitle>
                <CardDescription>Upgrade untuk menikmati kebebasan penuh mengelola form.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left text-slate-500">
                    <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b">
                      <tr>
                        <th scope="col" className="px-6 py-3">Fitur Utama</th>
                        <th scope="col" className="px-6 py-3 text-center">Free</th>
                        <th scope="col" className="px-6 py-3 text-center text-amber-600 bg-amber-50/50">Premium 👑</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b bg-white">
                        <th scope="row" className="px-6 py-4 font-medium text-slate-900">Maks. Form Aktif</th>
                        <td className="px-6 py-4 text-center">3 Form</td>
                        <td className="px-6 py-4 text-center font-bold text-slate-900 bg-amber-50/30">Tanpa Batas</td>
                      </tr>
                      <tr className="border-b bg-slate-50/30">
                        <th scope="row" className="px-6 py-4 font-medium text-slate-900">Maks. Tanggapan / Form</th>
                        <td className="px-6 py-4 text-center">100 Tanggapan</td>
                        <td className="px-6 py-4 text-center font-bold text-slate-900 bg-amber-50/30">Tanpa Batas</td>
                      </tr>
                      <tr className="border-b bg-white">
                        <th scope="row" className="px-6 py-4 font-medium text-slate-900">Keamanan Cloudflare Turnstile</th>
                        <td className="px-6 py-4 text-center">❌ Tidak</td>
                        <td className="px-6 py-4 text-center text-emerald-600 font-bold bg-amber-50/30">✓ Ya</td>
                      </tr>
                      <tr className="border-b bg-slate-50/30">
                        <th scope="row" className="px-6 py-4 font-medium text-slate-900">Unggah File (Upload File)</th>
                        <td className="px-6 py-4 text-center">❌ Tidak</td>
                        <td className="px-6 py-4 text-center text-emerald-600 font-bold bg-amber-50/30">✓ Ya</td>
                      </tr>
                      <tr className="border-b bg-white">
                        <th scope="row" className="px-6 py-4 font-medium text-slate-900">Custom Redirect URL</th>
                        <td className="px-6 py-4 text-center">❌ Tidak</td>
                        <td className="px-6 py-4 text-center text-emerald-600 font-bold bg-amber-50/30">✓ Ya</td>
                      </tr>
                      <tr className="bg-slate-50/30">
                        <th scope="row" className="px-6 py-4 font-medium text-slate-900">Integrasi Webhook</th>
                        <td className="px-6 py-4 text-center">❌ Tidak</td>
                        <td className="px-6 py-4 text-center text-emerald-600 font-bold bg-amber-50/30">✓ Ya</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payment panel */}
          <div className="lg:col-span-2 space-y-6">
            {!checkoutData ? (
              <Card className="shadow-md border border-slate-200">
                <CardHeader className="bg-slate-50 border-b">
                  <CardTitle className="text-lg">Langganan Sekarang</CardTitle>
                  <CardDescription>Mulai tingkatkan produktivitas Anda.</CardDescription>
                  <div className="mt-2 text-2xl font-extrabold text-slate-950">
                    Rp {premiumPrice.toLocaleString("id-ID")}
                    <span className="text-xs font-normal text-slate-400 ml-1">/ 30 hari</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="payerName">Nama Pembayar</Label>
                    <Input
                      id="payerName"
                      placeholder="Masukkan nama"
                      value={payerName}
                      onChange={(e) => setPayerName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="payerEmail">Email Pembayar</Label>
                    <Input
                      id="payerEmail"
                      type="email"
                      placeholder="Masukkan email"
                      value={payerEmail}
                      onChange={(e) => setPayerEmail(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Metode Pembayaran</Label>
                    {channels.length === 0 ? (
                      <div className="text-xs p-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-md">
                        Tidak ada metode pembayaran aktif. Silakan hubungi administrator.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-2 max-h-[180px] overflow-y-auto pr-1">
                        {channels.map((ch) => (
                          <label
                            key={ch.code}
                            className={`flex items-center space-x-3 rounded-lg border p-2 cursor-pointer transition-all duration-200 ${
                              selectedChannel === ch.code 
                                ? "border-primary bg-primary/5 font-semibold" 
                                : "border-slate-200 hover:bg-slate-50"
                            }`}
                          >
                            <input
                              type="radio"
                              name="payment_method"
                              value={ch.code}
                              checked={selectedChannel === ch.code}
                              onChange={() => setSelectedChannel(ch.code)}
                              className="h-4 w-4 text-primary focus:ring-primary"
                            />
                            <div className="flex-1">
                              <div className="text-xs text-slate-800">{ch.name}</div>
                              <div className="text-[10px] text-slate-400 uppercase">{ch.code}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={handleUpgrade}
                    disabled={isPending || channels.length === 0}
                    className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-semibold rounded-md shadow hover:from-amber-600 hover:to-amber-700 transition duration-200 cursor-pointer"
                  >
                    {isPending ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2"></div>
                        Membuat Transaksi...
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-credit-card mr-2"></i> Bayar Sekarang
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="shadow-md border border-slate-200">
                <CardHeader className="bg-slate-50 border-b flex flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle className="text-lg">Tagihan Pembayaran</CardTitle>
                    <CardDescription>Menunggu pelunasan transaksi...</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" onClick={handleResetPayment} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                    <i className="fa-solid fa-xmark text-lg"></i>
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  {/* Status Indicator */}
                  <div className="rounded-lg p-3 bg-amber-50 border border-amber-200 text-center space-y-1">
                    <div className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">Status Pembayaran</div>
                    <div className="text-sm font-semibold text-amber-800 flex items-center justify-center gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse"></div>
                      MENUNGGU PEMBAYARAN
                    </div>
                    <p className="text-[10px] text-slate-400">Status akan terupdate otomatis secara real-time</p>
                  </div>

                  {/* QR Code / Pay Code */}
                  {checkoutData.qrUrl ? (
                    <div className="flex flex-col items-center justify-center p-3 bg-white border rounded-lg shadow-inner">
                      <p className="text-xs font-semibold text-slate-500 mb-2">Scan QR Code</p>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={checkoutData.qrUrl} alt="QRIS QR Code" className="w-48 h-48" />
                      <p className="text-[10px] text-slate-400 mt-2">Dukung QRIS di seluruh E-Wallet/Mobile Banking</p>
                    </div>
                  ) : checkoutData.payCode ? (
                    <div className="rounded-lg p-4 bg-slate-50 border text-center space-y-1.5">
                      <p className="text-xs font-semibold text-slate-500">Kode Pembayaran / Virtual Account</p>
                      <div className="text-xl font-extrabold text-slate-900 tracking-wider bg-white py-2 px-4 rounded border select-all border-slate-200">
                        {checkoutData.payCode}
                      </div>
                      <p className="text-[10px] text-slate-400">Salin kode di atas untuk melakukan transfer</p>
                    </div>
                  ) : null}

                  {/* Pricing Details */}
                  <div className="flex items-center justify-between text-sm py-2 border-b">
                    <span className="font-semibold text-slate-500">Total Tagihan</span>
                    <span className="font-bold text-slate-900">Rp {premiumPrice.toLocaleString("id-ID")}</span>
                  </div>

                  {/* Instructions */}
                  {checkoutData.instructions && checkoutData.instructions.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-slate-500">Instruksi Pembayaran</Label>
                      <div className="max-h-[220px] overflow-y-auto space-y-2 pr-1">
                        {checkoutData.instructions.map((inst, i) => (
                          <details key={i} className="group border rounded-lg bg-white overflow-hidden" open={i === 0}>
                            <summary className="flex items-center justify-between p-2.5 text-xs font-semibold text-slate-700 bg-slate-50 cursor-pointer select-none">
                              <span>{inst.title}</span>
                              <i className="fa-solid fa-chevron-down text-slate-400 group-open:rotate-185 transition-transform duration-200"></i>
                            </summary>
                            <ol className="p-3 text-xs text-slate-600 list-decimal list-inside space-y-1.5 border-t">
                              {inst.steps.map((step, idx) => (
                                <li key={idx} dangerouslySetInnerHTML={{ __html: step }} className="leading-relaxed"></li>
                              ))}
                            </ol>
                          </details>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={handleResetPayment}
                    variant="outline"
                    className="w-full text-xs"
                  >
                    Kembali & Pilih Metode Lain
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

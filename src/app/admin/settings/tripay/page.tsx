"use client";

import React, { useState, useEffect, useTransition } from "react";
import { getTripaySettingsAction, saveTripaySettingsAction, syncTripayPaymentChannelsAction } from "@/app/actions/tripay";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface PaymentChannel {
  code: string;
  name: string;
  type: string;
  active: boolean;
}

export default function TripaySettingsPage() {
  const [settings, setSettings] = useState({
    tripay_mode: "sandbox",
    tripay_merchant_code: "",
    tripay_api_key: "",
    tripay_private_key: "",
    premium_monthly_price: 50000,
    platform_commission_percent: 5,
  });

  const [availableChannels, setAvailableChannels] = useState<PaymentChannel[]>([]);
  const [enabledChannels, setEnabledChannels] = useState<string[]>([]);
  
  const [showApiKey, setShowApiKey] = useState(false);
  const [showPrivateKey, setShowPrivateKey] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncChannels = async () => {
    setIsSyncing(true);
    try {
      const res = await syncTripayPaymentChannelsAction(settings.tripay_api_key, settings.tripay_mode);
      if (res.success && res.data) {
        setAvailableChannels(res.data);
        toast.success(`Berhasil menyinkronkan ${res.data.length} metode pembayaran aktif dari Tripay!`);
      } else {
        toast.error(res.error || "Gagal menyinkronkan metode pembayaran.");
      }
    } catch (err) {
      console.error("Sync error:", err);
      toast.error("Terjadi kesalahan sistem saat menyinkronkan.");
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await getTripaySettingsAction();
        if (res.success && res.data) {
          setSettings({
            tripay_mode: res.data.tripay_mode,
            tripay_merchant_code: res.data.tripay_merchant_code,
            tripay_api_key: res.data.tripay_api_key,
            tripay_private_key: res.data.tripay_private_key,
            premium_monthly_price: res.data.premium_monthly_price,
            platform_commission_percent: res.data.platform_commission_percent,
          });
          setEnabledChannels(res.data.enabled_channels || []);
          setAvailableChannels(res.data.available_channels || []);
        } else {
          toast.error(res.error || "Gagal memuat setelan Tripay.");
        }
      } catch (err) {
        console.error("Error loading settings:", err);
        toast.error("Terjadi kesalahan saat memuat data setelan Tripay.");
      } finally {
        setIsLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setSettings((prev) => ({
      ...prev,
      [name]: name === "premium_monthly_price" || name === "platform_commission_percent"
        ? parseInt(value, 10) || 0 
        : value,
    }));
  };

  const handleChannelToggle = (code: string) => {
    setEnabledChannels((prev) => {
      if (prev.includes(code)) {
        return prev.filter((c) => c !== code);
      } else {
        return [...prev, code];
      }
    });
  };

  const handleSelectAllChannels = () => {
    if (enabledChannels.length === availableChannels.length) {
      setEnabledChannels([]);
    } else {
      setEnabledChannels(availableChannels.map((c) => c.code));
    }
  };

  const handleSave = () => {
    startTransition(async () => {
      try {
        const res = await saveTripaySettingsAction({
          ...settings,
          tripay_payment_channels: enabledChannels,
        });
        if (res.success) {
          toast.success("Setelan Tripay berhasil disimpan!");
          
          // Re-fetch to get updated masked keys
          const updated = await getTripaySettingsAction();
          if (updated.success && updated.data) {
            setSettings({
              tripay_mode: updated.data.tripay_mode,
              tripay_merchant_code: updated.data.tripay_merchant_code,
              tripay_api_key: updated.data.tripay_api_key,
              tripay_private_key: updated.data.tripay_private_key,
              premium_monthly_price: updated.data.premium_monthly_price,
              platform_commission_percent: updated.data.platform_commission_percent,
            });
            setEnabledChannels(updated.data.enabled_channels || []);
          }
        } else {
          toast.error(res.error || "Gagal menyimpan setelan.");
        }
      } catch (err) {
        console.error("Error saving settings:", err);
        toast.error("Terjadi kesalahan saat menyimpan data.");
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        <span className="ml-3 text-slate-500 font-medium">Memuat pengaturan Tripay...</span>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
          <i className="fa-solid fa-credit-card text-primary"></i> Setelan Payment Gateway Tripay
        </h1>
        <p className="text-sm text-slate-500">
          Konfigurasikan integrasi Tripay Anda untuk langganan premium dan formulir berbayar.
        </p>
      </div>

      <div className="grid gap-6">
        <Card className="shadow-md border border-slate-200">
          <CardHeader>
            <CardTitle>Kredensial API Tripay</CardTitle>
            <CardDescription>
              Silakan masukkan kredensial API dari merchant Tripay Anda (Sandbox atau Production).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tripay_mode">Mode API</Label>
                <select
                  id="tripay_mode"
                  name="tripay_mode"
                  value={settings.tripay_mode}
                  onChange={handleChange}
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="sandbox">Sandbox (Pengujian)</option>
                  <option value="production">Production (Live)</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tripay_merchant_code">Merchant Code</Label>
                <Input
                  id="tripay_merchant_code"
                  name="tripay_merchant_code"
                  placeholder="Contoh: T12345"
                  value={settings.tripay_merchant_code}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tripay_api_key">API Key</Label>
              <div className="relative">
                <Input
                  id="tripay_api_key"
                  name="tripay_api_key"
                  type={showApiKey ? "text" : "password"}
                  placeholder="Masukkan Tripay API Key"
                  value={settings.tripay_api_key}
                  onChange={handleChange}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <i className={`fa-solid ${showApiKey ? "fa-eye-slash" : "fa-eye"}`}></i>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tripay_private_key">Private Key</Label>
              <div className="relative">
                <Input
                  id="tripay_private_key"
                  name="tripay_private_key"
                  type={showPrivateKey ? "text" : "password"}
                  placeholder="Masukkan Tripay Private Key"
                  value={settings.tripay_private_key}
                  onChange={handleChange}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPrivateKey(!showPrivateKey)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <i className={`fa-solid ${showPrivateKey ? "fa-eye-slash" : "fa-eye"}`}></i>
                </button>
              </div>
              <p className="text-[11px] text-amber-600 font-medium">
                <i className="fa-solid fa-triangle-exclamation"></i> Digunakan untuk memverifikasi validitas callback webhook secara secure (HMAC-SHA256).
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md border border-slate-200">
          <CardHeader>
            <CardTitle>Monetisasi & Biaya Platform</CardTitle>
            <CardDescription>
              Konfigurasikan harga paket premium dan persentase potongan komisi transaksi.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="premium_monthly_price">Harga Premium Per Bulan (Rupiah)</Label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 font-semibold text-sm">
                  Rp
                </span>
                <Input
                  id="premium_monthly_price"
                  name="premium_monthly_price"
                  type="number"
                  placeholder="50000"
                  value={settings.premium_monthly_price}
                  onChange={handleChange}
                  className="pl-9"
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Default: Rp 50.000,-
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="platform_commission_percent">Komisi Potongan Platform (%)</Label>
              <div className="relative">
                <Input
                  id="platform_commission_percent"
                  name="platform_commission_percent"
                  type="number"
                  min="0"
                  max="100"
                  placeholder="5"
                  value={settings.platform_commission_percent}
                  onChange={handleChange}
                  className="pr-9"
                />
                <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 font-semibold text-sm">
                  %
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Akan dipotong otomatis pada setiap transaksi form berbayar Creator. Default: 5%
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md border border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle>Metode Pembayaran Tripay</CardTitle>
              <CardDescription>
                Pilih metode pembayaran yang ingin Anda aktifkan untuk transaksi di sistem ini.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSyncChannels}
                disabled={isSyncing}
                className="text-xs border-indigo-200 text-indigo-600 hover:bg-indigo-50 font-semibold cursor-pointer"
              >
                {isSyncing ? (
                  <>
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent mr-1"></div>
                    Menyinkronkan...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-rotate mr-1"></i> Sinkronisasi
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAllChannels}
                className="text-xs cursor-pointer"
              >
                {enabledChannels.length === availableChannels.length ? "Batal Semua" : "Pilih Semua"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {availableChannels.length === 0 ? (
              <div className="rounded-lg bg-slate-50 p-6 border border-dashed border-slate-400 text-center text-slate-500">
                <i className="fa-solid fa-circle-info text-lg mb-2 block"></i>
                Tidak ada metode pembayaran yang ditemukan atau kredensial API belum diatur/valid.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                {availableChannels.map((channel) => {
                  const isChecked = enabledChannels.includes(channel.code);
                  return (
                    <div
                      key={channel.code}
                      onClick={() => handleChannelToggle(channel.code)}
                      className={`flex items-center space-x-3 rounded-lg border p-3 cursor-pointer select-none transition-all duration-200 hover:border-primary/50 hover:bg-slate-50 ${
                        isChecked 
                          ? "border-primary bg-primary/5 shadow-sm" 
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // handled by div click
                        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate">
                          {channel.name}
                        </p>
                        <span className="text-[10px] text-slate-400 font-medium uppercase">
                          {channel.code} • {channel.type}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-t pt-4">
          <p className="text-xs text-slate-400">
            * Pastikan URL Callback Webhook di Dasbor Tripay Anda telah diarahkan ke: <br />
            <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-700 select-all">
              {process.env.NEXT_PUBLIC_APP_URL || "https://kapankonserlagi.my.id"}/api/webhooks/tripay
            </code>
          </p>

          <Button
            onClick={handleSave}
            disabled={isPending}
            className="w-full md:w-auto px-6 py-2 bg-primary text-white hover:bg-primary/95 transition-all duration-200 cursor-pointer font-semibold"
          >
            {isPending ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2"></div>
                Menyimpan...
              </>
            ) : (
              "Simpan Konfigurasi"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

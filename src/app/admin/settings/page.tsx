"use client";

import React, { useState, useEffect, useTransition } from "react";
import { getGlobalSettingsAction, saveSettingsAction } from "@/app/actions/settings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    ai_provider: "openrouter",
    openrouter_api_key: "",
    openrouter_model: "google/gemini-2.5-flash",
    gemini_api_key: "",
    gemini_model: "gemini-2.5-flash",
    openai_api_key: "",
    openai_model: "gpt-4o-mini",
    cloudflare_turnstile_site_key: "",
    cloudflare_turnstile_secret_key: "",
    resend_api_key: "",
  });

  const [meta, setMeta] = useState({
    has_db_openrouter_key: false,
    has_env_openrouter_key: false,
    has_db_gemini_key: false,
    has_env_gemini_key: false,
    has_db_openai_key: false,
    has_env_openai_key: false,
    has_db_turnstile_secret: false,
    has_env_turnstile_secret: false,
    has_db_resend_key: false,
    has_env_resend_key: false,
  });

  const [showOpenRouter, setShowOpenRouter] = useState(false);
  const [showGemini, setShowGemini] = useState(false);
  const [showOpenAI, setShowOpenAI] = useState(false);
  const [showTurnstileSecret, setShowTurnstileSecret] = useState(false);
  const [showResend, setShowResend] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await getGlobalSettingsAction();
        if (res.success && res.data) {
          setSettings({
            ai_provider: res.data.ai_provider || "openrouter",
            openrouter_api_key: res.data.openrouter_api_key || "",
            openrouter_model: res.data.openrouter_model || "google/gemini-2.5-flash",
            gemini_api_key: res.data.gemini_api_key || "",
            gemini_model: res.data.gemini_model || "gemini-2.5-flash",
            openai_api_key: res.data.openai_api_key || "",
            openai_model: res.data.openai_model || "gpt-4o-mini",
            cloudflare_turnstile_site_key: res.data.cloudflare_turnstile_site_key || "",
            cloudflare_turnstile_secret_key: res.data.cloudflare_turnstile_secret_key || "",
            resend_api_key: res.data.resend_api_key || "",
          });
          setMeta({
            has_db_openrouter_key: !!res.data.has_db_openrouter_key,
            has_env_openrouter_key: !!res.data.has_env_openrouter_key,
            has_db_gemini_key: !!res.data.has_db_gemini_key,
            has_env_gemini_key: !!res.data.has_env_gemini_key,
            has_db_openai_key: !!res.data.has_db_openai_key,
            has_env_openai_key: !!res.data.has_env_openai_key,
            has_db_turnstile_secret: !!res.data.has_db_turnstile_secret,
            has_env_turnstile_secret: !!res.data.has_env_turnstile_secret,
            has_db_resend_key: !!res.data.has_db_resend_key,
            has_env_resend_key: !!res.data.has_env_resend_key,
          });
        } else {
          toast.error(res.error || "Gagal memuat setelan global.");
        }
      } catch (err) {
        console.error("Error loading settings:", err);
        toast.error("Terjadi kesalahan saat memuat data setelan.");
      } finally {
        setIsLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setSettings((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    startTransition(async () => {
      try {
        const res = await saveSettingsAction(settings);
        if (res.success) {
          toast.success("Setelan global berhasil disimpan!");
          // Muat ulang untuk mendapatkan nilai sensor termasking terupdate
          const updated = await getGlobalSettingsAction();
          if (updated.success && updated.data) {
            setSettings({
              ai_provider: updated.data.ai_provider || "openrouter",
              openrouter_api_key: updated.data.openrouter_api_key || "",
              openrouter_model: updated.data.openrouter_model || "google/gemini-2.5-flash",
              gemini_api_key: updated.data.gemini_api_key || "",
              gemini_model: updated.data.gemini_model || "gemini-2.5-flash",
              openai_api_key: updated.data.openai_api_key || "",
              openai_model: updated.data.openai_model || "gpt-4o-mini",
              cloudflare_turnstile_site_key: updated.data.cloudflare_turnstile_site_key || "",
              cloudflare_turnstile_secret_key: updated.data.cloudflare_turnstile_secret_key || "",
              resend_api_key: updated.data.resend_api_key || "",
            });
            setMeta({
              has_db_openrouter_key: !!updated.data.has_db_openrouter_key,
              has_env_openrouter_key: !!updated.data.has_env_openrouter_key,
              has_db_gemini_key: !!updated.data.has_db_gemini_key,
              has_env_gemini_key: !!updated.data.has_env_gemini_key,
              has_db_openai_key: !!updated.data.has_db_openai_key,
              has_env_openai_key: !!updated.data.has_env_openai_key,
              has_db_turnstile_secret: !!updated.data.has_db_turnstile_secret,
              has_env_turnstile_secret: !!updated.data.has_env_turnstile_secret,
              has_db_resend_key: !!updated.data.has_db_resend_key,
              has_env_resend_key: !!updated.data.has_env_resend_key,
            });
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
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-300 border-t-indigo-600"></div>
          <p className="text-sm font-semibold text-slate-500">Memuat setelan global...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-6 2xl:p-10 space-y-6">
      {/* Judul Halaman */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <i className="fa-solid fa-gears text-indigo-600"></i> Setelan Global Website
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Kelola API Key, AI engine, Captcha, dan integrasi email pihak ketiga secara terpusat di database.
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Global AI Assistant Settings Card */}
        <Card className="border-slate-200/80 shadow-sm bg-white">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
            <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
              <i className="fa-solid fa-robot text-indigo-500"></i> Integrasi AI Global (Fallback System)
            </CardTitle>
            <CardDescription className="text-xs">
              Digunakan untuk pembuat formulir AI global. Jika user tidak menyediakan API key kustom, maka asisten akan menggunakan konfigurasi di bawah ini (Khusus Admin/Super Admin).
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="ai_provider" className="text-sm font-bold text-slate-700">
                Penyedia AI Global Default
              </Label>
              <Select
                value={settings.ai_provider}
                onValueChange={(val) => handleSelectChange("ai_provider", val || "openrouter")}
                disabled={isPending}
              >
                <SelectTrigger id="ai_provider" className="h-11 border-slate-300 rounded-xl">
                  <SelectValue placeholder="Pilih AI Provider Global" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openrouter">OpenRouter API</SelectItem>
                  <SelectItem value="gemini">Google Gemini API</SelectItem>
                  <SelectItem value="openai">OpenAI API</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="border-t border-slate-100 pt-6 space-y-4">
              {settings.ai_provider === "openrouter" && (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="openrouter_api_key" className="text-sm font-bold text-slate-700">
                        OpenRouter API Key
                      </Label>
                      {meta.has_db_openrouter_key ? (
                        <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full">
                          <i className="fa-solid fa-database mr-1"></i> Tersimpan di Database
                        </span>
                      ) : meta.has_env_openrouter_key ? (
                        <span className="text-[10px] bg-slate-200 text-slate-600 font-bold px-2 py-0.5 rounded-full">
                          <i className="fa-solid fa-server mr-1"></i> Terbaca dari .env
                        </span>
                      ) : null}
                    </div>
                    <div className="relative">
                      <Input
                        id="openrouter_api_key"
                        name="openrouter_api_key"
                        type={showOpenRouter ? "text" : "password"}
                        value={settings.openrouter_api_key}
                        onChange={handleChange}
                        placeholder={meta.has_env_openrouter_key && !settings.openrouter_api_key ? "•••••••• (Menggunakan kunci .env)" : "sk-or-v1-..."}
                        className="pr-10 border-slate-300 hover:border-slate-400 focus:border-indigo-500 h-11 rounded-xl"
                      />
                      <button
                        type="button"
                        onClick={() => setShowOpenRouter(!showOpenRouter)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <i className={`fa-solid ${showOpenRouter ? "fa-eye-slash" : "fa-eye"}`}></i>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="openrouter_model" className="text-sm font-bold text-slate-700">
                      AI Model Default
                    </Label>
                    <Input
                      id="openrouter_model"
                      name="openrouter_model"
                      type="text"
                      value={settings.openrouter_model}
                      onChange={handleChange}
                      placeholder="google/gemini-2.5-flash"
                      className="border-slate-300 hover:border-slate-400 focus:border-indigo-500 h-11 rounded-xl"
                    />
                  </div>
                </>
              )}

              {settings.ai_provider === "gemini" && (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="gemini_api_key" className="text-sm font-bold text-slate-700">
                        Google Gemini API Key
                      </Label>
                      {meta.has_db_gemini_key ? (
                        <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full">
                          <i className="fa-solid fa-database mr-1"></i> Tersimpan di Database
                        </span>
                      ) : meta.has_env_gemini_key ? (
                        <span className="text-[10px] bg-slate-200 text-slate-600 font-bold px-2 py-0.5 rounded-full">
                          <i className="fa-solid fa-server mr-1"></i> Terbaca dari .env
                        </span>
                      ) : null}
                    </div>
                    <div className="relative">
                      <Input
                        id="gemini_api_key"
                        name="gemini_api_key"
                        type={showGemini ? "text" : "password"}
                        value={settings.gemini_api_key}
                        onChange={handleChange}
                        placeholder={meta.has_env_gemini_key && !settings.gemini_api_key ? "•••••••• (Menggunakan kunci .env)" : "AIzaSy..."}
                        className="pr-10 border-slate-300 hover:border-slate-400 focus:border-indigo-500 h-11 rounded-xl"
                      />
                      <button
                        type="button"
                        onClick={() => setShowGemini(!showGemini)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <i className={`fa-solid ${showGemini ? "fa-eye-slash" : "fa-eye"}`}></i>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gemini_model" className="text-sm font-bold text-slate-700">
                      Gemini Model Default
                    </Label>
                    <Select
                      value={settings.gemini_model}
                      onValueChange={(val) => handleSelectChange("gemini_model", val || "gemini-2.5-flash")}
                      disabled={isPending}
                    >
                      <SelectTrigger id="gemini_model" className="h-11 border-slate-300 rounded-xl">
                        <SelectValue placeholder="Pilih model Gemini" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gemini-2.5-flash">gemini-2.5-flash</SelectItem>
                        <SelectItem value="gemini-2.5-pro">gemini-2.5-pro</SelectItem>
                        <SelectItem value="gemini-1.5-flash">gemini-1.5-flash</SelectItem>
                        <SelectItem value="gemini-1.5-pro">gemini-1.5-pro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {settings.ai_provider === "openai" && (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="openai_api_key" className="text-sm font-bold text-slate-700">
                        OpenAI API Key
                      </Label>
                      {meta.has_db_openai_key ? (
                        <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full">
                          <i className="fa-solid fa-database mr-1"></i> Tersimpan di Database
                        </span>
                      ) : meta.has_env_openai_key ? (
                        <span className="text-[10px] bg-slate-200 text-slate-600 font-bold px-2 py-0.5 rounded-full">
                          <i className="fa-solid fa-server mr-1"></i> Terbaca dari .env
                        </span>
                      ) : null}
                    </div>
                    <div className="relative">
                      <Input
                        id="openai_api_key"
                        name="openai_api_key"
                        type={showOpenAI ? "text" : "password"}
                        value={settings.openai_api_key}
                        onChange={handleChange}
                        placeholder={meta.has_env_openai_key && !settings.openai_api_key ? "•••••••• (Menggunakan kunci .env)" : "sk-proj-..."}
                        className="pr-10 border-slate-300 hover:border-slate-400 focus:border-indigo-500 h-11 rounded-xl"
                      />
                      <button
                        type="button"
                        onClick={() => setShowOpenAI(!showOpenAI)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <i className={`fa-solid ${showOpenAI ? "fa-eye-slash" : "fa-eye"}`}></i>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="openai_model" className="text-sm font-bold text-slate-700">
                      OpenAI Model Default
                    </Label>
                    <Select
                      value={settings.openai_model}
                      onValueChange={(val) => handleSelectChange("openai_model", val || "gpt-4o-mini")}
                      disabled={isPending}
                    >
                      <SelectTrigger id="openai_model" className="h-11 border-slate-300 rounded-xl">
                        <SelectValue placeholder="Pilih model OpenAI" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gpt-4o-mini">gpt-4o-mini</SelectItem>
                        <SelectItem value="gpt-4o">gpt-4o</SelectItem>
                        <SelectItem value="gpt-3.5-turbo">gpt-3.5-turbo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Cloudflare Turnstile Settings Card */}
        <Card className="border-slate-200/80 shadow-sm bg-white">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
            <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
              <i className="fa-solid fa-shield-halved text-emerald-500"></i> Cloudflare Turnstile (Anti-Bot)
            </CardTitle>
            <CardDescription className="text-xs">
              Mencegah spam tanggapan menggunakan perlindungan captcha ramah pengguna dari Cloudflare.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cloudflare_turnstile_site_key" className="text-sm font-bold text-slate-700">
                  Site Key (Kunci Situs)
                </Label>
                <Input
                  id="cloudflare_turnstile_site_key"
                  name="cloudflare_turnstile_site_key"
                  type="text"
                  value={settings.cloudflare_turnstile_site_key}
                  onChange={handleChange}
                  placeholder="0x4AAAAAAA..."
                  className="border-slate-300 hover:border-slate-400 focus:border-indigo-500 h-11 rounded-xl"
                />
                <p className="text-[11px] text-slate-500">
                  Site Key publik Turnstile untuk merender widget di halaman form.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="cloudflare_turnstile_secret_key" className="text-sm font-bold text-slate-700">
                    Secret Key (Kunci Rahasia)
                  </Label>
                  {meta.has_db_turnstile_secret ? (
                    <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full">
                      <i className="fa-solid fa-database mr-1"></i> Tersimpan
                    </span>
                  ) : meta.has_env_turnstile_secret ? (
                    <span className="text-[10px] bg-slate-200 text-slate-600 font-bold px-2 py-0.5 rounded-full">
                      <i className="fa-solid fa-server mr-1"></i> Terbaca (.env)
                    </span>
                  ) : null}
                </div>
                <div className="relative">
                  <Input
                    id="cloudflare_turnstile_secret_key"
                    name="cloudflare_turnstile_secret_key"
                    type={showTurnstileSecret ? "text" : "password"}
                    value={settings.cloudflare_turnstile_secret_key}
                    onChange={handleChange}
                    placeholder={meta.has_env_turnstile_secret && !settings.cloudflare_turnstile_secret_key ? "•••••••• (Menggunakan kunci .env)" : "0x4AAAAAAA..."}
                    className="pr-10 border-slate-300 hover:border-slate-400 focus:border-indigo-500 h-11 rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => setShowTurnstileSecret(!showTurnstileSecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <i className={`fa-solid ${showTurnstileSecret ? "fa-eye-slash" : "fa-eye"}`}></i>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  Secret Key rahasia untuk verifikasi validitas token captcha di server.
                </p>
              </div>
            </div>

            <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 leading-relaxed flex gap-2.5">
              <i className="fa-solid fa-triangle-exclamation text-amber-500 shrink-0 mt-0.5 text-sm"></i>
              <span>
                <strong>Perhatian:</strong> Kunci bawaan <code>0x4...</code> hanya berlaku di <code>localhost</code>. Jika form diakses lewat domain produksi, Anda <strong>wajib</strong> mengisi Site Key dan Secret Key asli dari dashboard Cloudflare Turnstile.
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Resend Email Notifications Card */}
        <Card className="border-slate-200/80 shadow-sm bg-white">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
            <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
              <i className="fa-solid fa-envelope text-blue-500"></i> Resend Email Notifications
            </CardTitle>
            <CardDescription className="text-xs">
              Digunakan untuk mengirim pemberitahuan email otomatis setiap kali form berhasil diisi responden.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="resend_api_key" className="text-sm font-bold text-slate-700">
                  Resend API Key
                </Label>
                {meta.has_db_resend_key ? (
                  <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full">
                    <i className="fa-solid fa-database mr-1"></i> Tersimpan di Database
                  </span>
                ) : meta.has_env_resend_key ? (
                  <span className="text-[10px] bg-slate-200 text-slate-600 font-bold px-2 py-0.5 rounded-full">
                    <i className="fa-solid fa-server mr-1"></i> Terbaca dari .env
                  </span>
                ) : null}
              </div>
              <div className="relative">
                <Input
                  id="resend_api_key"
                  name="resend_api_key"
                  type={showResend ? "text" : "password"}
                  value={settings.resend_api_key}
                  onChange={handleChange}
                  placeholder={meta.has_env_resend_key && !settings.resend_api_key ? "•••••••• (Menggunakan kunci .env)" : "re_..."}
                  className="pr-10 border-slate-300 hover:border-slate-400 focus:border-indigo-500 h-11 rounded-xl"
                />
                <button
                  type="button"
                  onClick={() => setShowResend(!showResend)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <i className={`fa-solid ${showResend ? "fa-eye-slash" : "fa-eye"}`}></i>
                </button>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Mendukung verifikasi email instan. Ambil API Key dari dashboard <strong>Resend.com</strong>.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer Simpan */}
      <div className="flex justify-end pt-4 border-t border-slate-200">
        <Button
          onClick={handleSave}
          disabled={isPending}
          className="bg-primary hover:bg-primary/95 text-white font-bold px-6 py-2.5 shadow-md flex items-center gap-2 cursor-pointer transition-all duration-200 rounded-xl"
        >
          {isPending ? (
            <>
              <i className="fa-solid fa-spinner animate-spin"></i> Menyimpan...
            </>
          ) : (
            <>
              <i className="fa-solid fa-floppy-disk"></i> Simpan Setelan Global
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

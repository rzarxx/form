"use client";

import React, { useState, useEffect, useTransition } from "react";
import { getUserSettingsAction, saveUserSettingsAction } from "@/app/actions/user";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function UserProfilePage() {
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("google/gemini-2.5-flash");
  const [isLegacyAdmin, setIsLegacyAdmin] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await getUserSettingsAction();
        if (res.success && res.data) {
          setApiKey(res.data.openrouter_api_key || "");
          setModel(res.data.openrouter_model || "google/gemini-2.5-flash");
          setIsLegacyAdmin(res.data.is_legacy_admin || false);
        } else {
          toast.error(res.error || "Gagal memuat profil.");
        }
      } catch (err) {
        console.error("Error loading user profile settings:", err);
        toast.error("Terjadi kesalahan sistem saat memuat setelan profil.");
      } finally {
        setIsLoading(false);
      }
    }
    loadProfile();
  }, []);

  const handleSave = () => {
    startTransition(async () => {
      try {
        const res = await saveUserSettingsAction(apiKey, model);
        if (res.success) {
          toast.success("Pengaturan profil berhasil disimpan!");
          // Reload settings to get updated masked keys
          const updated = await getUserSettingsAction();
          if (updated.success && updated.data) {
            setApiKey(updated.data.openrouter_api_key || "");
            setModel(updated.data.openrouter_model || "google/gemini-2.5-flash");
          }
        } else {
          toast.error(res.error || "Gagal menyimpan profil.");
        }
      } catch (err) {
        console.error("Error saving user settings:", err);
        toast.error("Terjadi kesalahan sistem saat menyimpan setelan.");
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-350 border-t-indigo-650"></div>
          <p className="text-sm font-semibold text-slate-500">Memuat profil Anda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-4 md:p-6 2xl:p-10 space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
          <i className="fa-solid fa-user-gear text-indigo-600"></i> Setelan AI Akun
        </h1>
        <p className="text-sm text-slate-500 font-medium mt-1">
          Kelola kunci API OpenRouter personal Anda untuk asisten AI pembuat form.
        </p>
      </div>

      <Card className="border-slate-200/80 shadow-sm bg-white rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
          <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
            <i className="fa-solid fa-key text-indigo-500"></i> Kunci API AI Kustom
          </CardTitle>
          <CardDescription className="text-xs">
            Kunci API ini hanya akan berlaku khusus pada formulir yang dibuat oleh akun Anda.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          {isLegacyAdmin ? (
            <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 leading-relaxed flex gap-3">
              <i className="fa-solid fa-circle-exclamation text-amber-500 shrink-0 mt-0.5 text-base"></i>
              <span>
                <strong>Info Sesi Admin:</strong> Anda masuk sebagai <strong>Super Admin Utama</strong> menggunakan kredensial <code>ADMIN_PASSWORD</code> dari file konfigurasi server. Kunci API AI global dan model Anda dapat langsung dikonfigurasi melalui menu <strong>Setelan Global</strong> di sidebar.
              </span>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="openrouter-api-key" className="text-sm font-bold text-slate-700">
              OpenRouter API Key
            </Label>
            <div className="relative">
              <Input
                id="openrouter-api-key"
                type={showApiKey ? "text" : "password"}
                placeholder="sk-or-v1-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                disabled={isLegacyAdmin || isPending}
                className="pr-10 border-slate-250 hover:border-slate-350 focus:border-indigo-500 h-11 rounded-xl"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                disabled={isLegacyAdmin}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 disabled:opacity-50 cursor-pointer"
              >
                <i className={`fa-solid ${showApiKey ? "fa-eye-slash" : "fa-eye"}`}></i>
              </button>
            </div>
            <p className="text-[11px] text-slate-450 leading-relaxed">
              Kunci API Anda akan disamarkan dan disimpan secara terenkripsi/aman di database.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="openrouter-model" className="text-sm font-bold text-slate-700">
              AI Model Default
            </Label>
            <Input
              id="openrouter-model"
              type="text"
              placeholder="google/gemini-2.5-flash"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              disabled={isLegacyAdmin || isPending}
              className="border-slate-250 hover:border-slate-350 focus:border-indigo-500 h-11 rounded-xl"
            />
            <p className="text-[11px] text-slate-450 leading-relaxed">
              ID Model OpenRouter yang ingin Anda gunakan (contoh: <code>google/gemini-2.5-flash</code> atau <code>meta-llama/llama-3.1-8b-instruct:free</code>).
            </p>
          </div>
        </CardContent>
      </Card>

      {!isLegacyAdmin ? (
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={isPending}
            className="bg-primary hover:bg-primary/95 text-white font-bold px-6 py-2.5 shadow-md flex items-center gap-2 transition-all duration-200 rounded-xl cursor-pointer"
          >
            {isPending ? (
              <>
                <i className="fa-solid fa-circle-notch fa-spin mr-1"></i> Menyimpan...
              </>
            ) : (
              <>
                <i className="fa-solid fa-floppy-disk"></i> Simpan Setelan AI
              </>
            )}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

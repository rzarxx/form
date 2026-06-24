"use client";

import React, { useState, useEffect, useTransition } from "react";
import { getUserSettingsAction, saveUserSettingsAction } from "@/app/actions/user";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/toast";

export default function UserProfilePage() {
  const [aiProvider, setAiProvider] = useState("openrouter");
  const [openrouterApiKey, setOpenrouterApiKey] = useState("");
  const [openrouterModel, setOpenrouterModel] = useState("google/gemini-2.5-flash");
  
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [geminiModel, setGeminiModel] = useState("gemini-2.5-flash");
  
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [openaiModel, setOpenaiModel] = useState("gpt-4o-mini");

  const [isLegacyAdmin, setIsLegacyAdmin] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await getUserSettingsAction();
        if (res.success && res.data) {
          setAiProvider(res.data.ai_provider || "openrouter");
          setOpenrouterApiKey(res.data.openrouter_api_key || "");
          setOpenrouterModel(res.data.openrouter_model || "google/gemini-2.5-flash");
          setGeminiApiKey(res.data.gemini_api_key || "");
          setGeminiModel(res.data.gemini_model || "gemini-2.5-flash");
          setOpenaiApiKey(res.data.openai_api_key || "");
          setOpenaiModel(res.data.openai_model || "gpt-4o-mini");
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
        const res = await saveUserSettingsAction({
          ai_provider: aiProvider,
          openrouter_api_key: openrouterApiKey,
          openrouter_model: openrouterModel,
          gemini_api_key: geminiApiKey,
          gemini_model: geminiModel,
          openai_api_key: openaiApiKey,
          openai_model: openaiModel
        });
        if (res.success) {
          toast.success("Pengaturan profil berhasil disimpan!");
          // Reload settings to get updated masked keys
          const updated = await getUserSettingsAction();
          if (updated.success && updated.data) {
            setAiProvider(updated.data.ai_provider || "openrouter");
            setOpenrouterApiKey(updated.data.openrouter_api_key || "");
            setOpenrouterModel(updated.data.openrouter_model || "google/gemini-2.5-flash");
            setGeminiApiKey(updated.data.gemini_api_key || "");
            setGeminiModel(updated.data.gemini_model || "gemini-2.5-flash");
            setOpenaiApiKey(updated.data.openai_api_key || "");
            setOpenaiModel(updated.data.openai_model || "gpt-4o-mini");
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
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-400 border-t-indigo-600"></div>
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
          Kelola kunci API dan penyedia AI kustom personal Anda. Pengaturan ini tersimpan di database dan aman diakses dari browser mana pun.
        </p>
      </div>

      <Card className="border-slate-200/80 shadow-sm bg-white rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
          <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
            <i className="fa-solid fa-robot text-indigo-500"></i> Penyedia AI Utama (Active Provider)
          </CardTitle>
          <CardDescription className="text-xs">
            Pilih AI Engine yang akan memproses rancangan formulir otomatis Anda.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {isLegacyAdmin ? (
            <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 leading-relaxed flex gap-3">
              <i className="fa-solid fa-circle-exclamation text-amber-500 shrink-0 mt-0.5 text-base"></i>
              <span>
                <strong>Info Sesi Admin:</strong> Anda masuk sebagai <strong>Super Admin Utama</strong>. Kunci API AI global dan model Anda dapat dikonfigurasi melalui menu <strong>Setelan Global</strong> di sidebar.
              </span>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="ai-provider" className="text-sm font-bold text-slate-700">
              Pilih AI Provider Aktif
            </Label>
            <Select
              value={aiProvider}
              onValueChange={(val) => setAiProvider(val || "openrouter")}
              disabled={isLegacyAdmin || isPending}
            >
              <SelectTrigger id="ai-provider" className="h-11 border-slate-300 rounded-xl">
                <SelectValue placeholder="Pilih AI Provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openrouter">OpenRouter API</SelectItem>
                <SelectItem value="gemini">Google Gemini API</SelectItem>
                <SelectItem value="openai">OpenAI API</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="border-t border-slate-100 pt-6 space-y-4">
            {aiProvider === "openrouter" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="openrouter-api-key" className="text-sm font-bold text-slate-700">
                    OpenRouter API Key
                  </Label>
                  <div className="relative">
                    <Input
                      id="openrouter-api-key"
                      type={showApiKey ? "text" : "password"}
                      placeholder="sk-or-v1-..."
                      value={openrouterApiKey}
                      onChange={(e) => setOpenrouterApiKey(e.target.value)}
                      disabled={isLegacyAdmin || isPending}
                      className="pr-10 border-slate-300 hover:border-slate-400 focus:border-indigo-500 h-11 rounded-xl"
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
                  <p className="text-[11px] text-slate-500">
                    Dapatkan API Key kustom Anda langsung dari dashboard <strong>OpenRouter.ai</strong>.
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
                    value={openrouterModel}
                    onChange={(e) => setOpenrouterModel(e.target.value)}
                    disabled={isLegacyAdmin || isPending}
                    className="border-slate-300 hover:border-slate-400 focus:border-indigo-500 h-11 rounded-xl"
                  />
                  <p className="text-[11px] text-slate-500">
                    ID model OpenRouter yang digunakan (contoh: <code>google/gemini-2.5-flash</code>, <code>meta-llama/llama-3.3-70b-instruct</code>).
                  </p>
                </div>
              </>
            )}

            {aiProvider === "gemini" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="gemini-api-key" className="text-sm font-bold text-slate-700">
                    Google Gemini API Key
                  </Label>
                  <div className="relative">
                    <Input
                      id="gemini-api-key"
                      type={showApiKey ? "text" : "password"}
                      placeholder="AIzaSy..."
                      value={geminiApiKey}
                      onChange={(e) => setGeminiApiKey(e.target.value)}
                      disabled={isLegacyAdmin || isPending}
                      className="pr-10 border-slate-300 hover:border-slate-400 focus:border-indigo-500 h-11 rounded-xl"
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
                  <p className="text-[11px] text-slate-500">
                    Dapatkan Gemini API Key Anda dari Google AI Studio (<strong>aistudio.google.com</strong>).
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gemini-model" className="text-sm font-bold text-slate-700">
                    Gemini Model
                  </Label>
                  <Select
                    value={geminiModel}
                    onValueChange={(val) => setGeminiModel(val || "gemini-2.5-flash")}
                    disabled={isLegacyAdmin || isPending}
                  >
                    <SelectTrigger id="gemini-model" className="h-11 border-slate-300 rounded-xl">
                      <SelectValue placeholder="Pilih model Gemini" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gemini-2.5-flash">gemini-2.5-flash (Direkomendasikan - Cepat & Pintar)</SelectItem>
                      <SelectItem value="gemini-2.5-pro">gemini-2.5-pro (Kemampuan Penalaran Tinggi)</SelectItem>
                      <SelectItem value="gemini-1.5-flash">gemini-1.5-flash (Standard)</SelectItem>
                      <SelectItem value="gemini-1.5-pro">gemini-1.5-pro (Standard Pro)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {aiProvider === "openai" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="openai-api-key" className="text-sm font-bold text-slate-700">
                    OpenAI API Key
                  </Label>
                  <div className="relative">
                    <Input
                      id="openai-api-key"
                      type={showApiKey ? "text" : "password"}
                      placeholder="sk-proj-..."
                      value={openaiApiKey}
                      onChange={(e) => setOpenaiApiKey(e.target.value)}
                      disabled={isLegacyAdmin || isPending}
                      className="pr-10 border-slate-300 hover:border-slate-400 focus:border-indigo-500 h-11 rounded-xl"
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
                  <p className="text-[11px] text-slate-500">
                    Dapatkan OpenAI API Key dari dashboard <strong>platform.openai.com</strong>.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="openai-model" className="text-sm font-bold text-slate-700">
                    OpenAI Model
                  </Label>
                  <Select
                    value={openaiModel}
                    onValueChange={(val) => setOpenaiModel(val || "gpt-4o-mini")}
                    disabled={isLegacyAdmin || isPending}
                  >
                    <SelectTrigger id="openai-model" className="h-11 border-slate-300 rounded-xl">
                      <SelectValue placeholder="Pilih model OpenAI" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gpt-4o-mini">gpt-4o-mini (Cepat & Hemat Biaya)</SelectItem>
                      <SelectItem value="gpt-4o">gpt-4o (Unggulan - Sangat Pintar)</SelectItem>
                      <SelectItem value="gpt-3.5-turbo">gpt-3.5-turbo (Legacy)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
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

"use client";

import React, { useState, useEffect, useTransition, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getFormDetailAction, updateFormAction, generateFormWithAIAction } from "@/app/actions/forms";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { compressImage } from "@/lib/image-compress";

interface FieldSchema {
  id: string;
  label: string;
  type: "text" | "textarea" | "select" | "radio" | "file";
  required: boolean;
  options?: string[];
  fileTypes?: string;
  conditionFieldId?: string;
  conditionValue?: string;
  validationType?: "none" | "number" | "phone" | "regex";
  validationMin?: number;
  validationMax?: number;
  validationPattern?: string;
}

const formatDateTimeLocal = (dateVal: any) => {
  if (!dateVal) return "";
  const date = new Date(dateVal);
  if (isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = date.getFullYear();
  const MM = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
};

export default function EditFormBuilder({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const formId = resolvedParams.id;
  
  const router = useRouter();
  
  const [isLoading, setIsLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [fields, setFields] = useState<FieldSchema[]>([]);
  const [limitOnePerIp, setLimitOnePerIp] = useState(false);
  const [maxTotalResponses, setMaxTotalResponses] = useState(0);
  const [accessPassword, setAccessPassword] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [enableTurnstile, setEnableTurnstile] = useState(false);
  const [isActive, setIsActive] = useState(true);
  
  // Advanced Settings State
  const [expiryDate, setExpiryDate] = useState("");
  const [notifyEmail, setNotifyEmail] = useState("");
  const [customSuccessMessage, setCustomSuccessMessage] = useState("");
  const [redirectUrl, setRedirectUrl] = useState("");

  // AI Form Generator State
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiApiKey, setAiApiKey] = useState("");
  const [aiModel, setAiModel] = useState("google/gemini-2.5-flash");
  const [aiModelList, setAiModelList] = useState<{ label: string; value: string }[]>([]);
  const [showAiSettings, setShowAiSettings] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiMergeMode, setAiMergeMode] = useState<"replace" | "append">("replace");
  const [showAiPanel, setShowAiPanel] = useState(false);

  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedKey = localStorage.getItem("openrouter_api_key") || "";
      const savedModel = localStorage.getItem("openrouter_ai_model") || "google/gemini-2.5-flash";
      setAiApiKey(savedKey);
      setAiModel(savedModel);

      const savedModels = localStorage.getItem("openrouter_models_list");
      if (savedModels) {
        try {
          setAiModelList(JSON.parse(savedModels));
        } catch {
          setAiModelList([]);
        }
      }
    }
  }, []);

  const handleSaveApiKey = (key: string) => {
    setAiApiKey(key);
    if (typeof window !== "undefined") {
      localStorage.setItem("openrouter_api_key", key);
    }
  };

  const handleSaveModel = (modelVal: string) => {
    setAiModel(modelVal);
    if (typeof window !== "undefined") {
      localStorage.setItem("openrouter_ai_model", modelVal);
    }
  };

  const handleGenerateWithAI = async () => {
    if (!aiPrompt.trim()) {
      toast.error("Silakan masukkan petunjuk/prompt untuk membuat form.");
      return;
    }

    setIsAiGenerating(true);
    const loadingToast = toast.loading("AI sedang merancang formulir Anda...");

    try {
      const result = await generateFormWithAIAction(aiPrompt, aiApiKey || undefined, aiModel);
      toast.dismiss(loadingToast);
      
      if (result.success && result.data) {
        const { title: aiTitle, description: aiDesc, fields: aiFields } = result.data;
        
        if (aiMergeMode === "replace") {
          setTitle(aiTitle);
          setDescription(aiDesc);
          setFields(aiFields);
          toast.success("Formulir berhasil dirancang ulang oleh AI!");
        } else {
          setFields((prev) => [...prev, ...aiFields]);
          toast.success(`${aiFields.length} pertanyaan dari AI berhasil ditambahkan!`);
        }
        setAiPrompt("");
      } else {
        toast.error(result.error || "Gagal menghasilkan formulir dengan AI.");
      }
    } catch (err: any) {
      toast.dismiss(loadingToast);
      console.error(err);
      toast.error(err.message || "Terjadi kesalahan koneksi saat memanggil AI.");
    } finally {
      setIsAiGenerating(false);
    }
  };

  useEffect(() => {
    const fetchForm = async () => {
      setIsLoading(true);
      const result = await getFormDetailAction(formId);
      if (result.success && result.data) {
        const { form } = result.data;
        setTitle(form.title || "");
        setDescription(form.description || "");
        setBannerUrl(form.banner_url || "");
        setLimitOnePerIp(form.limit_one_per_ip === true || form.max_responses === 1);
        setMaxTotalResponses(form.max_total_responses || 0);
        setAccessPassword(form.access_password || "");
        setWebhookUrl(form.webhook_url || "");
        setEnableTurnstile(form.enable_turnstile === true);
        setIsActive(form.is_active !== false);
        
        // Parse fields safely
        const formFields = Array.isArray(form.fields)
          ? form.fields
          : typeof form.fields === "string"
            ? JSON.parse(form.fields)
            : [];
        setFields(formFields);

        // Populate advanced settings
        setExpiryDate(formatDateTimeLocal(form.expiry_date));
        setNotifyEmail(form.notify_email || "");
        setCustomSuccessMessage(form.custom_success_message || "");
        setRedirectUrl(form.redirect_url || "");
      } else {
        toast.error(result.error || "Gagal memuat data formulir.");
      }
      setIsLoading(false);
    };

    fetchForm();
  }, [formId]);

  const handleAddField = (type: FieldSchema["type"]) => {
    const newField: FieldSchema = {
      id: `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      label: "",
      type,
      required: false,
      options: type === "select" || type === "radio" ? ["Pilihan 1"] : undefined,
      fileTypes: type === "file" ? "*" : undefined,
    };
    setFields((prev) => [...prev, newField]);
    toast.success(`Input baru (${type}) ditambahkan.`);
    // Scroll to the bottom of the page
    setTimeout(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    }, 100);
  };

  const handleRemoveField = (fieldId: string) => {
    setFields((prev) => prev.filter((f) => f.id !== fieldId));
    toast.info("Input dihapus.");
  };

  const handleFieldChange = (fieldId: string, updates: Partial<FieldSchema>) => {
    setFields((prev) =>
      prev.map((f) => (f.id === fieldId ? { ...f, ...updates } : f))
    );
  };

  const handleAddOption = (fieldId: string) => {
    setFields((prev) =>
      prev.map((f) => {
        if (f.id === fieldId && f.options) {
          return { ...f, options: [...f.options, `Pilihan ${f.options.length + 1}`] };
        }
        return f;
      })
    );
  };

  const handleRemoveOption = (fieldId: string, optionIndex: number) => {
    setFields((prev) =>
      prev.map((f) => {
        if (f.id === fieldId && f.options) {
          const newOptions = f.options.filter((_, idx) => idx !== optionIndex);
          return { ...f, options: newOptions.length > 0 ? newOptions : ["Pilihan 1"] };
        }
        return f;
      })
    );
  };

  const handleOptionChange = (fieldId: string, optionIndex: number, value: string) => {
    setFields((prev) =>
      prev.map((f) => {
        if (f.id === fieldId && f.options) {
          const newOptions = [...f.options];
          newOptions[optionIndex] = value;
          return { ...f, options: newOptions };
        }
        return f;
      })
    );
  };

  const handleMoveField = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === fields.length - 1) return;

    const newIndex = direction === "up" ? index - 1 : index + 1;
    const newFields = [...fields];
    const temp = newFields[index];
    newFields[index] = newFields[newIndex];
    newFields[newIndex] = temp;
    setFields(newFields);
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingBanner(true);
    toast.info("Mengunggah banner...");

    let fileToUpload = file;
    if (file.type.startsWith("image/") && file.type !== "image/gif") {
      try {
        const loadingToast = toast.loading("Mengompresi banner untuk menghemat storage...");
        fileToUpload = await compressImage(file, 1600, 1600, 0.8);
        toast.dismiss(loadingToast);
      } catch (compressErr) {
        console.error("Banner compression failed, uploading original:", compressErr);
      }
    }

    const formData = new FormData();
    formData.append("file", fileToUpload);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.url) {
        setBannerUrl(data.url);
        toast.success("Banner berhasil diunggah.");
      } else {
        toast.error(data.error || "Gagal mengunggah banner.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Terjadi kesalahan koneksi saat mengunggah banner.");
    } finally {
      setIsUploadingBanner(false);
    }
  };

  const handleSaveForm = () => {
    if (!title) {
      toast.error("Judul formulir wajib diisi.");
      return;
    }

    if (fields.length === 0) {
      toast.error("Formulir harus memiliki minimal 1 input.");
      return;
    }

    const hasEmptyLabels = fields.some((f) => !f.label.trim());
    if (hasEmptyLabels) {
      toast.error("Semua label input wajib diisi.");
      return;
    }

    startTransition(async () => {
      const result = await updateFormAction(
        formId,
        title,
        description,
        fields,
        bannerUrl || null,
        limitOnePerIp ? 1 : 0,
        customSuccessMessage || null,
        redirectUrl || null,
        expiryDate || null,
        notifyEmail || null,
        isActive,
        limitOnePerIp,
        maxTotalResponses,
        accessPassword || null,
        webhookUrl || null,
        enableTurnstile
      );
      
      if (result.success) {
        toast.success("Perubahan formulir berhasil disimpan!");
        router.push(`/admin/forms/${formId}`);
        router.refresh();
      } else {
        toast.error(result.error || "Gagal menyimpan formulir.");
      }
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f1f5f9] text-slate-800 flex flex-col items-center justify-center">
        <i className="fa-solid fa-circle-notch fa-spin text-indigo-600 text-3xl mb-3"></i>
        <p className="text-sm text-slate-500 font-semibold">Memuat data formulir...</p>
      </div>
    );
  }

  return (
    <div className="bg-[#f1f5f9] text-slate-800 flex flex-col min-h-full">
      {/* Subpage Header Actions */}
      <div className="border-b border-slate-200/80 bg-white py-4 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <Link href={`/admin/forms/${formId}`}>
              <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-800 transition-colors font-semibold cursor-pointer">
                <i className="fa-solid fa-arrow-left mr-2"></i>
                Batal
              </Button>
            </Link>
            <span className="text-slate-350 text-sm">|</span>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider bg-slate-50 border border-slate-205 px-2.5 py-1 rounded-lg font-mono truncate max-w-[200px]">
              Edit Form
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link href={`/forms/${formId}`} target="_blank">
              <Button variant="outline" size="sm" className="border-slate-200 text-slate-650 hover:bg-slate-50 h-9 text-xs rounded-xl font-semibold transition-colors cursor-pointer">
                <i className="fa-regular fa-eye mr-2 text-indigo-600"></i>
                Pratinjau
              </Button>
            </Link>
            <Button 
              onClick={handleSaveForm} 
              disabled={isPending || isUploadingBanner}
              className="bg-indigo-600 text-white hover:bg-indigo-750 font-semibold px-4 h-9 rounded-xl shadow-sm transition-all cursor-pointer"
            >
              {isPending ? (
                <>
                  <i className="fa-solid fa-circle-notch fa-spin mr-2"></i>
                  Menyimpan...
                </>
              ) : (
                <>
                  <i className="fa-regular fa-floppy-disk mr-2"></i>
                  Simpan Perubahan
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 pb-36 space-y-6 relative z-10">

        {/* AI Assistant Panel */}
        <Card className="bg-indigo-50/40 border border-indigo-205/60 shadow-sm rounded-2xl relative overflow-hidden backdrop-blur-md">
          <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
          <CardHeader className="space-y-1.5 pt-6 pb-4 cursor-pointer select-none" onClick={() => setShowAiPanel(!showAiPanel)}>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-black tracking-tight text-indigo-900 flex items-center gap-2">
                <i className="fa-solid fa-wand-magic-sparkles text-indigo-600 animate-pulse"></i>
                Asisten AI Form Builder
                <span className="text-[9px] font-bold tracking-wider text-indigo-705 bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded-full uppercase ml-1">
                  Gemini Powered
                </span>
              </CardTitle>
              <span className="text-slate-400 hover:text-slate-600 transition-colors">
                <i className={`fa-solid ${showAiPanel ? "fa-chevron-up" : "fa-chevron-down"}`}></i>
              </span>
            </div>
            <CardDescription className="text-slate-500 text-xs">
              Ubah atau tambahkan pertanyaan formulir Anda menggunakan bantuan kecerdasan buatan OpenRouter.
            </CardDescription>
          </CardHeader>
          
          {showAiPanel && (
            <CardContent className="space-y-4 pt-0 pb-6 border-t border-indigo-100/50 mt-2">
              <div className="space-y-2 pt-4">
                <Label htmlFor="ai-prompt" className="text-indigo-900 text-xs font-bold flex items-center justify-between">
                  <span>Jelaskan rancangan/pertanyaan baru yang ingin Anda buat</span>
                  <span className="text-[10px] text-slate-400 font-normal">Contoh: "Tambahkan pertanyaan tentang kepuasan pelayanan pengiriman barang"</span>
                </Label>
                <Textarea
                  id="ai-prompt"
                  placeholder="Ketik topik atau detail formulir yang Anda inginkan..."
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  className="bg-white/85 border border-indigo-200/80 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 text-slate-800 min-h-[85px] leading-relaxed rounded-xl transition-all"
                  disabled={isAiGenerating}
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                {/* Method selection */}
                <div className="flex items-center gap-4">
                  <span className="text-xs text-slate-500 font-bold">Mode Penggabungan:</span>
                  <label className="flex items-center gap-1.5 text-xs text-slate-750 font-medium cursor-pointer">
                    <input
                      type="radio"
                      name="ai-merge-mode"
                      checked={aiMergeMode === "replace"}
                      onChange={() => setAiMergeMode("replace")}
                      className="accent-indigo-600"
                      disabled={isAiGenerating}
                    />
                    Gantikan formulir saat ini
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-750 font-medium cursor-pointer">
                    <input
                      type="radio"
                      name="ai-merge-mode"
                      checked={aiMergeMode === "append"}
                      onChange={() => setAiMergeMode("append")}
                      className="accent-indigo-600"
                      disabled={isAiGenerating}
                    />
                    Tambahkan ke formulir saat ini
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAiSettings(!showAiSettings)}
                    className="text-slate-500 hover:text-slate-700 h-9 px-3 rounded-lg border border-slate-200/60 bg-white/40 cursor-pointer"
                  >
                    <i className="fa-solid fa-key mr-1.5 text-xs"></i>
                    API Key
                  </Button>

                  <Button
                    type="button"
                    onClick={handleGenerateWithAI}
                    disabled={isAiGenerating}
                    className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-700 hover:to-violet-700 font-semibold px-4 h-9 rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer"
                  >
                    {isAiGenerating ? (
                      <>
                        <i className="fa-solid fa-circle-notch fa-spin"></i>
                        Merancang Form...
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-wand-magic-sparkles"></i>
                        Hasilkan dengan AI
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {showAiSettings && (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl mt-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="ai-api-key" className="text-slate-700 text-xs font-bold flex items-center justify-between">
                        <span>OpenRouter API Key (Opsional jika sudah diset di server)</span>
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id="ai-api-key"
                          type="password"
                          placeholder="sk-or-v1-..."
                          value={aiApiKey}
                          onChange={(e) => handleSaveApiKey(e.target.value)}
                          className="bg-white border border-slate-250 focus:border-indigo-500 text-slate-800 h-9 rounded-lg text-xs"
                        />
                        {aiApiKey && (
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => handleSaveApiKey("")}
                            className="text-red-500 hover:text-red-700 border border-slate-200/60 bg-white h-9 px-2.5 rounded-lg text-xs cursor-pointer"
                          >
                            Hapus
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="ai-model-select" className="text-slate-700 text-xs font-bold">
                        Model AI OpenRouter
                      </Label>
                      <select
                        id="ai-model-select"
                        value={aiModel}
                        onChange={(e) => handleSaveModel(e.target.value)}
                        className="w-full bg-white border border-slate-250 text-slate-800 h-9 px-3 rounded-lg text-xs focus:outline-none focus:border-indigo-505 transition-colors cursor-pointer"
                      >
                        {aiModelList.length > 0 ? (
                          aiModelList.map((model, idx) => (
                            <option key={idx} value={model.value}>
                              {model.label}
                            </option>
                          ))
                        ) : (
                          <>
                            <option value="openrouter/free">openrouter/free (Auto Routing Gratis)</option>
                            <option value="google/gemini-2.5-flash">google/gemini-2.5-flash (Direkomendasikan)</option>
                            <option value="google/gemini-2.5-pro">google/gemini-2.5-pro</option>
                            <option value="google/gemma-2-9b-it:free">google/gemma-2-9b-it:free (Gratis)</option>
                            <option value="meta-llama/llama-3.1-8b-instruct:free">meta-llama/llama-3.1-8b-instruct:free (Gratis)</option>
                            <option value="meta-llama/llama-3-8b-instruct:free">meta-llama/llama-3-8b-instruct:free (Gratis)</option>
                            <option value="qwen/qwen-2.5-72b-instruct:free">qwen/qwen-2.5-72b-instruct:free (Gratis)</option>
                          </>
                        )}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          )}
        </Card>

        {/* Form Meta */}
        <Card className="bg-white border-slate-200 shadow-sm rounded-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-[4px] h-full bg-indigo-600" />
          <CardHeader className="space-y-1.5 pt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-1.5">
              <CardTitle className="text-xl font-black tracking-tight text-slate-900 flex items-center gap-2">
                <i className="fa-solid fa-wand-magic-sparkles text-indigo-600 text-base"></i>
                Informasi Umum Formulir
              </CardTitle>
              <CardDescription className="text-slate-500 text-xs">
                Edit judul identitas, deskripsi petunjuk pengisian, status aktif, dan banner
              </CardDescription>
            </div>
            
            {/* Form Active Switch */}
            <div className="flex items-center space-x-2.5 pt-2 md:pt-0 shrink-0">
              <Checkbox
                id="is-active"
                checked={isActive}
                onCheckedChange={(checked) => setIsActive(!!checked)}
                className="border-slate-350 data-[state=checked]:bg-indigo-600 data-[state=checked]:text-white rounded"
              />
              <Label htmlFor="is-active" className="text-slate-700 text-xs font-bold cursor-pointer">
                Status Formulir Aktif (Terbuka)
              </Label>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <div className="space-y-2">
              <Label htmlFor="form-title" className="text-slate-650 text-xs font-bold">Judul Formulir</Label>
              <Input
                id="form-title"
                placeholder="Contoh: Formulir Pendaftaran Kegiatan"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-white border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 text-slate-800 h-11 rounded-xl transition-all"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="form-desc" className="text-slate-650 text-xs font-bold">Deskripsi / Petunjuk Pengisian (Opsional)</Label>
              <Textarea
                id="form-desc"
                placeholder="Tulis informasi tambahan atau aturan bagi pengisi formulir..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-white border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 text-slate-800 min-h-[90px] leading-relaxed rounded-xl transition-all"
              />
            </div>

            {/* Banner Image Uploader */}
            <div className="space-y-2 pt-2">
              <Label className="text-slate-650 text-xs font-bold">Gambar Banner Formulir (Opsional)</Label>
              <div className="flex flex-col gap-4">
                {bannerUrl ? (
                  <div className="relative w-full h-36 rounded-xl border border-slate-200 overflow-hidden bg-slate-50 shadow-inner">
                     <img src={bannerUrl} alt="Banner Preview" className="w-full h-full object-cover" />
                     <Button
                       type="button"
                       variant="destructive"
                       size="sm"
                       onClick={() => setBannerUrl("")}
                       className="absolute top-3 right-3 h-7.5 px-3 text-xs bg-red-600 text-white hover:bg-red-700 transition-colors shadow-sm rounded-lg cursor-pointer"
                     >
                       Hapus Banner
                     </Button>
                  </div>
                ) : (
                  <div className="relative border border-dashed border-slate-300 rounded-xl p-8 bg-slate-50/50 text-center w-full group hover:border-indigo-400 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleBannerUpload}
                      disabled={isUploadingBanner}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                    />
                    <div className="flex flex-col items-center justify-center space-y-2 text-slate-400">
                      {isUploadingBanner ? (
                        <i className="fa-solid fa-circle-notch fa-spin text-indigo-650 text-xl"></i>
                      ) : (
                        <i className="fa-solid fa-cloud-arrow-up text-xl group-hover:text-indigo-600 transition-colors"></i>
                      )}
                      <span className="text-xs font-semibold text-slate-700">
                        {isUploadingBanner ? "Sedang memproses..." : "Klik atau seret gambar banner ke sini"}
                      </span>
                      <span className="text-[10px] text-slate-400">Rasio lebar direkomendasikan (misal: 1200x400, Maks. 5MB)</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Form Settings / Limit Responses */}
            <div className="flex items-center space-x-2.5 pt-4 border-t border-slate-100">
              <Checkbox
                id="limit-responses"
                checked={limitOnePerIp}
                onCheckedChange={(checked) => setLimitOnePerIp(!!checked)}
                className="border-slate-350 data-[state=checked]:bg-indigo-600 data-[state=checked]:text-white rounded"
              />
              <Label htmlFor="limit-responses" className="text-slate-650 text-xs font-semibold cursor-pointer">
                Batasi 1 Tanggapan per IP Address (Cegah Spam Data Dobel)
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Advanced Settings */}
        <Card className="bg-white border-slate-200 shadow-sm rounded-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-[4px] h-full bg-violet-500" />
          <CardHeader className="space-y-1.5 pt-6">
            <CardTitle className="text-xl font-black tracking-tight text-slate-900 flex items-center gap-2">
              <i className="fa-solid fa-gear text-violet-600 text-base"></i>
              Konfigurasi Lanjutan
            </CardTitle>
            <CardDescription className="text-slate-500 text-xs">
              Kustomisasi penutupan deadline otomatis, redirect url, pesan terima kasih kustom, email notifikasi, keamanan, dan webhook
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expiry-date" className="text-slate-650 text-xs font-bold">Batas Waktu Pengisian (Deadline)</Label>
                <Input
                  id="expiry-date"
                  type="datetime-local"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="bg-white border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 text-slate-800 h-11 rounded-xl transition-all"
                />
                <p className="text-[10px] text-slate-400">Form otomatis ditutup jika melewati jam ini. Kosongkan jika tanpa deadline.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notify-email" className="text-slate-650 text-xs font-bold">Notifikasi Tanggapan ke Email (Resend)</Label>
                <Input
                  id="notify-email"
                  type="email"
                  placeholder="admin@domain.com"
                  value={notifyEmail}
                  onChange={(e) => setNotifyEmail(e.target.value)}
                  className="bg-white border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 text-slate-800 h-11 rounded-xl transition-all"
                />
                <p className="text-[10px] text-slate-400">Terima email rincian jawaban real-time ke email Anda setiap ada tanggapan masuk.</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom-success-msg" className="text-slate-650 text-xs font-bold">Pesan Sukses Kustom setelah Kirim</Label>
              <Textarea
                id="custom-success-msg"
                placeholder="Tulis instruksi setelah berhasil kirim tanggapan (misal: link grup whatsapp pendaftar)..."
                value={customSuccessMessage}
                onChange={(e) => setCustomSuccessMessage(e.target.value)}
                className="bg-white border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 text-slate-800 min-h-[80px] rounded-xl transition-all"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="redirect-url" className="text-slate-650 text-xs font-bold">Mengarahkan Otomatis (Redirect URL)</Label>
              <Input
                id="redirect-url"
                type="url"
                placeholder="https://e-commerce-anda.com/terima-kasih"
                value={redirectUrl}
                onChange={(e) => setRedirectUrl(e.target.value)}
                className="bg-white border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 text-slate-800 h-11 rounded-xl transition-all"
              />
              <p className="text-[10px] text-slate-400">Jika diisi, pengguna dialihkan otomatis ke URL ini dalam 3 detik setelah submit.</p>
            </div>

            {/* Keamanan & Pembatasan Akses */}
            <div className="border-t border-slate-100 pt-4 space-y-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <i className="fa-solid fa-shield-halved text-indigo-650"></i>
                Keamanan & Pembatasan Akses
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="access-password" className="text-slate-650 text-xs font-bold">Kata Sandi Akses Formulir (Password Protection)</Label>
                  <Input
                    id="access-password"
                    type="text"
                    placeholder="Kosongkan jika ingin publik tanpa password"
                    value={accessPassword}
                    onChange={(e) => setAccessPassword(e.target.value)}
                    className="bg-white border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 text-slate-800 h-11 rounded-xl transition-all"
                  />
                  <p className="text-[10px] text-slate-400">Pengisi wajib memasukkan sandi ini sebelum bisa melihat/mengisi formulir.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max-total-responses" className="text-slate-650 text-xs font-bold">Batas Maksimal Total Tanggapan (Kuota)</Label>
                  <Input
                    id="max-total-responses"
                    type="number"
                    placeholder="0"
                    value={maxTotalResponses || ""}
                    onChange={(e) => setMaxTotalResponses(e.target.value !== "" ? Number(e.target.value) : 0)}
                    className="bg-white border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 text-slate-800 h-11 rounded-xl transition-all"
                  />
                  <p className="text-[10px] text-slate-400">Form otomatis ditutup jika total tanggapan mencapai batas ini. Isi 0 jika tanpa batas.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="flex items-center space-x-2.5">
                  <Checkbox
                    id="limit-one-per-ip-adv"
                    checked={limitOnePerIp}
                    onCheckedChange={(checked) => setLimitOnePerIp(!!checked)}
                    className="border-slate-350 data-[state=checked]:bg-indigo-600 data-[state=checked]:text-white rounded"
                  />
                  <Label htmlFor="limit-one-per-ip-adv" className="text-slate-650 text-xs font-semibold cursor-pointer">
                    Batasi 1 Tanggapan per IP Address (Cegah Spam Data)
                  </Label>
                </div>

                <div className="flex items-center space-x-2.5">
                  <Checkbox
                    id="enable-turnstile"
                    checked={enableTurnstile}
                    onCheckedChange={(checked) => setEnableTurnstile(!!checked)}
                    className="border-slate-350 data-[state=checked]:bg-indigo-600 data-[state=checked]:text-white rounded"
                  />
                  <Label htmlFor="enable-turnstile" className="text-slate-650 text-xs font-semibold cursor-pointer">
                    Aktifkan Cloudflare Turnstile Captcha (Anti-Bot)
                  </Label>
                </div>
              </div>
            </div>

            {/* Integrasi Webhook */}
            <div className="border-t border-slate-100 pt-4 space-y-2">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <i className="fa-solid fa-link text-indigo-650"></i>
                Integrasi Webhook
              </h3>
              <Label htmlFor="webhook-url" className="text-slate-650 text-xs font-bold">URL Webhook Notifikasi (Discord / Slack / Custom API)</Label>
              <Input
                id="webhook-url"
                type="url"
                placeholder="https://discord.com/api/webhooks/... atau https://hooks.slack.com/services/..."
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="bg-white border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 text-slate-800 h-11 rounded-xl transition-all"
              />
              <p className="text-[10px] text-slate-400">Setiap ada tanggapan baru masuk, data jawaban akan dikirimkan otomatis ke tautan webhook.</p>
            </div>
          </CardContent>
        </Card>

        {/* Dynamic Fields List */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-slate-800 flex items-center">
            Struktur Input Pertanyaan
            <span className="ml-2.5 px-2.5 py-0.5 rounded-full text-[10px] bg-white border border-slate-200 text-slate-500 font-mono font-bold shadow-sm">
              {fields.length} Pertanyaan
            </span>
          </h2>

          {fields.length === 0 ? (
            <div className="border border-dashed border-slate-300 rounded-2xl p-16 text-center flex flex-col items-center justify-center space-y-3 bg-white/50">
              <p className="text-slate-400 text-sm font-semibold">Belum ada kolom pertanyaan. Gunakan dock floating menu di bawah untuk menambah kolom.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {fields.map((field, index) => (
                <Card key={field.id} className="bg-white border-slate-200 relative overflow-hidden group rounded-2xl shadow-sm hover:border-indigo-200 transition-all duration-300">
                  <div className="absolute left-0 top-0 h-full w-[4px] bg-slate-200 group-hover:bg-indigo-600 transition-colors" />
                  
                  <CardHeader className="py-3.5 px-6 flex flex-row items-center justify-between border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center space-x-3">
                      <span className="text-xs text-slate-400 font-mono font-bold">#{index + 1}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 flex items-center bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                        {field.type === "text" && <i className="fa-solid fa-font text-indigo-600 mr-1.5"></i>}
                        {field.type === "textarea" && <i className="fa-solid fa-paragraph text-indigo-600 mr-1.5"></i>}
                        {field.type === "select" && <i className="fa-solid fa-caret-down text-indigo-600 mr-1.5"></i>}
                        {field.type === "radio" && <i className="fa-solid fa-circle-dot text-indigo-600 mr-1.5"></i>}
                        {field.type === "file" && <i className="fa-solid fa-cloud-arrow-up text-indigo-600 mr-1.5"></i>}
                        {field.type}
                      </span>
                    </div>

                    {/* Order & Remove Controls */}
                    <div className="flex items-center space-x-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleMoveField(index, "up")}
                        disabled={index === 0}
                        className="h-7 w-7 text-slate-400 hover:text-slate-800 disabled:opacity-20 transition-colors cursor-pointer"
                      >
                        <i className="fa-solid fa-chevron-up text-xs"></i>
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleMoveField(index, "down")}
                        disabled={index === fields.length - 1}
                        className="h-7 w-7 text-slate-400 hover:text-slate-800 disabled:opacity-20 transition-colors cursor-pointer"
                      >
                        <i className="fa-solid fa-chevron-down text-xs"></i>
                      </Button>
                      <span className="text-slate-200 text-xs px-0.5">|</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleRemoveField(field.id)}
                        className="h-7 w-7 text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all cursor-pointer"
                      >
                        <i className="fa-regular fa-trash-can text-xs"></i>
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                      {/* Label Input */}
                      <div className="md:col-span-8 space-y-2">
                        <Label htmlFor={`label-${field.id}`} className="text-slate-650 text-[11px] font-bold">Judul Pertanyaan / Label Input</Label>
                        <Input
                          id={`label-${field.id}`}
                          placeholder="Masukkan teks pertanyaan Anda..."
                          value={field.label}
                          onChange={(e) => handleFieldChange(field.id, { label: e.target.value })}
                          className="bg-white border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 text-slate-800 h-9 rounded-xl transition-all"
                        />
                      </div>
                      
                      {/* Required toggle */}
                      <div className="md:col-span-4 flex items-end pb-2.5 space-x-2">
                        <Checkbox
                          id={`req-${field.id}`}
                          checked={field.required}
                          onCheckedChange={(checked) => 
                            handleFieldChange(field.id, { required: !!checked })
                          }
                          className="border-slate-350 data-[state=checked]:bg-indigo-600 data-[state=checked]:text-white rounded"
                        />
                        <Label htmlFor={`req-${field.id}`} className="text-slate-750 text-xs font-semibold cursor-pointer">
                          Wajib Diisi (Required)
                        </Label>
                      </div>
                    </div>

                    {/* File Types Selection */}
                    {field.type === "file" && (
                      <div className="border-t border-slate-100 pt-4 space-y-2">
                        <Label className="text-slate-650 text-[11px] font-bold">Tipe Berkas yang Diizinkan</Label>
                        <Select
                          value={field.fileTypes || "*"}
                          onValueChange={(val) => handleFieldChange(field.id, { fileTypes: val ?? undefined })}
                        >
                          <SelectTrigger className="bg-white border border-slate-200 text-slate-800 max-w-sm h-9 rounded-xl focus:ring-1 focus:ring-indigo-500/20">
                            <SelectValue placeholder="Pilih tipe berkas..." />
                          </SelectTrigger>
                          <SelectContent className="bg-white border border-slate-250 text-slate-800 rounded-xl">
                            <SelectItem value="*" className="focus:bg-slate-100 rounded-lg">Semua Berkas (*)</SelectItem>
                            <SelectItem value="image/*" className="focus:bg-slate-100 rounded-lg">Hanya Gambar (PNG, JPG, WebP, GIF)</SelectItem>
                            <SelectItem value="audio/*" className="focus:bg-slate-100 rounded-lg">Hanya Audio (MP3, WAV, OGG)</SelectItem>
                            <SelectItem value=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx" className="focus:bg-slate-100 rounded-lg">Hanya Dokumen (PDF, Word, Excel, PPT)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Text Field Validation Selection */}
                    {field.type === "text" && (
                      <div className="border-t border-slate-100 pt-4 space-y-3">
                        <Label className="text-slate-655 text-[11px] font-bold">Validasi Spesifik Kolom Teks</Label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-slate-500 text-[10px] font-bold">Tipe Validasi</Label>
                            <Select
                              value={field.validationType || "none"}
                              onValueChange={(val) => handleFieldChange(field.id, { 
                                validationType: val as any,
                                validationMin: undefined,
                                validationMax: undefined,
                                validationPattern: undefined
                              })}
                            >
                              <SelectTrigger className="bg-white border border-slate-200 text-slate-800 h-9 rounded-xl focus:ring-1 focus:ring-indigo-500/20">
                                <SelectValue placeholder="Tanpa Validasi" />
                              </SelectTrigger>
                              <SelectContent className="bg-white border border-slate-250 text-slate-850 rounded-xl">
                                <SelectItem value="none" className="focus:bg-slate-100 rounded-lg">Tanpa Validasi</SelectItem>
                                <SelectItem value="number" className="focus:bg-slate-100 rounded-lg">Hanya Angka</SelectItem>
                                <SelectItem value="phone" className="focus:bg-slate-100 rounded-lg">Nomor Telepon</SelectItem>
                                <SelectItem value="regex" className="focus:bg-slate-100 rounded-lg">Kustom Regex Pattern</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {field.validationType === "number" && (
                            <>
                              <div className="space-y-1.5">
                                <Label className="text-slate-500 text-[10px] font-bold">Nilai Minimum (Opsional)</Label>
                                <Input
                                  type="number"
                                  placeholder="Min"
                                  value={field.validationMin !== undefined ? field.validationMin : ""}
                                  onChange={(e) => handleFieldChange(field.id, { 
                                    validationMin: e.target.value !== "" ? Number(e.target.value) : undefined 
                                  })}
                                  className="bg-white border border-slate-200 h-9 rounded-xl focus:ring-1 focus:ring-indigo-500/20 text-slate-800"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-slate-500 text-[10px] font-bold">Nilai Maksimum (Opsional)</Label>
                                <Input
                                  type="number"
                                  placeholder="Max"
                                  value={field.validationMax !== undefined ? field.validationMax : ""}
                                  onChange={(e) => handleFieldChange(field.id, { 
                                    validationMax: e.target.value !== "" ? Number(e.target.value) : undefined 
                                  })}
                                  className="bg-white border border-slate-200 h-9 rounded-xl focus:ring-1 focus:ring-indigo-500/20 text-slate-800"
                                />
                              </div>
                            </>
                          )}

                          {field.validationType === "regex" && (
                            <div className="md:col-span-2 space-y-1.5">
                              <Label className="text-slate-500 text-[10px] font-bold">{"Regex Pattern (Contoh: ^[A-Z]{3}-\\d{4}$)"}</Label>
                              <Input
                                placeholder="Masukkan regular expression..."
                                value={field.validationPattern || ""}
                                onChange={(e) => handleFieldChange(field.id, { validationPattern: e.target.value })}
                                className="bg-white border border-slate-200 h-9 rounded-xl focus:ring-1 focus:ring-indigo-500/20 text-slate-850"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Options configuration for Select/Radio types */}
                    {(field.type === "select" || field.type === "radio") && field.options && (
                      <div className="border-t border-slate-100 pt-4 space-y-3">
                        <Label className="text-slate-655 text-[11px] font-bold">Daftar Opsi Pilihan</Label>
                        <div className="space-y-2">
                          {field.options.map((option, optIdx) => (
                            <div key={optIdx} className="flex items-center space-x-2">
                              <span className="text-[10px] text-slate-400 font-semibold font-mono w-14 shrink-0">Opsi {optIdx + 1}</span>
                              <Input
                                value={option}
                                onChange={(e) => handleOptionChange(field.id, optIdx, e.target.value)}
                                className="bg-white border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 text-slate-800 max-w-md h-8 text-xs rounded-lg transition-all"
                              />
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleRemoveOption(field.id, optIdx)}
                                className="h-8 w-8 text-slate-400 hover:text-rose-500 cursor-pointer"
                              >
                                <i className="fa-regular fa-trash-can text-xs"></i>
                              </Button>
                            </div>
                          ))}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAddOption(field.id)}
                          className="border-slate-200 text-slate-600 hover:bg-slate-50 mt-1 h-8 text-xs rounded-lg font-semibold transition-colors cursor-pointer"
                        >
                          <i className="fa-solid fa-plus mr-1"></i>
                          Tambah Opsi
                        </Button>
                      </div>
                    )}

                    {/* Conditional Logic (Show only if there are previous fields) */}
                    {index > 0 && (
                      <div className="border-t border-slate-100 pt-4 space-y-3">
                        <div className="flex items-center space-x-2.5">
                          <Checkbox
                            id={`cond-chk-${field.id}`}
                            checked={!!field.conditionFieldId}
                            onCheckedChange={(checked) => {
                              if (!checked) {
                                handleFieldChange(field.id, { conditionFieldId: undefined, conditionValue: undefined });
                              } else {
                                const prevField = fields[index - 1];
                                handleFieldChange(field.id, { 
                                  conditionFieldId: prevField.id, 
                                  conditionValue: prevField.options && prevField.options.length > 0 ? prevField.options[0] : "Ya" 
                                });
                              }
                            }}
                            className="border-slate-350 data-[state=checked]:bg-indigo-600 data-[state=checked]:text-white rounded"
                          />
                          <Label htmlFor={`cond-chk-${field.id}`} className="text-slate-650 text-xs font-semibold cursor-pointer">
                            Terapkan Logika Percabangan (Conditional Show)
                          </Label>
                        </div>

                        {field.conditionFieldId && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-6 pt-1">
                            <div className="space-y-1.5">
                              <Label className="text-slate-500 text-[10px] font-bold">Tampilkan Hanya Jika Pertanyaan:</Label>
                              <Select
                                value={field.conditionFieldId}
                                onValueChange={(val) => {
                                  const selectedField = fields.find(f => f.id === val);
                                  const defaultVal = selectedField?.options && selectedField.options.length > 0 ? selectedField.options[0] : "Ya";
                                  handleFieldChange(field.id, { conditionFieldId: val || undefined, conditionValue: defaultVal || undefined });
                                }}
                              >
                                <SelectTrigger className="bg-white border border-slate-200 text-slate-800 h-9 rounded-xl focus:ring-1 focus:ring-indigo-500/20">
                                  <SelectValue placeholder="Pilih pertanyaan..." />
                                </SelectTrigger>
                                <SelectContent className="bg-white border border-slate-200 text-slate-850 rounded-xl">
                                  {fields.slice(0, index).map((pf) => (
                                    <SelectItem key={pf.id} value={pf.id} className="focus:bg-slate-100 rounded-lg">
                                      {pf.label || `[Pertanyaan #${fields.indexOf(pf) + 1}]`}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-1.5">
                              <Label className="text-slate-500 text-[10px] font-bold">Bernilai Sama Dengan:</Label>
                              {(() => {
                                const triggerField = fields.find(f => f.id === field.conditionFieldId);
                                if (triggerField && (triggerField.type === "select" || triggerField.type === "radio") && triggerField.options) {
                                  return (
                                    <Select
                                      value={field.conditionValue || ""}
                                      onValueChange={(val) => handleFieldChange(field.id, { conditionValue: val || undefined })}
                                    >
                                      <SelectTrigger className="bg-white border border-slate-200 text-slate-850 h-9 rounded-xl focus:ring-1 focus:ring-indigo-500/20">
                                        <SelectValue placeholder="Pilih nilai..." />
                                      </SelectTrigger>
                                      <SelectContent className="bg-white border border-slate-200 text-slate-850 rounded-xl">
                                        {triggerField.options.map((opt, idx) => (
                                          <SelectItem key={idx} value={opt} className="focus:bg-slate-100 rounded-lg">
                                            {opt}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  );
                                }
                                return (
                                  <Input
                                    placeholder="Contoh: Ya"
                                    value={field.conditionValue || ""}
                                    onChange={(e) => handleFieldChange(field.id, { conditionValue: e.target.value })}
                                    className="bg-white border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 text-slate-850 h-9 rounded-xl transition-all"
                                  />
                                );
                              })()}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* STICKY FLOATING ADD FIELD TOOLBAR AT BOTTOM CENTER */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-2xl px-4 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="border border-slate-200/85 bg-white/95 backdrop-blur-md rounded-2xl p-3 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-850">
            <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider pl-1.5 shrink-0 flex items-center gap-1.5">
              <i className="fa-solid fa-layer-group text-indigo-650"></i>
              Tambah Input:
            </span>
            <div className="flex flex-wrap gap-1.5 justify-center">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAddField("text")}
                className="border-slate-200 bg-white text-slate-700 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 text-[11px] h-8 rounded-lg transition-all font-semibold cursor-pointer shadow-sm"
              >
                <i className="fa-solid fa-font text-indigo-650 mr-1.5 group-hover:text-white"></i>
                Teks Pendek
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAddField("textarea")}
                className="border-slate-200 bg-white text-slate-700 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 text-[11px] h-8 rounded-lg transition-all font-semibold cursor-pointer shadow-sm"
              >
                <i className="fa-solid fa-paragraph text-indigo-650 mr-1.5 group-hover:text-white"></i>
                Paragraf
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAddField("select")}
                className="border-slate-200 bg-white text-slate-700 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 text-[11px] h-8 rounded-lg transition-all font-semibold cursor-pointer shadow-sm"
              >
                <i className="fa-solid fa-caret-down text-indigo-650 mr-1.5 group-hover:text-white"></i>
                Dropdown
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAddField("radio")}
                className="border-slate-200 bg-white text-slate-700 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 text-[11px] h-8 rounded-lg transition-all font-semibold cursor-pointer shadow-sm"
              >
                <i className="fa-solid fa-circle-dot text-indigo-650 mr-1.5 group-hover:text-white"></i>
                Pilihan Ganda
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAddField("file")}
                className="border-slate-200 bg-white text-slate-700 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 text-[11px] h-8 rounded-lg transition-all font-semibold cursor-pointer shadow-sm"
              >
                <i className="fa-solid fa-cloud-arrow-up text-indigo-650 mr-1.5 group-hover:text-white"></i>
                Unggah Berkas
              </Button>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}

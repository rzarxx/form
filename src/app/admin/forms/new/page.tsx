"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createFormAction } from "@/app/actions/forms";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { compressImage } from "@/lib/image-compress";
import { 
  Plus, 
  Trash2, 
  ArrowLeft, 
  Save, 
  MoveUp, 
  MoveDown, 
  FileText, 
  AlignLeft, 
  List, 
  Radio, 
  Upload,
  Loader2,
  Settings,
  Sparkles,
  Layers
} from "lucide-react";

interface FieldSchema {
  id: string;
  label: string;
  type: "text" | "textarea" | "select" | "radio" | "file";
  required: boolean;
  options?: string[];
  fileTypes?: string;
  conditionFieldId?: string;
  conditionValue?: string;
}

export default function NewFormBuilder() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [fields, setFields] = useState<FieldSchema[]>([]);
  const [limitResponses, setLimitResponses] = useState(false);
  
  // Advanced Settings State
  const [expiryDate, setExpiryDate] = useState("");
  const [notifyEmail, setNotifyEmail] = useState("");
  const [customSuccessMessage, setCustomSuccessMessage] = useState("");
  const [redirectUrl, setRedirectUrl] = useState("");

  const [isPending, startTransition] = useTransition();

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
    // Scroll to the bottom of the page to show the new field
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
      const result = await createFormAction(
        title,
        description,
        fields,
        bannerUrl || null,
        limitResponses ? 1 : 0,
        customSuccessMessage || null,
        redirectUrl || null,
        expiryDate || null,
        notifyEmail || null,
        true
      );
      
      if (result.success) {
        toast.success("Formulir berhasil disimpan!");
        router.push("/admin");
        router.refresh();
      } else {
        toast.error(result.error || "Gagal menyimpan formulir.");
      }
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-950 via-neutral-900 to-neutral-950 text-neutral-100 flex flex-col relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-0 right-1/4 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="border-b border-neutral-900 bg-neutral-950/40 backdrop-blur sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 min-h-16 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
          <Link href="/admin">
            <Button variant="ghost" size="sm" className="text-neutral-450 hover:text-neutral-200">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Batal
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-xs text-neutral-500 font-medium font-mono uppercase tracking-wider bg-neutral-900 px-2 py-1 rounded border border-neutral-850">Form Builder</span>
            <Button 
              onClick={handleSaveForm} 
              disabled={isPending || isUploadingBanner}
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium px-4 h-9 shadow-lg shadow-primary/10 hover:shadow-primary/20 hover:scale-[1.015] transition-all"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Simpan Form
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 pb-36 space-y-6 relative z-10">
        
        {/* Form Meta */}
        <Card className="bg-neutral-900/30 border-neutral-900 shadow-xl overflow-hidden relative backdrop-blur-md">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary/55 to-transparent" />
          <CardHeader className="space-y-1.5 pt-6">
            <CardTitle className="text-xl font-bold text-neutral-100 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary animate-pulse" />
              Informasi Umum Formulir
            </CardTitle>
            <CardDescription className="text-neutral-450 text-xs">Tentukan judul identitas, deskripsi petunjuk pengisian, dan banner visual</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <div className="space-y-2">
              <Label htmlFor="form-title" className="text-neutral-400 text-xs font-semibold">Judul Formulir</Label>
              <Input
                id="form-title"
                placeholder="Contoh: Formulir Pendaftaran Kegiatan"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-neutral-950/60 border-neutral-850 focus:border-primary text-neutral-200 h-11"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="form-desc" className="text-neutral-400 text-xs font-semibold">Deskripsi / Petunjuk Pengisian (Opsional)</Label>
              <Textarea
                id="form-desc"
                placeholder="Tulis informasi tambahan atau aturan bagi pengisi formulir..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-neutral-950/60 border-neutral-850 focus:border-primary text-neutral-200 min-h-[90px] leading-relaxed"
              />
            </div>

            {/* Banner Image Uploader */}
            <div className="space-y-2 pt-2">
              <Label className="text-neutral-400 text-xs font-semibold">Gambar Banner Formulir (Opsional)</Label>
              <div className="flex flex-col gap-4">
                {bannerUrl ? (
                  <div className="relative w-full h-36 rounded-xl border border-neutral-850 overflow-hidden bg-neutral-950 shadow-inner">
                     <img src={bannerUrl} alt="Banner Preview" className="w-full h-full object-cover" />
                     <Button
                       type="button"
                       variant="destructive"
                       size="sm"
                       onClick={() => setBannerUrl("")}
                       className="absolute top-3 right-3 h-7.5 px-3 text-xs bg-red-950/80 text-red-300 border border-red-900/50 hover:bg-red-900 transition-colors"
                     >
                       Hapus Banner
                     </Button>
                  </div>
                ) : (
                  <div className="relative border border-dashed border-neutral-850 rounded-xl p-8 bg-neutral-950/20 text-center w-full group hover:border-primary/45 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleBannerUpload}
                      disabled={isUploadingBanner}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                    />
                    <div className="flex flex-col items-center justify-center space-y-2 text-neutral-455">
                      {isUploadingBanner ? (
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      ) : (
                        <Upload className="h-6 w-6 group-hover:text-primary transition-colors" />
                      )}
                      <span className="text-xs font-semibold text-neutral-350">
                        {isUploadingBanner ? "Sedang memproses..." : "Klik atau seret gambar banner ke sini"}
                      </span>
                      <span className="text-[10px] text-neutral-600">Rasio lebar direkomendasikan (misal: 1200x400, Maks. 5MB)</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Form Settings / Limit Responses */}
            <div className="flex items-center space-x-2.5 pt-4 border-t border-neutral-900/60">
              <Checkbox
                id="limit-responses"
                checked={limitResponses}
                onCheckedChange={(checked) => setLimitResponses(!!checked)}
                className="border-neutral-700 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
              />
              <Label htmlFor="limit-responses" className="text-neutral-350 text-xs font-medium cursor-pointer">
                Batasi 1 Tanggapan per IP Address (Cegah Spam Data Dobel)
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Advanced Settings */}
        <Card className="bg-neutral-900/30 border-neutral-900 shadow-xl overflow-hidden relative backdrop-blur-md">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />
          <CardHeader className="space-y-1.5 pt-6">
            <CardTitle className="text-xl font-bold text-neutral-100 flex items-center gap-2">
              <Settings className="h-5 w-5 text-violet-400" />
              Konfigurasi Lanjutan
            </CardTitle>
            <CardDescription className="text-neutral-450 text-xs">
              Kustomisasi penutupan deadline otomatis, redirect url, pesan terima kasih kustom, dan notifikasi email
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expiry-date" className="text-neutral-400 text-xs font-semibold">Batas Waktu Pengisian (Deadline)</Label>
                <Input
                  id="expiry-date"
                  type="datetime-local"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="bg-neutral-950/60 border-neutral-850 focus:border-primary text-neutral-200 h-11"
                />
                <p className="text-[10px] text-neutral-600">Form otomatis ditutup jika melewati jam ini. Kosongkan jika tanpa deadline.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notify-email" className="text-neutral-400 text-xs font-semibold">Notifikasi Tanggapan ke Email (Resend)</Label>
                <Input
                  id="notify-email"
                  type="email"
                  placeholder="admin@domain.com"
                  value={notifyEmail}
                  onChange={(e) => setNotifyEmail(e.target.value)}
                  className="bg-neutral-950/60 border-neutral-850 focus:border-primary text-neutral-200 h-11"
                />
                <p className="text-[10px] text-neutral-600">Terima email rincian jawaban real-time ke email Anda setiap ada tanggapan masuk.</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom-success-msg" className="text-neutral-400 text-xs font-semibold">Pesan Sukses Kustom setelah Kirim</Label>
              <Textarea
                id="custom-success-msg"
                placeholder="Tulis instruksi setelah berhasil kirim tanggapan (misal: link grup whatsapp pendaftar)..."
                value={customSuccessMessage}
                onChange={(e) => setCustomSuccessMessage(e.target.value)}
                className="bg-neutral-950/60 border-neutral-850 focus:border-primary text-neutral-200 min-h-[80px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="redirect-url" className="text-neutral-400 text-xs font-semibold">Mengarahkan Otomatis (Redirect URL)</Label>
              <Input
                id="redirect-url"
                type="url"
                placeholder="https://e-commerce-anda.com/terima-kasih"
                value={redirectUrl}
                onChange={(e) => setRedirectUrl(e.target.value)}
                className="bg-neutral-950/60 border-neutral-850 focus:border-primary text-neutral-200 h-11"
              />
              <p className="text-[10px] text-neutral-600">Jika diisi, pengguna dialihkan otomatis ke URL ini dalam 3 detik setelah submit.</p>
            </div>
          </CardContent>
        </Card>

        {/* Dynamic Fields List */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-neutral-250 flex items-center">
            Struktur Input Pertanyaan
            <span className="ml-2.5 px-2 py-0.5 rounded-md text-[10px] bg-neutral-900 border border-neutral-850 text-neutral-450 font-mono">
              {fields.length} Pertanyaan
            </span>
          </h2>

          {fields.length === 0 ? (
            <div className="border border-dashed border-neutral-900 rounded-xl p-16 text-center flex flex-col items-center justify-center space-y-3 bg-neutral-950/15">
              <p className="text-neutral-500 text-sm">Belum ada kolom pertanyaan. Gunakan dock floating menu di bawah untuk menambah kolom.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {fields.map((field, index) => (
                <Card key={field.id} className="bg-neutral-900/10 border-neutral-900 relative overflow-hidden group hover:border-neutral-850 transition-all duration-300">
                  <div className="absolute left-0 top-0 h-full w-[3px] bg-primary/30 group-hover:bg-primary transition-colors" />
                  
                  <CardHeader className="py-3 px-6 flex flex-row items-center justify-between border-b border-neutral-900/60 bg-neutral-950/20">
                    <div className="flex items-center space-x-3">
                      <span className="text-xs text-neutral-500 font-mono font-semibold">#{index + 1}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center bg-neutral-900 border border-neutral-850 px-2 py-0.5 rounded">
                        {field.type === "text" && <FileText className="h-3 w-3 mr-1 text-primary" />}
                        {field.type === "textarea" && <AlignLeft className="h-3 w-3 mr-1 text-primary" />}
                        {field.type === "select" && <List className="h-3 w-3 mr-1 text-primary" />}
                        {field.type === "radio" && <Radio className="h-3 w-3 mr-1 text-primary" />}
                        {field.type === "file" && <Upload className="h-3 w-3 mr-1 text-primary" />}
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
                        className="h-7 w-7 text-neutral-550 hover:text-neutral-200 disabled:opacity-20 transition-colors"
                      >
                        <MoveUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleMoveField(index, "down")}
                        disabled={index === fields.length - 1}
                        className="h-7 w-7 text-neutral-550 hover:text-neutral-200 disabled:opacity-20 transition-colors"
                      >
                        <MoveDown className="h-3.5 w-3.5" />
                      </Button>
                      <span className="text-neutral-700 text-xs px-0.5">|</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleRemoveField(field.id)}
                        className="h-7 w-7 text-neutral-550 hover:text-red-400 hover:bg-red-950/20 transition-all"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                      {/* Label Input */}
                      <div className="md:col-span-8 space-y-2">
                        <Label htmlFor={`label-${field.id}`} className="text-neutral-450 text-[11px] font-semibold">Judul Pertanyaan / Label Input</Label>
                        <Input
                          id={`label-${field.id}`}
                          placeholder="Masukkan teks pertanyaan Anda..."
                          value={field.label}
                          onChange={(e) => handleFieldChange(field.id, { label: e.target.value })}
                          className="bg-neutral-950/45 border-neutral-850 focus:border-primary text-neutral-200 h-9"
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
                          className="border-neutral-700 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                        />
                        <Label htmlFor={`req-${field.id}`} className="text-neutral-300 text-xs font-semibold cursor-pointer">
                          Wajib Diisi (Required)
                        </Label>
                      </div>
                    </div>

                    {/* File Types Selection */}
                    {field.type === "file" && (
                      <div className="border-t border-neutral-900/60 pt-4 space-y-2">
                        <Label className="text-neutral-450 text-[11px] font-semibold">Tipe Berkas yang Diizinkan</Label>
                        <Select
                          value={field.fileTypes || "*"}
                          onValueChange={(val) => handleFieldChange(field.id, { fileTypes: val ?? undefined })}
                        >
                          <SelectTrigger className="bg-neutral-950/45 border-neutral-850 text-neutral-200 max-w-sm h-9">
                            <SelectValue placeholder="Pilih tipe berkas..." />
                          </SelectTrigger>
                          <SelectContent className="bg-neutral-900 border-neutral-800 text-neutral-200">
                            <SelectItem value="*">Semua Berkas (*)</SelectItem>
                            <SelectItem value="image/*">Hanya Gambar (PNG, JPG, WebP, GIF)</SelectItem>
                            <SelectItem value="audio/*">Hanya Audio (MP3, WAV, OGG)</SelectItem>
                            <SelectItem value=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx">Hanya Dokumen (PDF, Word, Excel, PPT)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Options configuration for Select/Radio types */}
                    {(field.type === "select" || field.type === "radio") && field.options && (
                      <div className="border-t border-neutral-900/60 pt-4 space-y-3">
                        <Label className="text-neutral-450 text-[11px] font-semibold">Daftar Opsi Pilihan</Label>
                        <div className="space-y-2">
                          {field.options.map((option, optIdx) => (
                            <div key={optIdx} className="flex items-center space-x-2">
                              <span className="text-[10px] text-neutral-500 font-semibold font-mono w-14 shrink-0">Opsi {optIdx + 1}</span>
                              <Input
                                value={option}
                                onChange={(e) => handleOptionChange(field.id, optIdx, e.target.value)}
                                className="bg-neutral-950/40 border-neutral-850 focus:border-primary text-neutral-200 max-w-md h-8 text-xs"
                              />
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleRemoveOption(field.id, optIdx)}
                                className="h-8 w-8 text-neutral-550 hover:text-red-400"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ))}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAddOption(field.id)}
                          className="border-neutral-850 text-neutral-400 hover:text-neutral-250 mt-1 h-8 text-xs"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Tambah Opsi
                        </Button>
                      </div>
                    )}

                    {/* Conditional Logic (Show only if there are previous fields) */}
                    {index > 0 && (
                      <div className="border-t border-neutral-900/60 pt-4 space-y-3">
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
                            className="border-neutral-700 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                          />
                          <Label htmlFor={`cond-chk-${field.id}`} className="text-neutral-350 text-xs font-semibold cursor-pointer">
                            Terapkan Logika Percabangan (Conditional Show)
                          </Label>
                        </div>

                        {field.conditionFieldId && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-6 pt-1">
                            <div className="space-y-1.5">
                              <Label className="text-neutral-455 text-[10px] font-semibold">Tampilkan Hanya Jika Pertanyaan:</Label>
                              <Select
                                value={field.conditionFieldId}
                                onValueChange={(val) => {
                                  const selectedField = fields.find(f => f.id === val);
                                  const defaultVal = selectedField?.options && selectedField.options.length > 0 ? selectedField.options[0] : "Ya";
                                  handleFieldChange(field.id, { conditionFieldId: val || undefined, conditionValue: defaultVal || undefined });
                                }}
                              >
                                <SelectTrigger className="bg-neutral-950/45 border-neutral-850 text-neutral-200 h-9">
                                  <SelectValue placeholder="Pilih pertanyaan..." />
                                </SelectTrigger>
                                <SelectContent className="bg-neutral-900 border-neutral-800 text-neutral-200">
                                  {fields.slice(0, index).map((pf) => (
                                    <SelectItem key={pf.id} value={pf.id}>
                                      {pf.label || `[Pertanyaan #${fields.indexOf(pf) + 1}]`}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-1.5">
                              <Label className="text-neutral-455 text-[10px] font-semibold">Bernilai Sama Dengan:</Label>
                              {(() => {
                                const triggerField = fields.find(f => f.id === field.conditionFieldId);
                                if (triggerField && (triggerField.type === "select" || triggerField.type === "radio") && triggerField.options) {
                                  return (
                                    <Select
                                      value={field.conditionValue || ""}
                                      onValueChange={(val) => handleFieldChange(field.id, { conditionValue: val || undefined })}
                                    >
                                      <SelectTrigger className="bg-neutral-950/45 border-neutral-850 text-neutral-200 h-9">
                                        <SelectValue placeholder="Pilih nilai..." />
                                      </SelectTrigger>
                                      <SelectContent className="bg-neutral-900 border-neutral-800 text-neutral-200">
                                        {triggerField.options.map((opt, idx) => (
                                          <SelectItem key={idx} value={opt}>
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
                                    className="bg-neutral-950/45 border-neutral-850 text-neutral-200 h-9"
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
          <div className="border border-neutral-850/80 bg-neutral-900/85 backdrop-blur-xl rounded-2xl p-3 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-primary/5">
            <span className="text-[10px] text-neutral-400 font-extrabold uppercase tracking-wider pl-1.5 shrink-0 flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-primary" />
              Tambah Input:
            </span>
            <div className="flex flex-wrap gap-1.5 justify-center">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAddField("text")}
                className="border-neutral-800 bg-neutral-950/40 text-neutral-350 hover:bg-primary hover:text-primary-foreground text-[11px] h-8 rounded-lg transition-all"
              >
                <FileText className="h-3 w-3 mr-1 text-primary group-hover:text-inherit" />
                Teks Pendek
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAddField("textarea")}
                className="border-neutral-800 bg-neutral-950/40 text-neutral-350 hover:bg-primary hover:text-primary-foreground text-[11px] h-8 rounded-lg transition-all"
              >
                <AlignLeft className="h-3 w-3 mr-1 text-primary group-hover:text-inherit" />
                Paragraf
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAddField("select")}
                className="border-neutral-800 bg-neutral-950/40 text-neutral-350 hover:bg-primary hover:text-primary-foreground text-[11px] h-8 rounded-lg transition-all"
              >
                <List className="h-3 w-3 mr-1 text-primary group-hover:text-inherit" />
                Dropdown
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAddField("radio")}
                className="border-neutral-800 bg-neutral-950/40 text-neutral-355 hover:bg-primary hover:text-primary-foreground text-[11px] h-8 rounded-lg transition-all"
              >
                <Radio className="h-3 w-3 mr-1 text-primary group-hover:text-inherit" />
                Pilihan Ganda
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAddField("file")}
                className="border-neutral-800 bg-neutral-950/40 text-neutral-355 hover:bg-primary hover:text-primary-foreground text-[11px] h-8 rounded-lg transition-all"
              >
                <Upload className="h-3 w-3 mr-1 text-primary group-hover:text-inherit" />
                Unggah Berkas
              </Button>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}

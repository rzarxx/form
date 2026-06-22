"use client";

import React, { useEffect, useState, useTransition, use } from "react";
import { getPublicFormAction, submitResponseAction, checkIpSubmissionAction } from "@/app/actions/forms";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { compressImage } from "@/lib/image-compress";
import { 
  Loader2, 
  CheckCircle2, 
  Upload, 
  FileText, 
  AlertCircle,
  Paperclip
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

interface FormSchema {
  id: string;
  title: string;
  description: string;
  fields: FieldSchema[];
  banner_url?: string;
  is_active?: boolean;
  max_responses?: number;
  custom_success_message?: string;
  redirect_url?: string;
  expiry_date?: string;
}

export default function PublicFormPage({ params }: { params: Promise<{ id: string }> }) {
  // Unwrap params using React.use()
  const resolvedParams = use(params);
  const formId = resolvedParams.id;

  const [form, setForm] = useState<FormSchema | null>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // File Upload states
  const [uploadingFields, setUploadingFields] = useState<Record<string, boolean>>({});
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, { name: string; url: string }>>({});
  
  // Anti-spam states
  const [honeypot, setHoneypot] = useState("");

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isAlreadySubmitted, setIsAlreadySubmitted] = useState(false);
  const [isLoadingForm, setIsLoadingForm] = useState(true);
  const [isPending, startTransition] = useTransition();

  const fields: FieldSchema[] = form
    ? (Array.isArray(form.fields)
      ? form.fields
      : typeof form.fields === "string"
        ? JSON.parse(form.fields)
        : [])
    : [];

  useEffect(() => {
    const fetchForm = async () => {
      setIsLoadingForm(true);
      const result = await getPublicFormAction(formId);
      if (result.success && result.data) {
        const fetchedForm = result.data as FormSchema;
        setForm(fetchedForm);
        
        // Check if response is limited to 1 per IP and user has already submitted
        if (fetchedForm.is_active && fetchedForm.max_responses === 1) {
          const checkRes = await checkIpSubmissionAction(formId);
          if (checkRes.success && checkRes.submitted) {
            setIsAlreadySubmitted(true);
          }
        }
      } else {
        toast.error(result.error || "Formulir tidak ditemukan.");
      }
      setIsLoadingForm(false);
    };

    fetchForm();
  }, [formId]);

  // Handle auto redirect if configured
  useEffect(() => {
    if (isSubmitted && form?.redirect_url) {
      const timer = setTimeout(() => {
        window.location.href = form.redirect_url!;
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isSubmitted, form]);

  // Helper to determine if a field is visible based on conditional logic
  const isFieldVisible = (fieldId: string): boolean => {
    const field = fields.find((f) => f.id === fieldId);
    if (!field) return false;
    if (!field.conditionFieldId) return true;

    // Recursive check if the parent trigger field itself is visible
    const isParentVisible = isFieldVisible(field.conditionFieldId);
    if (!isParentVisible) return false;

    // Check if parent value matches the trigger condition value
    const parentValue = answers[field.conditionFieldId];
    return parentValue === field.conditionValue;
  };

  const handleInputChange = (fieldId: string, value: any) => {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));
    // Clear error for this field
    if (errors[fieldId]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    }
  };

  const handleFileUpload = async (fieldId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const field = fields.find((f) => f.id === fieldId);
    if (!field) return;

    // Client-side size validation (5MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      toast.error("Ukuran berkas maksimal adalah 5MB!");
      e.target.value = "";
      return;
    }

    // Validate file type on the client side
    const fileTypes = field.fileTypes || "*";
    if (fileTypes !== "*") {
      const fileExt = `.${file.name.split(".").pop()?.toLowerCase()}`;
      
      if (fileTypes === "image/*" && !file.type.startsWith("image/")) {
        toast.error("Hanya berkas gambar (PNG, JPG, WebP, GIF) yang diizinkan!");
        e.target.value = "";
        return;
      }
      
      if (fileTypes === "audio/*" && !file.type.startsWith("audio/")) {
        toast.error("Hanya berkas audio (MP3, WAV, OGG) yang diizinkan!");
        e.target.value = "";
        return;
      }
      
      if (fileTypes.includes(".") && !fileTypes.toLowerCase().split(",").includes(fileExt)) {
        const readableExtensions = fileTypes.replace(/\./g, "").toUpperCase();
        toast.error(`Hanya dokumen dengan ekstensi (${readableExtensions}) yang diizinkan!`);
        e.target.value = "";
        return;
      }
    }

    // Compress the image before uploading if applicable
    let fileToUpload = file;
    if (file.type.startsWith("image/") && file.type !== "image/gif") {
      try {
        const loadingToast = toast.loading("Mengompresi gambar untuk menghemat storage...");
        fileToUpload = await compressImage(file);
        toast.dismiss(loadingToast);
      } catch (compressErr) {
        console.error("Compression failed, uploading original:", compressErr);
      }
    }

    // Use XHR to upload files with a progress bar
    setUploadingFields((prev) => ({ ...prev, [fieldId]: true }));
    setUploadProgress((prev) => ({ ...prev, [fieldId]: 0 }));
    toast.info(`Mengunggah ${fileToUpload.name}...`);

    const formData = new FormData();
    formData.append("file", fileToUpload);

    try {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `/api/upload?formId=${formId}&fieldId=${fieldId}`, true);

      // Track progress
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          setUploadProgress((prev) => ({ ...prev, [fieldId]: percentComplete }));
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            if (data.url) {
              setUploadedFiles((prev) => ({
                ...prev,
                [fieldId]: { name: file.name, url: data.url }
              }));
              handleInputChange(fieldId, data.url);
              toast.success(`Berkas ${file.name} berhasil diunggah.`);
            } else {
              toast.error(data.error || "Gagal mengunggah berkas.");
            }
          } catch {
            toast.error("Gagal mengurai respon server.");
          }
        } else {
          try {
            const data = JSON.parse(xhr.responseText);
            toast.error(data.error || "Gagal mengunggah berkas.");
          } catch {
            toast.error(`Gagal mengunggah berkas (Status ${xhr.status}).`);
          }
        }
        setUploadingFields((prev) => ({ ...prev, [fieldId]: false }));
      };

      xhr.onerror = () => {
        toast.error("Terjadi kesalahan koneksi saat mengunggah.");
        setUploadingFields((prev) => ({ ...prev, [fieldId]: false }));
      };

      xhr.send(formData);
    } catch (err) {
      console.error("Upload setup error:", err);
      toast.error("Terjadi kesalahan teknis saat mengunggah.");
      setUploadingFields((prev) => ({ ...prev, [fieldId]: false }));
    }
  };

  const validateForm = (): boolean => {
    if (!form) return false;
    
    const newErrors: Record<string, string> = {};
    
    fields.forEach((field) => {
      // Bypasses validation if field is hidden by conditional logic
      if (!isFieldVisible(field.id)) return;

      const val = answers[field.id];
      
      // 1. Required check
      if (field.required) {
        if (val === undefined || val === null || (typeof val === "string" && !val.trim())) {
          newErrors[field.id] = "Pertanyaan ini wajib diisi.";
          return;
        }
      }

      // 2. Email format check (if label contains 'email' case-insensitive)
      if (val && typeof val === "string" && field.label.toLowerCase().includes("email")) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(val.trim())) {
          newErrors[field.id] = "Format alamat email tidak valid.";
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if any files are currently uploading
    const isUploadingAny = Object.values(uploadingFields).some(Boolean);
    if (isUploadingAny) {
      toast.warning("Mohon tunggu hingga proses unggah berkas selesai.");
      return;
    }

    // Honeypot detection
    if (honeypot) {
      console.warn("Honeypot triggered. Silent reject.");
      setIsSubmitted(true);
      toast.success("Tanggapan berhasil dikirim!");
      return;
    }

    if (!validateForm()) {
      toast.error("Mohon periksa kembali isian formulir Anda.");
      
      // Scroll to the first error element
      const firstErrorId = Object.keys(errors)[0];
      if (firstErrorId) {
        document.getElementById(`container-${firstErrorId}`)?.scrollIntoView({ behavior: "smooth" });
      }
      return;
    }

    // Clean answers to ONLY send values for visible fields
    const visibleAnswers: Record<string, any> = {};
    fields.forEach((field) => {
      if (isFieldVisible(field.id) && answers[field.id] !== undefined) {
        visibleAnswers[field.id] = answers[field.id];
      }
    });

    startTransition(async () => {
      const result = await submitResponseAction(formId, visibleAnswers);
      if (result.success) {
        setIsSubmitted(true);
        toast.success("Tanggapan berhasil dikirim!");
      } else {
        toast.error(result.error || "Gagal mengirim tanggapan.");
      }
    });
  };

  if (isLoadingForm) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
        <p className="text-sm text-neutral-400">Memuat formulir...</p>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md border-neutral-900 bg-neutral-900/50 text-center p-6">
          <CardHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-950/30 border border-red-900/50 text-red-400 mb-4">
              <AlertCircle className="h-6 w-6" />
            </div>
            <CardTitle className="text-xl text-neutral-200">Formulir Tidak Ditemukan</CardTitle>
            <CardDescription className="text-neutral-500 mt-2">
              Tautan yang Anda ikuti mungkin rusak, atau formulir ini telah dihapus oleh pengelolanya.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Check Expiry Date / Deadline
  const isExpired = form.expiry_date ? new Date() > new Date(form.expiry_date) : false;
  if (isExpired || !form.is_active) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md border-neutral-900 bg-neutral-900/50 text-center p-6 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-amber-500" />
          <CardHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-950/30 border border-amber-900/50 text-amber-500 mb-4">
              <AlertCircle className="h-6 w-6" />
            </div>
            <CardTitle className="text-xl font-bold text-neutral-200">Formulir Ditutup</CardTitle>
            <CardDescription className="text-neutral-400 mt-2 text-sm leading-relaxed">
              {isExpired ? (
                <>
                  Formulir <strong className="text-neutral-300">"{form.title}"</strong> sudah melewati batas waktu pengisian ({new Date(form.expiry_date!).toLocaleString("id-ID")}) dan tidak menerima tanggapan baru.
                </>
              ) : (
                <>
                  Formulir <strong className="text-neutral-300">"{form.title}"</strong> sudah ditutup oleh pemiliknya dan tidak menerima tanggapan baru.
                </>
              )}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isAlreadySubmitted) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md border-neutral-900 bg-neutral-900/50 text-center p-6 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-red-500" />
          <CardHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-950/30 border border-red-900/50 text-red-550 mb-4">
              <AlertCircle className="h-6 w-6" />
            </div>
            <CardTitle className="text-xl font-bold text-neutral-200">Tanggapan Dibatasi</CardTitle>
            <CardDescription className="text-neutral-400 mt-2 text-sm leading-relaxed">
              Anda sudah mengirimkan tanggapan untuk formulir <strong className="text-neutral-350">"{form.title}"</strong> sebelumnya. Formulir ini dikonfigurasi untuk hanya menerima 1 tanggapan per orang (IP Address).
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-xl border-neutral-900 bg-neutral-900/40 backdrop-blur shadow-2xl relative overflow-hidden text-center py-8 px-6 transition-all duration-305">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-emerald-500/20 via-emerald-500 to-emerald-500/20" />
          <CardHeader className="space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-950/40 border border-emerald-900/60 text-emerald-450">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight text-neutral-100">
              Tanggapan Dikirim!
            </CardTitle>
            <CardDescription className="text-neutral-400 text-sm max-w-md mx-auto whitespace-pre-line leading-relaxed">
              {form.custom_success_message || `Terima kasih, tanggapan Anda untuk formulir "${form.title}" telah berhasil disimpan di database kami.`}
            </CardDescription>
          </CardHeader>
          
          {form.redirect_url && (
            <div className="text-xs text-neutral-500 pt-2 flex items-center justify-center space-x-1.5 animate-pulse">
              <Loader2 className="h-3 w-3 animate-spin text-primary" />
              <span>Mengalihkan Anda ke tautan luar dalam beberapa detik...</span>
            </div>
          )}

          {!form.redirect_url && (
            <CardFooter className="flex justify-center pt-6">
              <Button
                onClick={() => {
                  setAnswers({});
                  setUploadedFiles({});
                  setIsSubmitted(false);
                }}
                className="bg-neutral-900 border border-neutral-800 text-neutral-300 hover:bg-neutral-800"
              >
                Kirim Tanggapan Lain
              </Button>
            </CardFooter>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col items-center py-12 px-4 sm:px-6">
      {/* Background decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[250px] bg-gradient-to-b from-primary/5 to-transparent rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-2xl space-y-6 relative">
        
        {/* Form Banner */}
        {form.banner_url && (
          <div className="w-full h-44 sm:h-60 rounded-xl border border-neutral-900 overflow-hidden relative shadow-lg">
            <img src={form.banner_url} alt="Form Banner" className="w-full h-full object-cover" />
          </div>
        )}

        {/* Form Meta Header */}
        <Card className="bg-neutral-900/45 border-neutral-900 shadow-xl overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-primary/40 via-primary to-primary/40" />
          <CardHeader className="pt-8 pb-6">
            <CardTitle className="text-2xl font-bold tracking-tight text-neutral-100 sm:text-3xl">
              {form.title}
            </CardTitle>
            {form.description && (
              <CardDescription className="text-neutral-400 text-sm leading-relaxed whitespace-pre-line mt-3">
                {form.description}
              </CardDescription>
            )}
          </CardHeader>
        </Card>

        {/* Form Input fields */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Honeypot field (Anti-spam bot protection) */}
          <div style={{ display: "none" }} aria-hidden="true">
            <label htmlFor="website">Website</label>
            <input
              id="website"
              type="text"
              name="website"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
            />
          </div>

          {fields.map((field) => {
            // Hide field if it does not satisfy conditional logic
            if (!isFieldVisible(field.id)) return null;

            return (
              <Card 
                key={field.id} 
                id={`container-${field.id}`}
                className={`bg-neutral-900/30 border-neutral-900 transition-all duration-300 ${
                  errors[field.id] ? "border-red-900/50 bg-red-950/5" : "hover:border-neutral-850"
                }`}
              >
                <CardContent className="p-6 space-y-3">
                  <div className="flex items-center space-x-1.5">
                    <Label className="text-neutral-200 text-sm font-semibold tracking-wide">
                      {field.label}
                    </Label>
                    {field.required && (
                      <span className="text-red-500 font-bold" title="Wajib Diisi">*</span>
                    )}
                  </div>

                  {/* Text input */}
                  {field.type === "text" && (
                    <Input
                      type="text"
                      value={answers[field.id] || ""}
                      onChange={(e) => handleInputChange(field.id, e.target.value)}
                      disabled={isPending}
                      className="bg-neutral-950/80 border-neutral-850 text-neutral-200 focus:border-primary focus:ring-1 focus:ring-primary/50 h-10"
                      placeholder="Jawaban Anda..."
                    />
                  )}

                  {/* Textarea paragraph input */}
                  {field.type === "textarea" && (
                    <Textarea
                      value={answers[field.id] || ""}
                      onChange={(e) => handleInputChange(field.id, e.target.value)}
                      disabled={isPending}
                      className="bg-neutral-950/80 border-neutral-850 text-neutral-200 focus:border-primary focus:ring-1 focus:ring-primary/50 min-h-[100px]"
                      placeholder="Jawaban Anda..."
                    />
                  )}

                  {/* Dropdown Select input */}
                  {field.type === "select" && field.options && (
                    <Select
                      value={answers[field.id] || ""}
                      onValueChange={(val) => handleInputChange(field.id, val)}
                      disabled={isPending}
                    >
                      <SelectTrigger className="bg-neutral-950/80 border-neutral-850 text-neutral-200 focus:ring-1 focus:ring-primary/50 h-10">
                        <SelectValue placeholder="Pilih salah satu..." />
                      </SelectTrigger>
                      <SelectContent className="bg-neutral-900 border-neutral-800 text-neutral-200">
                        {field.options.map((opt, idx) => (
                          <SelectItem key={idx} value={opt} className="focus:bg-neutral-850 focus:text-neutral-100">
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {/* Radio choice input */}
                  {field.type === "radio" && field.options && (
                    <div className="grid grid-cols-1 gap-2 pt-1">
                      {field.options.map((opt, idx) => {
                        const isSelected = answers[field.id] === opt;
                        return (
                          <div
                            key={idx}
                            onClick={() => !isPending && handleInputChange(field.id, opt)}
                            className={`flex items-center px-4 py-3 rounded-lg border border-neutral-850 bg-neutral-950/40 cursor-pointer transition-all duration-150 hover:border-neutral-750 ${
                              isSelected ? "border-primary/50 bg-primary/5 text-primary-foreground" : ""
                            }`}
                          >
                            <div className="h-4 w-4 rounded-full border border-neutral-600 flex items-center justify-center mr-3 shrink-0">
                              {isSelected && (
                                <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                              )}
                            </div>
                            <span className="text-sm text-neutral-200">{opt}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* File/Image Upload input */}
                  {field.type === "file" && (
                    <div className="space-y-3 pt-1">
                      {!uploadedFiles[field.id] ? (
                        <div className="relative border border-dashed border-neutral-800 rounded-lg p-5 bg-neutral-950/20 text-center flex flex-col items-center justify-center space-y-2 group hover:border-neutral-700 transition-colors">
                          <input
                            id={`file-input-${field.id}`}
                            type="file"
                            accept={field.fileTypes || "*"}
                            onChange={(e) => handleFileUpload(field.id, e)}
                            disabled={isPending || uploadingFields[field.id]}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          <div className="h-9 w-9 rounded-full bg-neutral-900 flex items-center justify-center border border-neutral-800 text-neutral-450 group-hover:text-neutral-200">
                            {uploadingFields[field.id] ? (
                              <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            ) : (
                              <Upload className="h-4 w-4" />
                            )}
                          </div>
                          <div>
                            <p className="text-xs text-neutral-300 font-medium">
                              {uploadingFields[field.id] ? "Mengunggah..." : "Klik atau seret berkas ke sini"}
                            </p>
                            <p className="text-[10px] text-neutral-500 mt-0.5">
                              {field.fileTypes === "image/*" && "Hanya Gambar (PNG, JPG, WebP, GIF) (Maks. 5MB)"}
                              {field.fileTypes === "audio/*" && "Hanya Audio (MP3, WAV, OGG) (Maks. 5MB)"}
                              {field.fileTypes && field.fileTypes.includes(".") && `Hanya Dokumen (${field.fileTypes.replace(/\./g, "").toUpperCase()}) (Maks. 5MB)`}
                              {(!field.fileTypes || field.fileTypes === "*") && "Semua Format Berkas (Maks. 5MB)"}
                            </p>
                          </div>

                          {/* Progress indicator */}
                          {uploadingFields[field.id] && (
                            <div className="w-full max-w-xs mt-2">
                              <div className="h-1.5 w-full bg-neutral-900 rounded-full overflow-hidden border border-neutral-850">
                                <div 
                                  className="h-full bg-primary transition-all duration-150 rounded-full" 
                                  style={{ width: `${uploadProgress[field.id] || 0}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-neutral-450 mt-1 block text-center">
                                Mengunggah: {uploadProgress[field.id] || 0}%
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-between p-3 rounded-lg border border-neutral-800 bg-neutral-950/60 text-xs">
                          <div className="flex items-center space-x-2.5 truncate max-w-sm">
                            <Paperclip className="h-4 w-4 text-primary shrink-0" />
                            <span className="text-neutral-200 font-medium truncate">
                              {uploadedFiles[field.id].name}
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setUploadedFiles((prev) => {
                                const next = { ...prev };
                                delete next[field.id];
                                return next;
                              });
                              handleInputChange(field.id, "");
                            }}
                            className="h-7 px-2 text-neutral-400 hover:text-red-400 hover:bg-transparent"
                          >
                            Ganti File
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Individual Field Validation Error */}
                  {errors[field.id] && (
                    <p className="text-xs text-red-500 font-medium flex items-center pt-1">
                      <AlertCircle className="h-3.5 w-3.5 mr-1 shrink-0" />
                      {errors[field.id]}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {/* Form Submit Button */}
          <div className="flex justify-between items-center pt-2">
            <span className="text-[11px] text-neutral-500">
              Personal Form Builder aman dan terlindungi.
            </span>
            <Button
              type="submit"
              disabled={isPending || Object.values(uploadingFields).some(Boolean)}
              className="bg-primary text-primary-foreground hover:bg-primary/95 font-medium px-8 h-11 shadow-lg hover:shadow-primary/10"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Mengirim...
                </>
              ) : (
                "Submit"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

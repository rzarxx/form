"use client";

import React, { useEffect, useState, useTransition, use } from "react";
import { getPublicFormAction, submitResponseAction, checkIpSubmissionAction, verifyFormPasswordAction } from "@/app/actions/forms";
import { getPremiumPricingAndChannelsAction, createPaymentAction, checkTransactionStatusAction } from "@/app/actions/tripay";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { compressImage } from "@/lib/image-compress";
import { 
  AlertCircle, 
  AlertTriangle, 
  Lock, 
  ArrowRight, 
  CloudUpload, 
  CheckCircle2, 
  Loader2, 
  Printer, 
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
  validationType?: "none" | "number" | "phone" | "regex";
  validationMin?: number;
  validationMax?: number;
  validationPattern?: string;
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
  limit_one_per_ip?: boolean;
  max_total_responses?: number;
  enable_turnstile?: boolean;
  has_password?: boolean;
  turnstile_site_key?: string;
  is_paid_form?: boolean;
  form_price?: number;
  form_payment_description?: string;
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

  // Autosave and Loading states
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [responseId, setResponseId] = useState<number | undefined>(undefined);
  const [isAlreadySubmitted, setIsAlreadySubmitted] = useState(false);
  const [isLoadingForm, setIsLoadingForm] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Password Verification state
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");

  // Paid Form Checkout States
  const [isCheckingOutPaidForm, setIsCheckingOutPaidForm] = useState(false);
  const [paidFormPrice, setPaidFormPrice] = useState(0);
  const [paidFormTitle, setPaidFormTitle] = useState("");
  const [paidFormDescription, setPaidFormDescription] = useState("");
  const [payerName, setPayerName] = useState("");
  const [payerEmail, setPayerEmail] = useState("");
  const [paymentChannels, setPaymentChannels] = useState<any[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string>("");
  const [pendingAnswers, setPendingAnswers] = useState<Record<string, any>>({});
  
  const [checkoutData, setCheckoutData] = useState<{
    reference: string;
    payCode: string | null;
    qrUrl: string | null;
    qrString: string | null;
    instructions: any[];
  } | null>(null);
  
  const [paymentStatus, setPaymentStatus] = useState<string>("unpaid");

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
        if (fetchedForm.is_active && (fetchedForm.limit_one_per_ip === true || fetchedForm.max_responses === 1)) {
          const checkRes = await checkIpSubmissionAction(formId);
          if (checkRes.success && checkRes.submitted) {
            setIsAlreadySubmitted(true);
          }
        }

        // Load draft answers from localStorage if exists
        if (typeof window !== "undefined") {
          const draftKey = `form_draft_${formId}`;
          const savedDraft = localStorage.getItem(draftKey);
          if (savedDraft) {
            try {
              const parsedDraft = JSON.parse(savedDraft);
              if (parsedDraft && typeof parsedDraft === "object") {
                setAnswers(parsedDraft);
                
                // If there are uploaded files in the draft, we need to populate uploadedFiles state as well
                const fieldsArr = Array.isArray(fetchedForm.fields)
                  ? fetchedForm.fields
                  : typeof fetchedForm.fields === "string"
                    ? JSON.parse(fetchedForm.fields)
                    : [];
                
                const filesState: Record<string, { name: string; url: string }> = {};
                Object.entries(parsedDraft).forEach(([fId, val]) => {
                  const field = fieldsArr.find((f: any) => f.id === fId);
                  if (field && field.type === "file" && typeof val === "string" && val.trim()) {
                    const filename = val.split("/").pop() || "Berkas";
                    filesState[fId] = { name: filename, url: val };
                  }
                });
                if (Object.keys(filesState).length > 0) {
                  setUploadedFiles(filesState);
                }
                
                toast.success("Draf isian sebelumnya berhasil dipulihkan otomatis.");
              }
            } catch (e) {
              console.error("Gagal memuat draf dari localStorage", e);
            }
          }
        }
      } else {
        toast.error(result.error || "Formulir tidak ditemukan.");
      }
      setIsLoadingForm(false);
    };

    fetchForm();
  }, [formId]);

  // Load payment channels on mount
  useEffect(() => {
    async function loadChannels() {
      try {
        const res = await getPremiumPricingAndChannelsAction();
        if (res.success && res.channels) {
          setPaymentChannels(res.channels);
          if (res.channels.length > 0) {
            setSelectedChannel(res.channels[0].code);
          }
        }
      } catch (err) {
        console.error("Gagal memuat metode pembayaran:", err);
      }
    }
    loadChannels();
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
            toast.success("Pembayaran Lunas! Tanggapan Anda telah resmi disimpan. Terima kasih! 🎉");
            setIsSubmitted(true);
            setResponseId(res.responseId);
            if (typeof window !== "undefined") {
              localStorage.removeItem(`form_draft_${formId}`);
            }
            clearInterval(interval);
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
  }, [checkoutData, paymentStatus, formId]);

  // Turnstile script loading is handled dynamically inside TurnstileWidget component below

  // Save answers to localStorage on change (Autosave)
  useEffect(() => {
    if (formId && Object.keys(answers).length > 0 && !isSubmitted) {
      const draftKey = `form_draft_${formId}`;
      localStorage.setItem(draftKey, JSON.stringify(answers));
      setLastSavedTime(new Date());
    }
  }, [answers, formId, isSubmitted]);

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
          return;
        }
      }

      // 3. Custom type validations for text field type
      if (val && typeof val === "string" && field.type === "text") {
        if (field.validationType === "number") {
          const num = Number(val);
          if (isNaN(num)) {
            newErrors[field.id] = "Kolom ini harus diisi dengan angka.";
          } else {
            if (field.validationMin !== undefined && num < field.validationMin) {
              newErrors[field.id] = `Nilai minimal adalah ${field.validationMin}.`;
            }
            if (field.validationMax !== undefined && num > field.validationMax) {
              newErrors[field.id] = `Nilai maksimal adalah ${field.validationMax}.`;
            }
          }
        } else if (field.validationType === "phone") {
          const phoneRegex = /^[+]*[0-9 -()]{7,16}$/;
          if (!phoneRegex.test(val.trim())) {
            newErrors[field.id] = "Format nomor telepon tidak valid.";
          }
        } else if (field.validationType === "regex" && field.validationPattern) {
          try {
            const regex = new RegExp(field.validationPattern);
            if (!regex.test(val)) {
              newErrors[field.id] = "Format input tidak sesuai ketentuan.";
            }
          } catch (e) {
            console.error("Regex validation compile error:", e);
          }
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

    // Get Cloudflare Turnstile Captcha response
    const turnstileToken = (document.getElementsByName("cf-turnstile-response")[0] as HTMLInputElement)?.value;

    startTransition(async () => {
      const result = await submitResponseAction(formId, visibleAnswers, passwordInput || undefined, turnstileToken || undefined);
      if (result.success) {
        if (result.requiresPayment) {
          setIsCheckingOutPaidForm(true);
          setPaidFormPrice(result.formPrice || 0);
          setPaidFormTitle(result.formTitle || "");
          setPaidFormDescription(result.formPaymentDescription || "");
          setPendingAnswers(visibleAnswers);
          toast.info("Formulir mewajibkan pembayaran. Silakan selesaikan transaksi.");
        } else {
          setResponseId(result.responseId);
          setIsSubmitted(true);
          if (typeof window !== "undefined") {
            localStorage.removeItem(`form_draft_${formId}`);
          }
          toast.success("Tanggapan berhasil dikirim!");
        }
      } else {
        toast.error(result.error || "Gagal mengirim tanggapan.");
      }
    });
  };

  const handleFormPayment = () => {
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
          type: "form_payment",
          method: selectedChannel,
          payerName,
          payerEmail,
          formId,
          formResponseAnswers: pendingAnswers,
        });

        if (res.success && res.reference) {
          toast.success("Tagihan pembayaran berhasil dibuat!");
          setCheckoutData({
            reference: res.reference,
            payCode: res.payCode || null,
            qrUrl: res.qrUrl || null,
            qrString: res.qrString || null,
            instructions: res.instructions || [],
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

  const handleResetFormPayment = () => {
    setCheckoutData(null);
    setPaymentStatus("unpaid");
  };

  if (isLoadingForm) {
    return (
      <div className="min-h-screen bg-gradient-to-tr from-slate-50 via-indigo-50/30 to-blue-50/50 flex flex-col items-center py-12 px-4">
        <div className="w-full max-w-2xl space-y-6">
          {/* Banner Skeleton */}
          <div className="w-full h-44 sm:h-60 rounded-2xl bg-white/40 border border-white/60 animate-pulse backdrop-blur-md" />
          
          {/* Title Skeleton */}
          <div className="rounded-2xl border border-white/60 bg-white/70 p-6 sm:p-8 backdrop-blur-xl space-y-3 animate-pulse">
            <div className="h-7 bg-slate-200/80 rounded-lg w-2/3" />
            <div className="h-4 bg-slate-200/60 rounded-lg w-1/2" />
          </div>
          
          {/* Input skeletons */}
          {[1, 2, 3].map((n) => (
            <div key={n} className="rounded-2xl border border-white/60 bg-white/70 p-6 backdrop-blur-xl space-y-4 animate-pulse">
              <div className="h-5 bg-slate-200/80 rounded-lg w-1/3" />
              <div className="h-10 bg-slate-200/40 rounded-xl w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen bg-gradient-to-tr from-slate-50 via-indigo-50/30 to-blue-50/50 text-slate-800 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md border border-white/60 bg-white/70 backdrop-blur-xl rounded-2xl text-center p-8 relative overflow-hidden shadow-lg">
          <div className="absolute top-0 left-0 w-full h-[4px] bg-rose-500" />
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-rose-50 border border-rose-100 text-rose-500 mb-5 shadow-sm">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Formulir Tidak Ditemukan</h2>
          <p className="text-slate-500 text-sm mt-3 leading-relaxed">
            Tautan yang Anda ikuti mungkin rusak, atau formulir ini telah dihapus oleh pengelolanya.
          </p>
        </div>
      </div>
    );
  }

  // Check Password Protection
  if (form.has_password && !isPasswordVerified) {
    return (
      <div className="min-h-screen bg-gradient-to-tr from-slate-50 via-indigo-50/30 to-blue-50/50 text-slate-800 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md border border-white/60 bg-white/70 backdrop-blur-xl rounded-2xl text-center p-8 relative overflow-hidden shadow-lg space-y-5">
          <div className="absolute top-0 left-0 w-full h-[4px] bg-indigo-600" />
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 shadow-sm">
            <Lock className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900">Formulir Terproteksi</h2>
            <p className="text-slate-500 text-xs leading-relaxed">
              Formulir ini dilindungi kata sandi. Silakan masukkan kata sandi akses untuk membukanya.
            </p>
          </div>
          <form 
            onSubmit={async (e) => {
              e.preventDefault();
              const res = await verifyFormPasswordAction(formId, passwordInput);
              if (res.success) {
                setIsPasswordVerified(true);
                toast.success("Akses terbuka, silakan isi form.");
              } else {
                toast.error(res.error || "Kata sandi salah.");
              }
            }}
            className="space-y-3"
          >
            <Input
              type="password"
              placeholder="Masukkan kata sandi..."
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className="bg-white/60 border border-slate-200 text-slate-850 h-10 rounded-xl"
              required
            />
            <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-750 text-white font-bold h-10 rounded-xl transition-all cursor-pointer">
              Buka Formulir
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // Check Expiry Date / Deadline
  const isExpired = form.expiry_date ? new Date() > new Date(form.expiry_date) : false;
  if (isExpired || !form.is_active) {
    return (
      <div className="min-h-screen bg-gradient-to-tr from-slate-50 via-indigo-50/30 to-blue-50/50 text-slate-800 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md border border-white/60 bg-white/70 backdrop-blur-xl rounded-2xl text-center p-8 relative overflow-hidden shadow-lg">
          <div className="absolute top-0 left-0 w-full h-[4px] bg-amber-500" />
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-amber-50 border border-amber-100 text-amber-500 mb-5 shadow-sm">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Formulir Ditutup</h2>
          <p className="text-slate-550 text-sm mt-3 leading-relaxed">
            {isExpired ? (
              <>
                Formulir <strong className="text-slate-800">"{form.title}"</strong> sudah melewati batas waktu pengisian ({new Date(form.expiry_date!).toLocaleString("id-ID")}) dan tidak menerima tanggapan baru.
              </>
            ) : (
              <>
                Formulir <strong className="text-slate-800">"{form.title}"</strong> sudah ditutup oleh pemiliknya dan tidak menerima tanggapan baru.
              </>
            )}
          </p>
        </div>
      </div>
    );
  }

  if (isCheckingOutPaidForm) {
    return (
      <div className="min-h-screen bg-gradient-to-tr from-slate-50 via-indigo-50/30 to-blue-50/50 text-slate-800 flex flex-col items-center py-12 px-4">
        <div className="w-full max-w-xl space-y-6">
          
          {/* Form Header Info */}
          <div className="rounded-2xl border border-white/60 bg-white/70 p-6 sm:p-8 backdrop-blur-xl shadow-lg relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-indigo-500 to-purple-500" />
            <h2 className="text-2xl font-black tracking-tight text-slate-900">
              Checkout Pembayaran Formulir
            </h2>
            <p className="text-slate-500 text-sm mt-1">
              Formulir <strong className="text-slate-850">"{paidFormTitle}"</strong> mewajibkan pembayaran untuk dapat memproses tanggapan.
            </p>
          </div>

          {!checkoutData ? (
            <Card className="shadow-lg border border-white/60 bg-white/80 backdrop-blur-md">
              <CardHeader className="bg-slate-50/60 border-b">
                <CardTitle className="text-lg">Rincian Pembayaran</CardTitle>
                <CardDescription>{paidFormDescription || "Silakan lengkapi info pembayaran di bawah ini."}</CardDescription>
                <div className="mt-3 text-3xl font-extrabold text-slate-950">
                  Rp {paidFormPrice.toLocaleString("id-ID")}
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-5">
                <div className="space-y-2">
                  <Label htmlFor="payerName">Nama Lengkap Pembayar</Label>
                  <Input
                    id="payerName"
                    placeholder="Masukkan nama lengkap Anda"
                    value={payerName}
                    onChange={(e) => setPayerName(e.target.value)}
                    className="bg-white border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 text-slate-850 h-11 rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payerEmail">Alamat Email Pembayar</Label>
                  <Input
                    id="payerEmail"
                    type="email"
                    placeholder="Masukkan email Anda"
                    value={payerEmail}
                    onChange={(e) => setPayerEmail(e.target.value)}
                    className="bg-white border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 text-slate-855 h-11 rounded-xl"
                  />
                  <p className="text-[10px] text-slate-400">Status pembayaran & instruksi transfer akan dikirimkan ke email ini.</p>
                </div>

                <div className="space-y-2">
                  <Label>Pilih Metode Pembayaran</Label>
                  {paymentChannels.length === 0 ? (
                    <div className="text-xs p-3 bg-rose-50 border border-rose-200 text-rose-650 rounded-xl">
                      Tidak ada metode pembayaran aktif. Silakan hubungi admin pengelola form.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[220px] overflow-y-auto pr-1">
                      {paymentChannels.map((ch) => (
                        <label
                          key={ch.code}
                          className={`flex items-center space-x-3 rounded-xl border p-3 cursor-pointer select-none transition-all duration-200 ${
                            selectedChannel === ch.code 
                              ? "border-indigo-650 bg-indigo-50/40 font-semibold shadow-sm" 
                              : "border-slate-200 bg-white hover:bg-slate-50"
                          }`}
                        >
                          <input
                            type="radio"
                            name="payment_method"
                            value={ch.code}
                            checked={selectedChannel === ch.code}
                            onChange={() => setSelectedChannel(ch.code)}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-slate-800 truncate">{ch.name}</div>
                            <div className="text-[9px] text-slate-400 uppercase tracking-wider">{ch.code}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-4 flex flex-col sm:flex-row gap-3 border-t">
                  <Button
                    onClick={() => setIsCheckingOutPaidForm(false)}
                    variant="outline"
                    className="flex-1 rounded-xl h-11"
                  >
                    Kembali Mengisi Form
                  </Button>
                  
                  <Button
                    onClick={handleFormPayment}
                    disabled={isPending || paymentChannels.length === 0}
                    className="flex-1 py-3 bg-gradient-to-r from-indigo-650 to-indigo-750 text-white font-semibold rounded-xl shadow hover:from-indigo-700 hover:to-indigo-800 transition duration-200 cursor-pointer h-11"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Membuat Invoice...
                      </>
                    ) : (
                      <>
                        Bayar Sekarang & Kirim
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-lg border border-white/60 bg-white/80 backdrop-blur-md">
              <CardHeader className="bg-slate-50/60 border-b flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-lg">Tagihan Pembayaran</CardTitle>
                  <CardDescription>Segera selesaikan pembayaran Anda untuk mengirim tanggapan.</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={handleResetFormPayment} className="text-slate-450 hover:text-slate-655 cursor-pointer">
                  <i className="fa-solid fa-xmark text-lg"></i>
                </Button>
              </CardHeader>
              <CardContent className="space-y-4 pt-5">
                {/* Status Indicator */}
                <div className="rounded-xl p-3.5 bg-amber-50 border border-amber-200 text-center space-y-1">
                  <div className="text-[9px] font-extrabold text-amber-700 uppercase tracking-widest">Status Pembayaran</div>
                  <div className="text-sm font-semibold text-amber-800 flex items-center justify-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                    MENUNGGU PEMBAYARAN
                  </div>
                  <p className="text-[10px] text-slate-400">Status akan terupdate otomatis secara real-time</p>
                </div>

                {/* QR Code / Pay Code */}
                {checkoutData.qrUrl ? (
                  <div className="flex flex-col items-center justify-center p-4 bg-white border rounded-xl shadow-inner">
                    <p className="text-xs font-semibold text-slate-500 mb-2">Scan QR Code di bawah</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={checkoutData.qrUrl} alt="QRIS QR Code" className="w-52 h-52 shadow-md rounded-lg" />
                    <p className="text-[9px] text-slate-400 mt-2">Dukungan QRIS: GoPay, OVO, Dana, LinkAja, BCA Mobile, ShopeePay</p>
                  </div>
                ) : checkoutData.payCode ? (
                  <div className="rounded-xl p-4 bg-slate-50 border text-center space-y-1.5 shadow-inner">
                    <p className="text-xs font-semibold text-slate-500">Kode Pembayaran / Nomor Virtual Account</p>
                    <div className="text-2xl font-extrabold text-slate-900 tracking-wider bg-white py-2.5 px-4 rounded-xl border select-all border-slate-200 shadow-sm">
                      {checkoutData.payCode}
                    </div>
                    <p className="text-[10px] text-slate-400">Salin nomor di atas untuk melakukan transfer</p>
                  </div>
                ) : null}

                {/* Pricing Details */}
                <div className="flex items-center justify-between text-sm py-2 border-b">
                  <span className="font-semibold text-slate-500">Total Biaya</span>
                  <span className="font-extrabold text-slate-900">Rp {paidFormPrice.toLocaleString("id-ID")}</span>
                </div>

                {/* Instructions */}
                {checkoutData.instructions && checkoutData.instructions.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-slate-500">Cara Pembayaran</Label>
                    <div className="max-h-[220px] overflow-y-auto space-y-2 pr-1">
                      {checkoutData.instructions.map((inst, i) => (
                        <details key={i} className="group border rounded-xl bg-white overflow-hidden" open={i === 0}>
                          <summary className="flex items-center justify-between p-3 text-xs font-bold text-slate-700 bg-slate-50/55 cursor-pointer select-none">
                            <span>{inst.title}</span>
                            <i className="fa-solid fa-chevron-down text-slate-400 group-open:rotate-180 transition-transform duration-250"></i>
                          </summary>
                          <ol className="p-3.5 text-xs text-slate-650 list-decimal list-inside space-y-2 border-t">
                            {inst.steps.map((step: any, idx: number) => (
                              <li key={idx} dangerouslySetInnerHTML={{ __html: step }} className="leading-relaxed"></li>
                            ))}
                          </ol>
                        </details>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleResetFormPayment}
                  variant="outline"
                  className="w-full text-xs rounded-xl"
                >
                  Batal & Pilih Metode Pembayaran Lain
                </Button>
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    );
  }

  if (isAlreadySubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-tr from-slate-50 via-indigo-50/30 to-blue-50/50 text-slate-800 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md border border-white/60 bg-white/70 backdrop-blur-xl rounded-2xl text-center p-8 relative overflow-hidden shadow-lg">
          <div className="absolute top-0 left-0 w-full h-[4px] bg-rose-500" />
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-rose-50 border border-rose-100 text-rose-500 mb-5 shadow-sm">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Tanggapan Dibatasi</h2>
          <p className="text-slate-500 text-sm mt-3 leading-relaxed">
            Anda sudah mengirimkan tanggapan untuk formulir <strong className="text-slate-800">"{form.title}"</strong> sebelumnya. Formulir ini dikonfigurasi untuk hanya menerima 1 tanggapan per orang (IP Address).
          </p>
        </div>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-tr from-slate-50 via-indigo-50/30 to-blue-50/50 text-slate-800 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-lg border border-white/60 bg-white/70 backdrop-blur-xl rounded-2xl text-center p-8 relative overflow-hidden shadow-lg space-y-6">
          <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-emerald-500/20 via-emerald-500 to-emerald-500/20" />
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-500 shadow-sm">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black tracking-tight text-slate-900">
              Tanggapan Dikirim!
            </h2>
            <p className="text-slate-500 text-sm leading-relaxed whitespace-pre-line max-w-md mx-auto">
              {form.custom_success_message || `Terima kasih, tanggapan Anda untuk formulir "${form.title}" telah berhasil disimpan di database kami.`}
            </p>
          </div>
          
          {form.redirect_url && (
            <div className="text-xs text-slate-400 pt-2 flex items-center justify-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin text-indigo-500" />
              <span>Mengalihkan Anda ke tautan luar dalam beberapa detik...</span>
            </div>
          )}

          {!form.redirect_url && (
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row justify-center gap-3">
              <Button
                type="button"
                onClick={() => window.print()}
                className="bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl px-6 shadow-sm h-10 font-semibold transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Printer className="h-4 w-4 mr-2" />
                Cetak Bukti Pengisian (PDF)
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setAnswers({});
                  setUploadedFiles({});
                  setIsSubmitted(false);
                  setResponseId(undefined);
                }}
                className="bg-white border border-slate-200 text-slate-650 hover:bg-slate-50 rounded-xl px-6 shadow-sm h-10 font-semibold transition-all cursor-pointer"
              >
                Kirim Tanggapan Lain
              </Button>
            </div>
          )}

          {/* Printable Receipt Area */}
          <div id="print-receipt-section" className="hidden print:block font-sans p-8 bg-white text-slate-800 text-left">
            <style dangerouslySetInnerHTML={{ __html: `
              @media print {
                body * {
                  visibility: hidden;
                }
                #print-receipt-section, #print-receipt-section * {
                  visibility: visible;
                }
                #print-receipt-section {
                  position: absolute;
                  left: 0;
                  top: 0;
                  width: 100%;
                }
              }
            ` }} />
            <div className="border-b-2 border-slate-900 pb-4 mb-6">
              <h1 className="text-xl font-bold uppercase text-slate-955">Bukti Pengisian Formulir</h1>
              <p className="text-xs text-slate-500 mt-1">Dicetak pada: {new Date().toLocaleString("id-ID")}</p>
            </div>

            <div className="space-y-3 text-xs mb-6">
              <div>
                <span className="font-bold text-slate-500 block">Formulir:</span>
                <span className="text-sm font-bold text-slate-900">{form.title}</span>
              </div>
              {responseId && (
                <div>
                  <span className="font-bold text-slate-500 block">ID Tanggapan:</span>
                  <span className="font-mono text-slate-800">#{responseId}</span>
                </div>
              )}
            </div>

            <table className="w-full border-collapse border border-slate-300 text-xs">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-slate-300 px-4 py-2.5 text-left font-bold text-slate-900">Pertanyaan</th>
                  <th className="border border-slate-300 px-4 py-2.5 text-left font-bold text-slate-900">Jawaban</th>
                </tr>
              </thead>
              <tbody>
                {fields.map((field) => {
                  if (!isFieldVisible(field.id)) return null;
                  let displayVal = answers[field.id] || "-";
                  if (Array.isArray(displayVal)) {
                    displayVal = displayVal.join(", ");
                  }
                  return (
                    <tr key={field.id} className="even:bg-slate-50/50">
                      <td className="border border-slate-300 px-4 py-2.5 font-semibold text-slate-800">{field.label}</td>
                      <td className="border border-slate-300 px-4 py-2.5 whitespace-pre-wrap text-slate-750">{String(displayVal)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="border-t border-slate-200 mt-8 pt-4 text-center text-[10px] text-slate-400">
              Personal Form Builder • Cetak Tanggapan Resmi
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-tr from-slate-50 via-indigo-50/30 to-blue-50/50 text-slate-800 flex flex-col items-center py-12 px-4 sm:px-6 relative overflow-x-hidden">
      {/* Background glow decoration blobs */}
      <div className="absolute top-[10%] left-[10%] w-72 h-72 bg-indigo-300/20 rounded-full blur-[80px] pointer-events-none animate-pulse" style={{ animationDuration: "8s" }} />
      <div className="absolute bottom-[20%] right-[10%] w-80 h-80 bg-purple-300/15 rounded-full blur-[90px] pointer-events-none animate-pulse" style={{ animationDuration: "10s" }} />
      <div className="absolute top-[40%] right-[20%] w-64 h-64 bg-blue-300/15 rounded-full blur-[70px] pointer-events-none animate-pulse" style={{ animationDuration: "6s" }} />
      
      {/* Background default header glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[250px] bg-gradient-to-b from-indigo-500/5 to-transparent rounded-full blur-[100px] pointer-events-none" />

      {/* Submission Loading Overlay */}
      {isPending && (
        <div className="fixed inset-0 bg-white/60 backdrop-blur-md z-50 flex flex-col items-center justify-center">
          <div className="relative flex items-center justify-center">
            <div className="h-16 w-16 rounded-full border-4 border-indigo-100 animate-ping absolute" />
            <div className="h-14 w-14 rounded-full border-4 border-t-indigo-600 border-r-purple-600 border-b-pink-500 border-l-transparent animate-spin" />
          </div>
          <h3 className="mt-6 text-slate-900 font-extrabold text-lg tracking-tight animate-pulse">Mengirim Tanggapan Anda</h3>
          <p className="mt-1.5 text-slate-550 text-xs font-medium">Jawaban Anda sedang dienkripsi & disimpan ke database...</p>
        </div>
      )}

      {/* Autosave Draft Saved Pill */}
      {lastSavedTime && (
        <div className="fixed bottom-6 right-6 z-40 bg-white/80 border border-slate-200/60 text-slate-700 backdrop-blur-md px-4 py-2.5 rounded-full shadow-lg flex items-center space-x-2 transition-all duration-300 hover:bg-white">
          <div className="relative flex h-2 w-2 mr-1">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </div>
          <CloudUpload className="h-3.5 w-3.5 text-emerald-600" />
          <span className="text-[10px] font-bold tracking-tight">
            Draf disimpan otomatis ({lastSavedTime.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })})
          </span>
        </div>
      )}

      <div className="w-full max-w-2xl space-y-6 relative">
        
        {/* Form Banner */}
        {form.banner_url && (
          <div className="w-full h-44 sm:h-60 rounded-2xl border border-slate-200/80 overflow-hidden relative shadow-sm">
            <img src={form.banner_url} alt="Form Banner" className="w-full h-full object-cover" />
          </div>
        )}

        {/* Form Meta Header */}
        <div className="relative overflow-hidden rounded-2xl border border-white/60 bg-white/70 p-6 sm:p-8 backdrop-blur-xl shadow-md">
          <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-indigo-500/20 via-indigo-500 to-indigo-500/20" />
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                {form.title}
              </h1>
              {form.is_paid_form && (
                <div className="shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-wide bg-indigo-50 border border-indigo-200 text-indigo-700 shadow-sm self-start sm:self-center">
                  <i className="fa-solid fa-wallet"></i> Rp {form.form_price?.toLocaleString("id-ID")}
                </div>
              )}
            </div>
            {form.description && (
              <p className="text-slate-550 text-sm leading-relaxed whitespace-pre-line">
                {form.description}
              </p>
            )}
          </div>
        </div>

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
              <div 
                key={field.id} 
                id={`container-${field.id}`}
                className={`relative overflow-hidden rounded-2xl border transition-all duration-300 p-6 backdrop-blur-sm ${
                  errors[field.id] 
                    ? "border-rose-300 bg-rose-50/20 shadow-[0_0_15px_rgba(239,68,68,0.01)]" 
                    : "border-white/60 bg-white/70 hover:border-slate-200/80 shadow-sm"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center space-x-1.5">
                    <Label className="text-slate-750 text-sm font-bold tracking-wide">
                      {field.label}
                    </Label>
                    {field.required && (
                      <span className="text-rose-500 font-bold" title="Wajib Diisi">*</span>
                    )}
                  </div>

                  {/* Text input */}
                  {field.type === "text" && (
                    <Input
                      type="text"
                      value={answers[field.id] || ""}
                      onChange={(e) => handleInputChange(field.id, e.target.value)}
                      disabled={isPending}
                      className="bg-white/60 border border-slate-200 text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 focus:bg-white h-10 rounded-xl transition-all"
                      placeholder="Jawaban Anda..."
                    />
                  )}

                  {/* Textarea paragraph input */}
                  {field.type === "textarea" && (
                    <Textarea
                      value={answers[field.id] || ""}
                      onChange={(e) => handleInputChange(field.id, e.target.value)}
                      disabled={isPending}
                      className="bg-white/60 border border-slate-200 text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 focus:bg-white min-h-[100px] rounded-xl transition-all resize-y"
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
                      <SelectTrigger className="bg-white/60 border border-slate-200 text-slate-800 focus:ring-1 focus:ring-indigo-500/20 h-10 rounded-xl">
                        <SelectValue placeholder="Pilih salah satu..." />
                      </SelectTrigger>
                      <SelectContent className="bg-white/95 border border-slate-200 text-slate-800 rounded-xl backdrop-blur-md">
                        {field.options.map((opt, idx) => (
                          <SelectItem key={idx} value={opt} className="focus:bg-slate-100 focus:text-slate-900 rounded-lg text-slate-700">
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {/* Radio choice input */}
                  {field.type === "radio" && field.options && (
                    <div className="grid grid-cols-1 gap-2.5 pt-1">
                      {field.options.map((opt, idx) => {
                        const isSelected = answers[field.id] === opt;
                        return (
                          <div
                            key={idx}
                            onClick={() => !isPending && handleInputChange(field.id, opt)}
                            className={`flex items-center px-4 py-3 rounded-xl border cursor-pointer transition-all duration-200 select-none ${
                              isSelected 
                                ? "border-indigo-500/50 bg-indigo-50/50 text-indigo-950 shadow-[0_0_15px_rgba(99,102,241,0.02)]" 
                                : "border-slate-200 bg-white/50 text-slate-750 hover:border-slate-300 hover:bg-white"
                            }`}
                          >
                            <div className={`h-4.5 w-4.5 rounded-full border flex items-center justify-center mr-3 shrink-0 transition-all ${
                              isSelected ? "border-indigo-650 bg-indigo-50/80" : "border-slate-300 bg-white"
                            }`}>
                              {isSelected && (
                                <div className="h-2.5 w-2.5 rounded-full bg-indigo-600" />
                              )}
                            </div>
                            <span className="text-sm font-medium">{opt}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* File/Image Upload input */}
                  {field.type === "file" && (
                    <div className="space-y-3 pt-1">
                      {!uploadedFiles[field.id] ? (
                        <div className="relative border border-dashed border-slate-300 hover:border-indigo-400 rounded-2xl p-6 bg-white/40 text-center flex flex-col items-center justify-center space-y-3 group transition-all duration-300 cursor-pointer">
                          <input
                            id={`file-input-${field.id}`}
                            type="file"
                            accept={field.fileTypes || "*"}
                            onChange={(e) => handleFileUpload(field.id, e)}
                            disabled={isPending || uploadingFields[field.id]}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-200 text-slate-400 group-hover:text-indigo-650 transition-all duration-300">
                            {uploadingFields[field.id] ? (
                              <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
                            ) : (
                              <CloudUpload className="h-5 w-5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                            )}
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-slate-700 font-semibold">
                              {uploadingFields[field.id] ? "Mengunggah..." : "Klik atau seret berkas ke sini"}
                            </p>
                            <p className="text-[10px] text-slate-400 max-w-xs mx-auto leading-relaxed">
                              {field.fileTypes === "image/*" && "Hanya Gambar (PNG, JPG, WebP, GIF) (Maks. 5MB)"}
                              {field.fileTypes === "audio/*" && "Hanya Audio (MP3, WAV, OGG) (Maks. 5MB)"}
                              {field.fileTypes && field.fileTypes.includes(".") && `Hanya Dokumen (${field.fileTypes.replace(/\./g, "").toUpperCase()}) (Maks. 5MB)`}
                              {(!field.fileTypes || field.fileTypes === "*") && "Semua Format Berkas (Maks. 5MB)"}
                            </p>
                          </div>

                          {/* Progress indicator */}
                          {uploadingFields[field.id] && (
                            <div className="w-full max-w-xs mt-2 space-y-1.5">
                              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                                <div 
                                  className="h-full bg-indigo-600 transition-all duration-150 rounded-full" 
                                  style={{ width: `${uploadProgress[field.id] || 0}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-slate-550 font-bold block text-center">
                                Mengunggah: {uploadProgress[field.id] || 0}%
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-250 bg-white/80 text-xs shadow-inner">
                          <div className="flex items-center space-x-3 truncate max-w-sm">
                            <div className="h-8 w-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                              <Paperclip className="h-4 w-4" />
                            </div>
                            <span className="text-slate-700 font-semibold truncate font-mono text-[11px]">
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
                            className="h-8 px-3 text-slate-500 hover:text-rose-650 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          >
                            Ganti File
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Individual Field Validation Error */}
                  {errors[field.id] && (
                    <p className="text-xs text-rose-600 font-semibold flex items-center pt-1">
                      <AlertCircle className="h-3.5 w-3.5 mr-1 shrink-0 text-rose-500" />
                      {errors[field.id]}
                    </p>
                  )}
                </div>
              </div>
            );
          })}

          {/* Cloudflare Turnstile Captcha Widget */}
          {form.enable_turnstile && (
            <div className="relative overflow-hidden rounded-2xl border border-white/60 bg-white/70 p-6 backdrop-blur-sm shadow-sm flex flex-col items-center justify-center space-y-3">
              <Label className="text-slate-750 text-sm font-bold tracking-wide self-start">Verifikasi Keamanan (Anti-Bot)</Label>
              <TurnstileWidget siteKey={form.turnstile_site_key || "0x4AAAAAAAxgf3w7tWexJp15"} />
            </div>
          )}

          {/* Form Submit Button */}
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-center pt-4">
            <span className="text-[11px] text-slate-400 font-medium">
              Formulir ini aman & terenkripsi oleh Personal Form Builder.
            </span>
            <Button
              type="submit"
              disabled={isPending || Object.values(uploadingFields).some(Boolean)}
              className="w-full sm:w-auto bg-indigo-600 text-white hover:bg-indigo-700 font-bold px-8 h-11 rounded-xl shadow-md transition-all cursor-pointer"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Mengirim...
                </>
              ) : (
                "Kirim Tanggapan"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Custom self-contained component for Cloudflare Turnstile with explicit rendering
function TurnstileWidget({ siteKey }: { siteKey: string }) {
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const scriptId = "cloudflare-turnstile-script";

    // Inject the Turnstile script dynamically if not present
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }

    let widgetId: string | null = null;

    const renderWidget = () => {
      if (typeof window !== "undefined" && (window as any).turnstile && containerRef.current) {
        try {
          containerRef.current.innerHTML = "";
          widgetId = (window as any).turnstile.render(containerRef.current, {
            sitekey: siteKey,
            "error-callback": (err: any) => {
              console.error("Turnstile widget error callback:", err);
            },
            "expired-callback": () => {
              if (typeof window !== "undefined" && (window as any).turnstile && widgetId) {
                try {
                  (window as any).turnstile.reset(widgetId);
                } catch (e) {
                  console.error("Error resetting Turnstile widget:", e);
                }
              }
            }
          });
        } catch (e) {
          console.error("Turnstile render error:", e);
        }
      }
    };

    // Render Turnstile once it is available in window
    if (typeof window !== "undefined" && (window as any).turnstile) {
      renderWidget();
    } else {
      const interval = setInterval(() => {
        if (typeof window !== "undefined" && (window as any).turnstile) {
          clearInterval(interval);
          renderWidget();
        }
      }, 100);
      return () => clearInterval(interval);
    }

    // Cleanup on unmount or siteKey change
    return () => {
      if (widgetId && typeof window !== "undefined" && (window as any).turnstile) {
        try {
          (window as any).turnstile.remove(widgetId);
        } catch (e) {
          console.error("Error cleaning up Turnstile widget:", e);
        }
      }
    };
  }, [siteKey]);

  return (
    <div 
      ref={containerRef} 
      className="min-h-[65px] flex items-center justify-center md:justify-start" 
    />
  );
}

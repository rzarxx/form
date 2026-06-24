"use client";

import React, { useEffect, useState, useTransition, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { getFormDetailAction, deleteFormAction, toggleFormActiveAction, deleteResponseAction, generateResponseInsightsAction } from "@/app/actions/forms";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { toast } from "sonner";

interface FieldSchema {
  id: string;
  label: string;
  type: "text" | "textarea" | "select" | "radio" | "file";
  required: boolean;
  options?: string[];
}

interface FormSchema {
  id: string;
  title: string;
  description: string;
  created_at: string;
  fields: FieldSchema[];
  is_active: boolean;
  max_responses: number;
}

interface ResponseSchema {
  id: number;
  created_at: string;
  answers: Record<string, any>;
  ip_address: string;
}

export default function FormDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  // Unwrap params using React.use()
  const resolvedParams = use(params);
  const formId = resolvedParams.id;

  const router = useRouter();
  const [form, setForm] = useState<FormSchema | null>(null);
  const [responses, setResponses] = useState<ResponseSchema[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [isPremium, setIsPremium] = useState(false);

  // Custom Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Tab View state: "table" vs "analytics" vs "ai_insights"
  const [activeTab, setActiveTab] = useState<"table" | "analytics" | "ai_insights">("table");
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [aiInsightsUpdatedAt, setAiInsightsUpdatedAt] = useState<string | null>(null);
  const [isAiInsightsGenerating, setIsAiInsightsGenerating] = useState(false);
  
  // Share Panel visibility state
  const [showShare, setShowShare] = useState(false);

  const itemsPerPage = 10;

  const fields: FieldSchema[] = form
    ? (Array.isArray(form.fields)
      ? form.fields
      : typeof form.fields === "string"
        ? JSON.parse(form.fields)
        : [])
    : [];

  const fetchFormDetails = async () => {
    setIsLoading(true);
    const result = await getFormDetailAction(formId);
    if (result.success && result.data) {
      setForm(result.data.form as FormSchema);
      setResponses(result.data.responses as unknown as ResponseSchema[]);
      setIsPremium(!!result.data.isPremium);
      setAiInsights(result.data.form.ai_insights || null);
      setAiInsightsUpdatedAt(result.data.form.ai_insights_updated_at || null);
    } else {
      toast.error(result.error || "Gagal memuat detail formulir.");
      router.push("/admin");
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchFormDetails();
  }, [formId]);

  const handleGenerateAiInsights = async () => {
    setIsAiInsightsGenerating(true);
    const loadingToast = toast.loading("AI sedang menganalisis tanggapan formulir Anda...");
    try {
      const result = await generateResponseInsightsAction(formId);
      toast.dismiss(loadingToast);
      if (result.success) {
        setAiInsights(result.insights || null);
        setAiInsightsUpdatedAt(result.updatedAt || null);
        toast.success("Analisis tanggapan AI berhasil dibuat!");
      } else {
        toast.error(result.error || "Gagal menghasilkan analisis AI.");
      }
    } catch (err: any) {
      toast.dismiss(loadingToast);
      console.error(err);
      toast.error(err.message || "Terjadi kesalahan koneksi saat memanggil AI.");
    } finally {
      setIsAiInsightsGenerating(false);
    }
  };

  const renderMarkdown = (text: string) => {
    if (!text) return null;
    const lines = text.split("\n");
    return lines.map((line, idx) => {
      // Heading 3
      if (line.startsWith("### ")) {
        return <h3 key={idx} className="text-sm font-bold text-indigo-955 mt-4 mb-2">{line.replace("### ", "")}</h3>;
      }
      // Heading 2
      if (line.startsWith("## ")) {
        return <h2 key={idx} className="text-base font-black text-indigo-950 mt-5 mb-2.5 border-b border-indigo-100 pb-1">{line.replace("## ", "")}</h2>;
      }
      // Heading 1
      if (line.startsWith("# ")) {
        return <h1 key={idx} className="text-lg font-black text-indigo-955 mt-6 mb-3">{line.replace("# ", "")}</h1>;
      }
      // Bold list items
      if (line.startsWith("- **") || line.startsWith("* **")) {
        const match = line.match(/^[-*]\s+\*\*(.*?)\*\*:(.*)$/);
        if (match) {
          return (
            <li key={idx} className="ml-4 list-disc text-xs text-slate-700 leading-relaxed mb-1.5">
              <strong className="text-slate-800">{match[1]}:</strong>{match[2]}
            </li>
          );
        }
      }
      // Bold paragraph starting
      if (line.startsWith("**") && line.includes("**")) {
        const parts = line.split("**");
        return (
          <p key={idx} className="text-xs text-slate-700 leading-relaxed mb-2">
            {parts.map((p, i) => i % 2 === 1 ? <strong key={i} className="text-slate-800">{p}</strong> : p)}
          </p>
        );
      }
      // Simple list items
      if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
        return (
          <li key={idx} className="ml-4 list-disc text-xs text-slate-700 leading-relaxed mb-1.5">
            {line.replace(/^[-*]\s+/, "")}
          </li>
        );
      }
      // Numbered list items
      if (/^\d+\.\s+/.test(line.trim())) {
        return (
          <li key={idx} className="ml-5 list-decimal text-xs text-slate-700 leading-relaxed mb-1.5">
            {line.replace(/^\d+\.\s+/, "")}
          </li>
        );
      }
      // Empty line
      if (!line.trim()) {
        return <div key={idx} className="h-1.5" />;
      }
      // Normal paragraph
      return <p key={idx} className="text-xs text-slate-700 leading-relaxed mb-2">{line}</p>;
    });
  };

  const handleToggleActive = async () => {
    if (!form) return;
    const nextActive = !form.is_active;
    const result = await toggleFormActiveAction(formId, nextActive);
    if (result.success) {
      setForm({ ...form, is_active: nextActive });
      toast.success(nextActive ? "Formulir diaktifkan kembali." : "Formulir berhasil ditutup.");
    } else {
      toast.error(result.error || "Gagal mengubah status formulir.");
    }
  };

  const handleDeleteForm = async () => {
    setConfirmModal({
      isOpen: true,
      title: "Hapus Formulir?",
      message: "Apakah Anda yakin ingin menghapus formulir ini beserta seluruh responsnya secara permanen? Tindakan ini tidak dapat dibatalkan.",
      onConfirm: () => {
        startTransition(async () => {
          const result = await deleteFormAction(formId);
          if (result.success) {
            toast.success("Formulir berhasil dihapus.");
            router.push("/admin");
            router.refresh();
          } else {
            toast.error(result.error || "Gagal menghapus formulir.");
          }
        });
      }
    });
  };

  const handleDeleteResponse = async (responseId: number) => {
    setConfirmModal({
      isOpen: true,
      title: "Hapus Tanggapan?",
      message: "Apakah Anda yakin ingin menghapus baris tanggapan ini? Seluruh berkas/dokumen yang diunggah pengisi form ini juga akan dihapus dari storage secara permanen.",
      onConfirm: () => {
        startTransition(async () => {
          const result = await deleteResponseAction(responseId);
          if (result.success) {
            toast.success("Tanggapan berhasil dihapus.");
            setResponses((prev) => prev.filter((r) => r.id !== responseId));
          } else {
            toast.error(result.error || "Gagal menghapus tanggapan.");
          }
        });
      }
    });
  };

  // Filter responses based on search query in any answer field
  const filteredResponses = responses.filter((res) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    
    // Check if any of the answers contain the search query
    return Object.values(res.answers).some((val) => {
      if (!val) return false;
      if (Array.isArray(val)) return val.join(" ").toLowerCase().includes(q);
      return String(val).toLowerCase().includes(q);
    }) || String(res.id).includes(q) || (res.ip_address && res.ip_address.includes(q));
  });

  const handleExportCSV = () => {
    if (!form || filteredResponses.length === 0) {
      toast.error("Tidak ada data tanggapan yang cocok untuk diekspor.");
      return;
    }

    try {
      // Setup CSV headers
      const headers = ["ID", "Waktu Pengiriman", "IP Address", ...fields.map(f => f.label)];
      
      // Setup CSV rows using filteredResponses (only search results)
      const rows = filteredResponses.map(res => {
        const dateStr = new Date(res.created_at).toLocaleString("id-ID", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit"
        });
        
        const parsedAnswers = typeof res.answers === "string" ? JSON.parse(res.answers) : res.answers;
        const answerValues = fields.map(field => {
          const ans = parsedAnswers[field.id];
          if (ans === undefined || ans === null) return "";
          if (Array.isArray(ans)) return ans.join("; ");
          return String(ans);
        });
        
        return [res.id, dateStr, res.ip_address || "-", ...answerValues];
      });

      // Escape fields for CSV format
      const escapeCSVField = (val: any) => {
        const text = String(val);
        if (text.includes(",") || text.includes('"') || text.includes("\n") || text.includes("\r")) {
          return `"${text.replace(/"/g, '""')}"`;
        }
        return text;
      };

      const csvContent = [
        headers.map(escapeCSVField).join(","),
        ...rows.map(row => row.map(escapeCSVField).join(","))
      ].join("\n");

      // Set UTF-8 BOM to prevent excel encoding issues
      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      
      // Clean filename based on form title
      const cleanTitle = form.title.toLowerCase().replace(/[^a-z0-9]+/g, "_");
      link.setAttribute("download", `respons_filtered_${cleanTitle}_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("File CSV berhasil diekspor sesuai hasil pencarian.");
    } catch (err) {
      console.error("CSV Export failed:", err);
      toast.error("Gagal mengekspor data ke CSV.");
    }
  };

  const handleExportExcel = () => {
    if (!isPremium) {
      toast.error("Fitur Ekspor data ke Excel (.xlsx) hanya tersedia untuk anggota Premium. Silakan upgrade ke keanggotaan Premium.");
      return;
    }

    if (!form || filteredResponses.length === 0) {
      toast.error("Tidak ada data tanggapan yang cocok untuk diekspor.");
      return;
    }

    try {
      const headers = ["ID", "Waktu Pengiriman", "IP Address", ...fields.map(f => f.label)];
      
      const rows = filteredResponses.map(res => {
        const dateStr = new Date(res.created_at).toLocaleString("id-ID", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit"
        });
        
        const parsedAnswers = typeof res.answers === "string" ? JSON.parse(res.answers) : res.answers;
        const answerValues = fields.map(field => {
          const ans = parsedAnswers[field.id];
          if (ans === undefined || ans === null) return "";
          if (Array.isArray(ans)) return ans.join("; ");
          return String(ans);
        });
        
        return [res.id, dateStr, res.ip_address || "-", ...answerValues];
      });

      const worksheetData = [headers, ...rows];
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Tanggapan");

      // Auto-fit column widths
      const maxColWidth = worksheetData[0].map((_, colIdx) => {
        return Math.max(...worksheetData.map(row => String(row[colIdx] || "").length));
      });
      worksheet["!cols"] = maxColWidth.map(w => ({ wch: Math.max(w + 3, 10) }));

      const cleanTitle = form.title.toLowerCase().replace(/[^a-z0-9]+/g, "_");
      XLSX.writeFile(workbook, `respons_excel_${cleanTitle}_${Date.now()}.xlsx`);
      
      toast.success("File Excel (.xlsx) berhasil diekspor!");
    } catch (err) {
      console.error("Excel Export failed:", err);
      toast.error("Gagal mengekspor data ke Excel.");
    }
  };

  // Pagination calculations
  const totalItems = filteredResponses.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedResponses = filteredResponses.slice(startIndex, startIndex + itemsPerPage);

  // Helper to check if string is a URL (useful for file uploads)
  const isUrl = (str: any) => {
    if (typeof str !== "string") return false;
    return str.startsWith("http://") || str.startsWith("https://");
  };

  // Calculate statistics for choice questions
  const getFieldStats = (field: FieldSchema) => {
    if (!field.options || field.options.length === 0) return [];
    
    const counts: Record<string, number> = {};
    field.options.forEach(opt => {
      counts[opt] = 0;
    });
    
    let totalAnswers = 0;
    responses.forEach(res => {
      const parsedAnswers = typeof res.answers === "string" ? JSON.parse(res.answers) : res.answers;
      const val = parsedAnswers[field.id];
      if (val !== undefined && val !== null) {
        const strVal = String(val);
        if (counts[strVal] !== undefined) {
          counts[strVal] += 1;
          totalAnswers += 1;
        }
      }
    });

    return field.options.map(opt => {
      const count = counts[opt] || 0;
      const percentage = totalAnswers > 0 ? Math.round((count / totalAnswers) * 100) : 0;
      return { option: opt, count, percentage };
    }).sort((a, b) => b.count - a.count);
  };

  const getDailyTrend = () => {
    const trend: Record<string, number> = {};
    responses.forEach(res => {
      const dateStr = new Date(res.created_at).toISOString().split("T")[0];
      trend[dateStr] = (trend[dateStr] || 0) + 1;
    });

    const sortedDates = Object.keys(trend).sort();
    if (sortedDates.length === 0) return [];

    if (sortedDates.length === 1) {
      const singleDate = sortedDates[0];
      const prevDate = new Date(singleDate);
      prevDate.setDate(prevDate.getDate() - 1);
      const prevStr = prevDate.toISOString().split("T")[0];
      
      return [
        { date: new Date(prevStr).toLocaleDateString("id-ID", { day: "2-digit", month: "short" }), count: 0 },
        { date: new Date(singleDate).toLocaleDateString("id-ID", { day: "2-digit", month: "short" }), count: trend[singleDate] }
      ];
    }

    return sortedDates.map(date => ({
      date: new Date(date).toLocaleDateString("id-ID", { day: "2-digit", month: "short" }),
      count: trend[date]
    }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f1f5f9] text-slate-800 flex flex-col items-center justify-center">
        <i className="fa-solid fa-circle-notch fa-spin text-indigo-600 text-3xl mb-3"></i>
        <p className="text-sm text-slate-500 font-semibold">Memuat detail formulir...</p>
      </div>
    );
  }

  if (!form) {
    return null;
  }

  // Derive form public URL
  const formUrl = typeof window !== "undefined" 
    ? `${window.location.origin}/forms/${form.id}` 
    : `/forms/${form.id}`;
  
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(formUrl)}`;
  const embedCode = `<iframe src="${formUrl}" width="100%" height="700" frameborder="0" style="border:0; border-radius:8px;">Memuat...</iframe>`;

  const copyToClipboard = (text: string, message: string) => {
    navigator.clipboard.writeText(text);
    toast.success(message);
  };

  return (
    <div className="bg-[#f1f5f9] text-slate-800 flex flex-col min-h-full">
      {/* Subpage Header Actions */}
      <div className="border-b border-slate-200/80 bg-white py-4 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <Link href="/admin">
            <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-800 transition-colors font-semibold cursor-pointer">
              <i className="fa-solid fa-arrow-left mr-2"></i>
              Kembali ke Dasbor
            </Button>
          </Link>
          
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button 
              onClick={handleToggleActive}
              className={`h-9 px-3.5 border bg-white rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer shadow-sm ${
                form.is_active 
                  ? "border-emerald-200 text-emerald-600 hover:bg-emerald-50/50" 
                  : "border-amber-200 text-amber-600 hover:bg-amber-50/50"
              }`}
            >
              <span className={`h-2 w-2 rounded-full mr-2 shrink-0 ${form.is_active ? "bg-emerald-500" : "bg-amber-500"}`} />
              {form.is_active ? "Form Aktif" : "Form Tutup"}
            </Button>

            <Link href={`/admin/forms/${form.id}/edit`}>
              <Button 
                variant="outline" 
                size="sm" 
                className="border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 h-9 rounded-xl transition-all cursor-pointer font-semibold"
              >
                <i className="fa-solid fa-gear mr-1.5 text-slate-400"></i>
                Edit Form
              </Button>
            </Link>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowShare(!showShare)}
              className={`border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 h-9 rounded-xl transition-all cursor-pointer font-semibold ${showShare ? "bg-slate-50 border-slate-300" : ""}`}
            >
              <i className="fa-solid fa-share-nodes mr-1.5 text-slate-400"></i>
              Bagikan
            </Button>

            <Link href={`/forms/${form.id}`} target="_blank">
              <Button 
                variant="outline" 
                size="sm" 
                className="border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 h-9 rounded-xl transition-all cursor-pointer font-semibold"
              >
                <i className="fa-solid fa-arrow-up-right-from-square mr-1.5 text-slate-400"></i>
                Link Publik
              </Button>
            </Link>

            <Button
              size="sm"
              variant="ghost"
              onClick={handleDeleteForm}
              disabled={isPending}
              className="text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 h-9 px-3 rounded-xl transition-all cursor-pointer font-semibold"
            >
              {isPending ? (
                <i className="fa-solid fa-circle-notch fa-spin text-slate-400"></i>
              ) : (
                <>
                  <i className="fa-regular fa-trash-can mr-1.5 text-slate-400 group-hover:text-rose-500"></i>
                  Hapus
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Form Meta details */}
        <Card className="bg-white border-slate-200 shadow-sm rounded-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-[4px] h-full bg-indigo-600" />
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-2xl font-black tracking-tight text-slate-900">{form.title}</h1>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    form.is_active 
                      ? "bg-emerald-50 border-emerald-100 text-emerald-600" 
                      : "bg-amber-50 border-amber-100 text-amber-600"
                  }`}>
                    <span className={`h-1.5 w-1.5 rounded-full mr-1.5 ${form.is_active ? "bg-emerald-500" : "bg-amber-500"}`} />
                    {form.is_active ? "Aktif" : "Ditutup"}
                  </span>
                  {form.max_responses === 1 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-50 border border-slate-200 text-slate-500">
                      Batasi 1 IP
                    </span>
                  )}
                </div>
                {form.description && (
                  <p className="text-slate-500 text-sm max-w-2xl leading-relaxed">{form.description}</p>
                )}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-400 pt-1 font-semibold">
                  <span className="flex items-center gap-1.5">
                    <i className="fa-regular fa-calendar text-slate-400"></i>
                    Dibuat pada {new Date(form.created_at).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric"
                    })}
                  </span>
                  <span className="hidden sm:inline text-slate-200">•</span>
                  <span className="flex items-center gap-1.5">
                    <i className="fa-regular fa-file-lines text-slate-400"></i>
                    {fields.length} Pertanyaan
                  </span>
                </div>
              </div>

              <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                <Button 
                  onClick={handleExportCSV}
                  disabled={filteredResponses.length === 0}
                  className="bg-slate-800 text-white hover:bg-slate-900 font-semibold h-10 shrink-0 rounded-xl shadow-sm hover:shadow-slate-500/10 transition-all duration-300 disabled:opacity-40 disabled:pointer-events-none cursor-pointer flex items-center gap-1.5"
                >
                  <i className="fa-solid fa-download"></i>
                  Ekspor ke CSV
                </Button>

                <Button 
                  onClick={handleExportExcel}
                  disabled={filteredResponses.length === 0}
                  className="bg-indigo-600 text-white hover:bg-indigo-700 font-semibold h-10 shrink-0 rounded-xl shadow-sm hover:shadow-indigo-500/10 transition-all duration-300 disabled:opacity-40 disabled:pointer-events-none cursor-pointer flex items-center gap-1.5"
                >
                  {!isPremium ? (
                    <>
                      <i className="fa-solid fa-crown text-amber-400"></i>
                      Ekspor ke Excel (Pro)
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-file-excel"></i>
                      Ekspor ke Excel (.xlsx)
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Collapsible Share Panel */}
        {showShare && (
          <Card className="bg-white border-slate-200 shadow-sm rounded-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />
            <CardContent className="p-6">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <i className="fa-solid fa-share-nodes text-indigo-600"></i>
                  Bagikan Formulir & Kode Embed
                </h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
                {/* QR Code */}
                <div className="md:col-span-4 lg:col-span-3 flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-xs text-slate-500 font-bold flex items-center gap-1.5 mb-3">
                    <i className="fa-solid fa-qrcode text-indigo-600"></i>
                    Scan QR Code
                  </span>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm mb-3">
                    <img src={qrCodeUrl} alt="QR Code Link Form" className="w-[120px] h-[120px]" />
                  </div>
                  <a 
                    href={qrCodeUrl} 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-bold transition-colors flex items-center gap-1"
                  >
                    Buka File QR (Download)
                    <i className="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
                  </a>
                </div>

                {/* Share Links & Embed Codes */}
                <div className="md:col-span-8 lg:col-span-9 flex flex-col justify-between space-y-4">
                  {/* Public Link */}
                  <div className="space-y-1.5">
                    <Label className="text-slate-600 text-xs font-bold">Tautan Formulir</Label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        readOnly 
                        value={formUrl}
                        className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-3.5 py-2.5 flex-1 focus:outline-none font-mono text-[11px]"
                      />
                      <Button 
                        size="sm"
                        onClick={() => copyToClipboard(formUrl, "Link formulir berhasil disalin!")}
                        className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 px-4 rounded-xl transition-all shadow-sm cursor-pointer"
                      >
                        <i className="fa-regular fa-copy mr-1.5 text-slate-400"></i>
                        Salin
                      </Button>
                    </div>
                  </div>

                  {/* Embed Iframe */}
                  <div className="space-y-1.5">
                    <Label className="text-slate-600 text-xs font-bold flex items-center gap-1">
                      <i className="fa-solid fa-code text-indigo-600 mr-1"></i>
                      HTML Embed Iframe (Tempel di Web Anda)
                    </Label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        readOnly 
                        value={embedCode}
                        className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-3.5 py-2.5 flex-1 focus:outline-none font-mono text-[11px]"
                      />
                      <Button 
                        size="sm"
                        onClick={() => copyToClipboard(embedCode, "Kode embed iframe berhasil disalin!")}
                        className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 px-4 rounded-xl transition-all shadow-sm cursor-pointer"
                      >
                        <i className="fa-regular fa-copy mr-1.5 text-slate-400"></i>
                        Salin
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tab View Header: Table vs Charts vs AI Insights */}
        <div className="flex space-x-1 rounded-xl bg-slate-200/60 p-1 border border-slate-200/40 max-w-md shadow-sm">
          <button
            type="button"
            onClick={() => setActiveTab("table")}
            className={`flex items-center justify-center space-x-2 w-full rounded-lg py-2 text-xs font-semibold transition-all duration-200 cursor-pointer ${
              activeTab === "table" 
                ? "bg-white text-slate-800 shadow-sm" 
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <i className="fa-solid fa-inbox text-[11px]"></i>
            <span>Tabel Respon</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("analytics")}
            className={`flex items-center justify-center space-x-2 w-full rounded-lg py-2 text-xs font-semibold transition-all duration-200 cursor-pointer ${
              activeTab === "analytics" 
                ? "bg-white text-slate-800 shadow-sm" 
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <i className="fa-solid fa-chart-bar text-[11px]"></i>
            <span>Grafik Ringkasan</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ai_insights")}
            className={`flex items-center justify-center space-x-2 w-full rounded-lg py-2 text-xs font-semibold transition-all duration-200 cursor-pointer ${
              activeTab === "ai_insights" 
                ? "bg-white text-slate-800 shadow-sm" 
                : "text-slate-500 hover:text-slate-850"
            }`}
          >
            <i className="fa-solid fa-wand-magic-sparkles text-[11px] text-indigo-600 animate-pulse"></i>
            <span>Analisis AI 👑</span>
          </button>
        </div>

        {/* TAB 1: DATA TABLE */}
        {activeTab === "table" && (
          <>
            {/* Responses statistics */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <h2 className="text-base font-bold text-slate-800 flex items-center">
                Daftar Tanggapan Masuk
                <span className="ml-2.5 px-2.5 py-0.5 rounded-full text-xs bg-white border border-slate-200 text-slate-500 font-semibold shadow-sm animate-fade-in">
                  {filteredResponses.length} Hasil
                </span>
              </h2>

              <div className="relative w-full sm:w-64">
                <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                <input
                  type="text"
                  placeholder="Cari kata kunci..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all shadow-sm"
                />
              </div>
            </div>

            {/* Table & Data */}
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
              {responses.length === 0 ? (
                <div className="p-16 text-center flex flex-col items-center justify-center space-y-4">
                  <div className="h-12 w-12 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-200">
                    <i className="fa-solid fa-inbox text-slate-400 text-lg"></i>
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-slate-800 text-base">Belum ada tanggapan</h3>
                    <p className="text-slate-500 text-xs max-w-sm mx-auto leading-relaxed">
                      Kirim link publik formulir ini ke pengisi, dan tanggapan mereka akan muncul secara instan di tabel ini.
                    </p>
                  </div>
                </div>
              ) : filteredResponses.length === 0 ? (
                <div className="p-16 text-center flex flex-col items-center justify-center space-y-2">
                  <div className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center border border-slate-200">
                    <i className="fa-solid fa-magnifying-glass text-slate-400"></i>
                  </div>
                  <p className="text-slate-500 text-xs font-semibold">
                    Tidak ada tanggapan yang cocok dengan kata pencarian.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col animate-fade-in">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-slate-50 border-b border-slate-200">
                        <TableRow className="hover:bg-transparent border-b-slate-200">
                          <TableHead className="w-16 text-slate-500 font-bold uppercase tracking-wider text-[10px] py-3.5 px-5">ID</TableHead>
                          <TableHead className="w-44 text-slate-500 font-bold uppercase tracking-wider text-[10px] py-3.5 px-5">
                            <span className="flex items-center gap-1.5">
                              <i className="fa-regular fa-clock text-slate-500 text-xs"></i>
                              Waktu Kirim
                            </span>
                          </TableHead>
                          <TableHead className="w-32 text-slate-500 font-bold uppercase tracking-wider text-[10px] py-3.5 px-5">IP Address</TableHead>
                          {fields.map((field) => (
                            <TableHead key={field.id} className="text-slate-500 font-bold uppercase tracking-wider text-[10px] py-3.5 px-5 min-w-[150px]">
                              {field.label}
                            </TableHead>
                          ))}
                          <TableHead className="w-20 text-slate-500 font-bold uppercase tracking-wider text-[10px] py-3.5 px-5 text-right">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedResponses.map((res) => (
                          <TableRow key={res.id} className="hover:bg-slate-50/50 border-b border-slate-100 transition-colors">
                            <TableCell className="font-mono text-xs text-slate-400 py-4 px-5">{res.id}</TableCell>
                            <TableCell className="text-xs text-slate-500 py-4 px-5">
                              {new Date(res.created_at).toLocaleString("id-ID", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit"
                              })}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-slate-400 py-4 px-5">
                              {res.ip_address || "-"}
                            </TableCell>
                            {fields.map((field) => {
                              const parsedAnswers = typeof res.answers === "string" ? JSON.parse(res.answers) : res.answers;
                              const val = parsedAnswers[field.id];
                              return (
                                <TableCell key={field.id} className="text-sm text-slate-700 py-4 px-5 max-w-[300px] truncate">
                                  {isUrl(val) ? (
                                    <Link 
                                      href={val} 
                                      target="_blank" 
                                      className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 border border-indigo-200 px-2.5 py-1 text-xs text-indigo-600 font-bold hover:bg-indigo-100 transition-all shadow-inner"
                                    >
                                      Unduh Berkas
                                      <i className="fa-solid fa-arrow-up-right-from-square text-[9px]"></i>
                                    </Link>
                                  ) : val === undefined || val === null ? (
                                    <span className="text-slate-400">-</span>
                                  ) : Array.isArray(val) ? (
                                    val.join(", ")
                                  ) : (
                                    String(val)
                                  )}
                                </TableCell>
                              );
                            })}
                            <TableCell className="text-right py-4 px-5">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleDeleteResponse(res.id)}
                                disabled={isPending}
                                className="h-8 w-8 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                              >
                                <i className="fa-regular fa-trash-can text-sm"></i>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination controls */}
                  {totalPages > 1 && (
                    <div className="border-t border-slate-100 bg-slate-50/30 px-5 py-3.5 flex items-center justify-between">
                      <div className="text-xs text-slate-500 font-semibold">
                        Menampilkan <span className="text-slate-700">{startIndex + 1}</span> hingga{" "}
                        <span className="text-slate-700">{Math.min(startIndex + itemsPerPage, totalItems)}</span> dari{" "}
                        <span className="text-slate-700">{totalItems}</span> tanggapan
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                          disabled={currentPage === 1}
                          className="h-8 w-8 border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none rounded-lg cursor-pointer shadow-sm"
                        >
                          <i className="fa-solid fa-chevron-left text-xs"></i>
                        </Button>
                        <span className="text-xs text-slate-500 font-bold px-1 font-mono">
                          Halaman {currentPage} / {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                          disabled={currentPage === totalPages}
                          className="h-8 w-8 border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none rounded-lg cursor-pointer shadow-sm"
                        >
                          <i className="fa-solid fa-chevron-right text-xs"></i>
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* TAB 2: ANALYTICS CHARTS */}
        {activeTab === "analytics" && (
          <div className="space-y-6 animate-fade-in">
            {responses.length === 0 ? (
              <Card className="border border-slate-200 bg-white p-16 text-center text-slate-500 text-xs font-semibold shadow-sm">
                Belum ada tanggapan masuk untuk dianalisis.
              </Card>
            ) : (
              <>
                {/* Daily Submissions Line Chart */}
                <Card className="bg-white border border-slate-200 shadow-sm rounded-2xl relative overflow-hidden transition-all duration-300 hover:border-slate-400">
                  <div className="py-4 px-6 border-b border-slate-100 bg-slate-50/50 flex flex-col gap-0.5">
                    <h3 className="text-sm font-bold text-slate-800 leading-tight">Tren Tanggapan Harian</h3>
                    <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider font-bold">
                      Grafik Garis Kunjungan & Pengisian
                    </span>
                  </div>
                  <CardContent className="p-6">
                    {(() => {
                      const trendData = getDailyTrend();
                      if (trendData.length === 0) {
                        return <p className="text-xs text-slate-400 italic">Tidak ada data tren harian.</p>;
                      }
                      const maxCount = Math.max(...trendData.map(d => d.count), 1);
                      const width = 600;
                      const height = 200;
                      const paddingLeft = 40;
                      const paddingRight = 20;
                      const paddingTop = 20;
                      const paddingBottom = 30;
                      
                      const chartWidth = width - paddingLeft - paddingRight;
                      const chartHeight = height - paddingTop - paddingBottom;
                      
                      const points = trendData.map((d, i) => {
                        const x = paddingLeft + (i / Math.max(trendData.length - 1, 1)) * chartWidth;
                        const y = height - paddingBottom - (d.count / maxCount) * chartHeight;
                        return `${x},${y}`;
                      }).join(" ");

                      const fillPoints = `${paddingLeft},${height - paddingBottom} ${points} ${paddingLeft + chartWidth},${height - paddingBottom}`;

                      return (
                        <div className="w-full overflow-x-auto">
                          <svg className="w-full min-w-[500px]" viewBox={`0 0 ${width} ${height}`} height={height}>
                            <defs>
                              <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
                                <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                              </linearGradient>
                            </defs>
                            
                            {/* Horizontal Gridlines */}
                            {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                              const y = paddingTop + ratio * chartHeight;
                              const gridVal = Math.round(maxCount * (1 - ratio));
                              return (
                                <g key={idx}>
                                  <line 
                                    x1={paddingLeft} 
                                    y1={y} 
                                    x2={width - paddingRight} 
                                    y2={y} 
                                    className="stroke-slate-100" 
                                    strokeWidth="1" 
                                  />
                                  <text 
                                    x={paddingLeft - 10} 
                                    y={y + 3} 
                                    className="text-[9px] fill-slate-400 font-semibold font-mono text-right" 
                                    textAnchor="end"
                                  >
                                    {gridVal}
                                  </text>
                                </g>
                              );
                            })}

                            {/* Area Fill under line */}
                            <polygon points={fillPoints} fill="url(#chart-grad)" />

                            {/* The Trend Line */}
                            <polyline 
                              fill="none" 
                              stroke="#6366f1" 
                              strokeWidth="3" 
                              points={points} 
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />

                            {/* Interactive Data Dots & Labels */}
                            {trendData.map((d, i) => {
                              const x = paddingLeft + (i / Math.max(trendData.length - 1, 1)) * chartWidth;
                              const y = height - paddingBottom - (d.count / maxCount) * chartHeight;
                              return (
                                <g key={i}>
                                  <circle 
                                    cx={x} 
                                    cy={y} 
                                    r="4.5" 
                                    className="fill-indigo-600 stroke-white stroke-2 shadow-sm" 
                                  />
                                  <text 
                                    x={x} 
                                    y={y - 8} 
                                    className="text-[10px] fill-slate-800 font-black font-mono" 
                                    textAnchor="middle"
                                  >
                                    {d.count}
                                  </text>
                                  <text 
                                    x={x} 
                                    y={height - paddingBottom + 18} 
                                    className="text-[9px] fill-slate-500 font-bold" 
                                    textAnchor="middle"
                                  >
                                    {d.date}
                                  </text>
                                </g>
                              );
                            })}
                          </svg>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>

                {/* Question Analytics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {fields.map((field) => {
                    // CHOICE FIELDS: radio and select rendering visual donut charts
                    if (field.type === "radio" || field.type === "select") {
                      const stats = getFieldStats(field);
                      return (
                        <Card key={field.id} className="bg-white border border-slate-200 shadow-sm rounded-2xl relative overflow-hidden transition-all duration-300 hover:border-slate-400">
                          <div className="py-4 px-6 border-b border-slate-100 bg-slate-50/50 flex flex-col gap-0.5">
                            <h3 className="text-sm font-bold text-slate-800 leading-tight">{field.label}</h3>
                            <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider font-bold">
                              Diagram Persentase Opsi ({field.type})
                            </span>
                          </div>
                          <div className="p-6">
                            {stats.length === 0 ? (
                              <p className="text-xs text-slate-400 italic">Tidak ada opsi.</p>
                            ) : (
                              <DonutChart stats={stats} />
                            )}
                          </div>
                        </Card>
                      );
                    }

                    // TEXT FIELDS: text and textarea listing recent text responses
                    if (field.type === "text" || field.type === "textarea") {
                      const textAnswers = responses
                        .map(r => {
                          const parsedAnswers = typeof r.answers === "string" ? JSON.parse(r.answers) : r.answers;
                          return parsedAnswers[field.id];
                        })
                        .filter(val => val !== undefined && val !== null && String(val).trim() !== "")
                        .slice(0, 5); // get latest 5

                      return (
                        <Card key={field.id} className="bg-white border border-slate-200 shadow-sm rounded-2xl relative overflow-hidden transition-all duration-300 hover:border-slate-300">
                          <div className="py-4 px-6 border-b border-slate-100 bg-slate-50/50 flex flex-col gap-0.5">
                            <h3 className="text-sm font-bold text-slate-800 leading-tight">{field.label}</h3>
                            <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider font-bold">
                              Teks Masuk Terkini (Maks. 5)
                            </span>
                          </div>
                          <div className="p-2 divide-y divide-slate-100">
                            {textAnswers.length === 0 ? (
                              <p className="text-xs text-slate-400 italic p-6 text-center font-semibold">Belum ada jawaban teks.</p>
                            ) : (
                              textAnswers.map((ans, idx) => (
                                <div key={idx} className="py-3.5 px-4 hover:bg-slate-50/40 transition-colors">
                                  <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                                    {String(ans)}
                                  </p>
                                </div>
                              ))
                            )}
                          </div>
                        </Card>
                      );
                    }

                    // FILE FIELDS: list latest uploaded files
                    if (field.type === "file") {
                      const uploadedFilesList = responses
                        .map(r => {
                          const parsedAnswers = typeof r.answers === "string" ? JSON.parse(r.answers) : r.answers;
                          return parsedAnswers[field.id];
                        })
                        .filter(val => val !== undefined && val !== null && isUrl(val))
                        .slice(0, 5); // get latest 5

                      return (
                        <Card key={field.id} className="bg-white border border-slate-200 shadow-sm rounded-2xl relative overflow-hidden transition-all duration-300 hover:border-slate-300">
                          <div className="py-4 px-6 border-b border-slate-100 bg-slate-50/50 flex flex-col gap-0.5">
                            <h3 className="text-sm font-bold text-slate-800 leading-tight">{field.label}</h3>
                            <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider font-bold">
                              Berkas Terkini (Maks. 5)
                            </span>
                          </div>
                          <div className="p-2 divide-y divide-slate-100">
                            {uploadedFilesList.length === 0 ? (
                              <p className="text-xs text-slate-400 italic p-6 text-center font-semibold">Belum ada berkas terunggah.</p>
                            ) : (
                              uploadedFilesList.map((url, idx) => {
                                const filename = url.split("/").pop() || "Unduh File";
                                return (
                                  <div key={idx} className="py-3 px-4 flex items-center justify-between text-xs hover:bg-slate-50/40 transition-colors">
                                    <span className="text-slate-500 font-semibold truncate max-w-[200px] font-mono text-[11px]" title={filename}>
                                      {filename}
                                    </span>
                                    <Link 
                                      href={url} 
                                      target="_blank" 
                                      className="inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700 font-bold transition-colors"
                                    >
                                      Buka Berkas
                                      <i className="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
                                    </Link>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </Card>
                      );
                    }

                    return null;
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB 3: AI INSIGHTS */}
        {activeTab === "ai_insights" && (
          <div className="space-y-6 animate-fade-in">
            {!isPremium ? (
              <Card className="pt-12 pb-12 flex flex-col items-center text-center p-8 bg-gradient-to-br from-indigo-50/50 via-purple-50/20 to-pink-50/50 border border-indigo-100 rounded-2xl shadow-sm">
                <div className="h-16 w-16 rounded-2xl bg-indigo-100 flex items-center justify-center mb-4 border border-indigo-200/50">
                  <i className="fa-solid fa-lock text-indigo-600 text-2xl animate-pulse"></i>
                </div>
                <h3 className="text-lg font-bold text-slate-800">Fitur Analisis Jawaban AI Khusus Premium</h3>
                <p className="text-sm text-slate-500 max-w-md mt-1.5 leading-relaxed">
                  Dapatkan ringkasan eksekutif, temuan penting, analisis tren sentimen, dan rekomendasi langkah tindakan secara instan berdasarkan seluruh data tanggapan yang masuk.
                </p>
                <Link href="/admin/premium" className="mt-5 inline-flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold text-sm px-6 py-3 rounded-xl shadow-md transition-all duration-200 cursor-pointer">
                  <i className="fa-solid fa-crown text-amber-300"></i> Upgrade ke Pro (Premium)
                </Link>
              </Card>
            ) : responses.length === 0 ? (
              <Card className="border border-slate-200 bg-white p-16 text-center text-slate-500 text-xs font-semibold shadow-sm">
                Belum ada tanggapan masuk untuk dianalisis oleh AI.
              </Card>
            ) : (
              <Card className="bg-white border border-slate-200 shadow-sm rounded-2xl relative overflow-hidden transition-all duration-300 hover:border-slate-400">
                <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
                <CardHeader className="border-b border-slate-100 bg-slate-50/40 pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                        <i className="fa-solid fa-wand-magic-sparkles text-indigo-600"></i> Analisis Cerdas Tanggapan AI
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {aiInsightsUpdatedAt ? (
                          <span>Terakhir diperbarui: {new Date(aiInsightsUpdatedAt).toLocaleString("id-ID")}</span>
                        ) : (
                          <span>Analisis AI belum dibuat untuk tanggapan saat ini.</span>
                        )}
                      </CardDescription>
                    </div>
                    <Button
                      onClick={handleGenerateAiInsights}
                      disabled={isAiInsightsGenerating}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-4 h-9 rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer ml-auto sm:ml-0"
                    >
                      {isAiInsightsGenerating ? (
                        <>
                          <i className="fa-solid fa-circle-notch fa-spin"></i> Menganalisis...
                        </>
                      ) : aiInsights ? (
                        <>
                          <i className="fa-solid fa-arrows-rotate"></i> Perbarui Analisis
                        </>
                      ) : (
                        <>
                          <i className="fa-solid fa-wand-magic-sparkles"></i> Buat Analisis AI
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  {aiInsights ? (
                    <div className="prose prose-slate max-w-none space-y-4">
                      {renderMarkdown(aiInsights)}
                    </div>
                  ) : (
                    <div className="text-center py-12 space-y-3">
                      <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                        <i className="fa-solid fa-brain text-xl"></i>
                      </div>
                      <h4 className="text-sm font-bold text-slate-700">Analisis AI Belum Dibuat</h4>
                      <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                        Klik tombol "Buat Analisis AI" di atas untuk memproses ringkasan pintar dan analisis sentimen responden.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

      </main>

      {/* Custom Confirmation Modal */}
      {confirmModal && confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-fade-in">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-scale-up">
            <div className="p-6 text-center space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 border border-rose-100 text-rose-500 shadow-sm">
                <i className="fa-solid fa-triangle-exclamation text-xl"></i>
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-black text-slate-900">{confirmModal.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{confirmModal.message}</p>
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <Button
                variant="ghost"
                onClick={() => setConfirmModal(null)}
                className="text-slate-500 hover:text-slate-700 h-9 px-4 text-xs font-semibold cursor-pointer rounded-xl"
              >
                Batal
              </Button>
              <Button
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal(null);
                }}
                className="bg-rose-600 hover:bg-rose-700 text-white h-9 px-5 text-xs font-bold shadow-sm rounded-xl cursor-pointer"
              >
                Hapus Permanen
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const DonutChart = ({ stats }: { stats: { option: string; count: number; percentage: number }[] }) => {
  const r = 35;
  const C = 2 * Math.PI * r;
  let accumulatedOffset = 0;
  const colors = [
    "#6366f1", // indigo
    "#8b5cf6", // violet
    "#ec4899", // pink
    "#10b981", // emerald
    "#f59e0b", // amber
    "#3b82f6", // blue
    "#ef4444", // red
  ];
  const total = stats.reduce((acc, curr) => acc + curr.count, 0);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
      {/* Donut circle */}
      <div className="relative w-28 h-28 shrink-0">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r={r}
            className="stroke-slate-100"
            strokeWidth="8"
            fill="transparent"
          />
          {stats.map((item, idx) => {
            const strokeLength = (item.percentage / 100) * C;
            const strokeOffset = C - strokeLength + accumulatedOffset;
            accumulatedOffset -= strokeLength;
            const color = colors[idx % colors.length];

            if (item.percentage === 0) return null;

            return (
              <circle
                key={idx}
                cx="50"
                cy="50"
                r={r}
                stroke={color}
                strokeWidth="10"
                strokeDasharray={C}
                strokeDashoffset={strokeOffset}
                strokeLinecap="round"
                fill="transparent"
                className="transition-all duration-500 ease-out"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Total</span>
          <span className="text-base font-black text-slate-800">{total}</span>
        </div>
      </div>

      {/* Legend table */}
      <div className="flex-1 space-y-2 w-full">
        {stats.map((item, idx) => {
          const color = colors[idx % colors.length];
          return (
            <div key={idx} className="flex justify-between items-center text-xs">
              <div className="flex items-center space-x-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <span className="text-slate-600 font-bold truncate" title={item.option}>{item.option}</span>
              </div>
              <span className="text-slate-500 font-bold shrink-0 pl-2">
                {item.count} ({item.percentage}%)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

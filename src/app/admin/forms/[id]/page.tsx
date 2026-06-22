"use client";

import React, { useEffect, useState, useTransition, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getFormDetailAction, deleteFormAction, toggleFormActiveAction, deleteResponseAction } from "@/app/actions/forms";
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
import { 
  ArrowLeft, 
  Download, 
  Trash2, 
  Calendar, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Loader2,
  ExternalLink,
  FileSpreadsheet,
  Inbox,
  Clock,
  Settings,
  Share2,
  Copy,
  QrCode,
  Code,
  BarChart3
} from "lucide-react";

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

  // Tab View state: "table" vs "analytics"
  const [activeTab, setActiveTab] = useState<"table" | "analytics">("table");
  
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
    } else {
      toast.error(result.error || "Gagal memuat detail formulir.");
      router.push("/admin");
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchFormDetails();
  }, [formId]);

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
    if (!confirm("Apakah Anda yakin ingin menghapus formulir ini beserta seluruh responsnya secara permanen?")) {
      return;
    }

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
  };

  const handleDeleteResponse = async (responseId: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus baris tanggapan ini? Berkas yang diunggah pengisi juga akan dihapus dari storage secara permanen.")) {
      return;
    }

    startTransition(async () => {
      const result = await deleteResponseAction(responseId);
      if (result.success) {
        toast.success("Tanggapan berhasil dihapus.");
        fetchFormDetails();
      } else {
        toast.error(result.error || "Gagal menghapus tanggapan.");
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
        <p className="text-sm text-neutral-400 font-medium">Memuat detail formulir...</p>
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
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-neutral-900 bg-neutral-950/50 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/admin">
            <Button variant="ghost" size="sm" className="text-neutral-400 hover:text-neutral-200">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Dasbor Utama
            </Button>
          </Link>
          
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleToggleActive}
              className={`h-9 px-3 border border-neutral-800 transition-all duration-205 ${
                form.is_active 
                  ? "text-emerald-400 hover:text-emerald-350 hover:bg-emerald-950/15" 
                  : "text-amber-555 hover:text-amber-450 hover:bg-amber-950/15"
              }`}
            >
              <span className={`h-2 w-2 rounded-full mr-2 ${form.is_active ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`} />
              {form.is_active ? "Form Aktif" : "Form Tutup"}
            </Button>

            <Link href={`/admin/forms/${form.id}/edit`}>
              <Button 
                variant="outline" 
                size="sm" 
                className="border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900 h-9"
              >
                <Settings className="h-4 w-4 mr-1.5" />
                Edit Form
              </Button>
            </Link>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowShare(!showShare)}
              className={`border-neutral-800 text-neutral-400 hover:text-neutral-200 h-9 ${showShare ? "bg-neutral-900" : ""}`}
            >
              <Share2 className="h-4 w-4 mr-1.5" />
              Bagikan
            </Button>

            <Link href={`/forms/${form.id}`} target="_blank">
              <Button 
                variant="outline" 
                size="sm" 
                className="border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900 h-9"
              >
                <ExternalLink className="h-4 w-4 mr-1.5" />
                Link Publik
              </Button>
            </Link>

            <Button
              size="sm"
              variant="ghost"
              onClick={handleDeleteForm}
              disabled={isPending}
              className="text-neutral-500 hover:text-red-400 hover:bg-red-950/20 h-9"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  Hapus
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Form Meta details */}
        <Card className="bg-neutral-900/20 border-neutral-900 shadow-md">
          <CardContent className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-bold text-neutral-200">{form.title}</h1>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${
                  form.is_active 
                    ? "bg-emerald-950/20 border-emerald-900/50 text-emerald-400" 
                    : "bg-amber-950/20 border-amber-900/50 text-amber-500"
                }`}>
                  {form.is_active ? "Aktif" : "Ditutup"}
                </span>
                {form.max_responses === 1 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-neutral-900 border border-neutral-800 text-neutral-400">
                    Batasi 1 IP
                  </span>
                )}
              </div>
              {form.description && (
                <p className="text-neutral-400 text-sm max-w-2xl">{form.description}</p>
              )}
              <div className="flex items-center space-x-4 text-xs text-neutral-500 pt-1">
                <span className="flex items-center">
                  <Calendar className="h-3.5 w-3.5 mr-1" />
                  Dibuat pada {new Date(form.created_at).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric"
                  })}
                </span>
                <span>•</span>
                <span>{fields.length} Pertanyaan</span>
              </div>
            </div>

            <Button 
              onClick={handleExportCSV}
              disabled={filteredResponses.length === 0}
              className="bg-primary text-primary-foreground hover:bg-primary/95 font-medium h-10 shrink-0"
            >
              <Download className="h-4 w-4 mr-2" />
              Ekspor ke CSV
            </Button>
          </CardContent>
        </Card>

        {/* Collapsible Share Panel */}
        {showShare && (
          <Card className="bg-neutral-900/35 border-neutral-900 shadow-md relative overflow-hidden transition-all duration-300">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-violet-500/20 via-violet-500 to-violet-500/20" />
            <CardHeader className="py-4 px-6 border-b border-neutral-900/40 bg-neutral-900/10">
              <CardTitle className="text-sm font-semibold text-neutral-200">Bagikan Formulir & Kode Embed</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                {/* QR Code */}
                <div className="md:col-span-3 flex flex-col items-center justify-center space-y-3 bg-neutral-950/40 p-4 border border-neutral-900 rounded-lg">
                  <span className="text-xs text-neutral-400 font-semibold flex items-center gap-1.5">
                    <QrCode className="h-3.5 w-3.5 text-violet-400" />
                    Scan QR Code
                  </span>
                  <div className="bg-white p-2 rounded-lg">
                    <img src={qrCodeUrl} alt="QR Code Link Form" className="w-[120px] h-[120px]" />
                  </div>
                  <a 
                    href={qrCodeUrl} 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-[10px] text-violet-400 hover:underline flex items-center"
                  >
                    Buka File QR (Download)
                  </a>
                </div>

                {/* Share Links & Embed Codes */}
                <div className="md:col-span-9 space-y-4">
                  {/* Public Link */}
                  <div className="space-y-1.5">
                    <Label className="text-neutral-400 text-xs font-semibold">Tautan Formulir</Label>
                    <div className="flex space-x-2">
                      <input 
                        type="text" 
                        readOnly 
                        value={formUrl}
                        className="bg-neutral-950 border border-neutral-850 text-neutral-300 text-xs rounded-md px-3 py-2 flex-1 focus:outline-none"
                      />
                      <Button 
                        size="sm"
                        onClick={() => copyToClipboard(formUrl, "Link formulir berhasil disalin!")}
                        className="bg-neutral-900 border border-neutral-850 hover:bg-neutral-800 text-neutral-300 px-3"
                      >
                        <Copy className="h-3.5 w-3.5 mr-1" />
                        Salin
                      </Button>
                    </div>
                  </div>

                  {/* Embed Iframe */}
                  <div className="space-y-1.5">
                    <Label className="text-neutral-400 text-xs font-semibold flex items-center gap-1">
                      <Code className="h-3.5 w-3.5 text-violet-400" />
                      HTML Embed Iframe (Tempel di Web Anda)
                    </Label>
                    <div className="flex space-x-2">
                      <input 
                        type="text" 
                        readOnly 
                        value={embedCode}
                        className="bg-neutral-950 border border-neutral-850 text-neutral-300 text-xs rounded-md px-3 py-2 flex-1 focus:outline-none font-mono"
                      />
                      <Button 
                        size="sm"
                        onClick={() => copyToClipboard(embedCode, "Kode embed iframe berhasil disalin!")}
                        className="bg-neutral-900 border border-neutral-850 hover:bg-neutral-800 text-neutral-300 px-3"
                      >
                        <Copy className="h-3.5 w-3.5 mr-1" />
                        Salin
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tab View Header: Table vs Charts */}
        <div className="flex border-b border-neutral-900">
          <Button
            variant="ghost"
            onClick={() => setActiveTab("table")}
            className={`h-11 px-6 rounded-none border-b-2 hover:bg-transparent font-medium text-sm transition-all ${
              activeTab === "table" 
                ? "border-primary text-primary" 
                : "border-transparent text-neutral-450 hover:text-neutral-200"
            }`}
          >
            <Inbox className="h-4 w-4 mr-2" />
            Tabel Respon Mentah
          </Button>
          <Button
            variant="ghost"
            onClick={() => setActiveTab("analytics")}
            className={`h-11 px-6 rounded-none border-b-2 hover:bg-transparent font-medium text-sm transition-all ${
              activeTab === "analytics" 
                ? "border-primary text-primary" 
                : "border-transparent text-neutral-450 hover:text-neutral-200"
            }`}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Analisis Grafik Ringkasan
          </Button>
        </div>

        {/* TAB 1: DATA TABLE */}
        {activeTab === "table" && (
          <>
            {/* Responses statistics */}
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-neutral-250 flex items-center">
                Daftar Tanggapan Masuk
                <span className="ml-2.5 px-2 py-0.5 rounded-full text-xs bg-neutral-900 border border-neutral-800 text-neutral-450">
                  {filteredResponses.length} Hasil
                </span>
              </h2>

              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-500" />
                <input
                  type="text"
                  placeholder="Cari kata kunci..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-neutral-900/40 border border-neutral-900 rounded-md pl-9 pr-3 py-1.5 text-xs text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-neutral-800 transition-colors"
                />
              </div>
            </div>

            {/* Table & Data */}
            <Card className="bg-neutral-900/10 border-neutral-900 overflow-hidden">
              {responses.length === 0 ? (
                <div className="p-16 text-center flex flex-col items-center justify-center space-y-3">
                  <div className="h-10 w-10 rounded-full bg-neutral-900/50 flex items-center justify-center border border-neutral-800">
                    <Inbox className="h-5 w-5 text-neutral-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-neutral-200">Belum ada tanggapan</h3>
                    <p className="text-neutral-550 text-sm mt-1 max-w-sm">
                      Kirim link formulir ini ke pengisi, dan tanggapan mereka akan muncul secara instan di tabel ini.
                    </p>
                  </div>
                </div>
              ) : filteredResponses.length === 0 ? (
                <div className="p-16 text-center text-neutral-550 text-sm">
                  Tidak ada tanggapan yang cocok dengan kata pencarian.
                </div>
              ) : (
                <div className="flex flex-col">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-neutral-900/30 border-b border-neutral-900">
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="w-16 text-neutral-450 font-semibold py-3 px-4">ID</TableHead>
                          <TableHead className="w-44 text-neutral-450 font-semibold py-3 px-4">
                            <span className="flex items-center">
                              <Clock className="h-3.5 w-3.5 mr-1" />
                              Waktu Kirim
                            </span>
                          </TableHead>
                          <TableHead className="w-32 text-neutral-450 font-semibold py-3 px-4">IP Address</TableHead>
                          {fields.map((field) => (
                            <TableHead key={field.id} className="text-neutral-450 font-semibold py-3 px-4 min-w-[150px]">
                              {field.label}
                            </TableHead>
                          ))}
                          <TableHead className="w-20 text-neutral-450 font-semibold py-3 px-4 text-right">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedResponses.map((res) => (
                          <TableRow key={res.id} className="hover:bg-neutral-900/10 border-b border-neutral-900/40">
                            <TableCell className="font-mono text-xs text-neutral-500 py-3.5 px-4">{res.id}</TableCell>
                            <TableCell className="text-xs text-neutral-400 py-3.5 px-4">
                              {new Date(res.created_at).toLocaleString("id-ID", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit"
                              })}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-neutral-500 py-3.5 px-4">
                              {res.ip_address || "-"}
                            </TableCell>
                            {fields.map((field) => {
                              const parsedAnswers = typeof res.answers === "string" ? JSON.parse(res.answers) : res.answers;
                              const val = parsedAnswers[field.id];
                              return (
                                <TableCell key={field.id} className="text-sm text-neutral-200 py-3.5 px-4 max-w-[300px] truncate">
                                  {isUrl(val) ? (
                                    <Link 
                                      href={val} 
                                      target="_blank" 
                                      className="text-primary hover:underline inline-flex items-center font-medium"
                                    >
                                      Unduh File
                                      <ExternalLink className="h-3.5 w-3.5 ml-1 inline" />
                                    </Link>
                                  ) : val === undefined || val === null ? (
                                    <span className="text-neutral-600">-</span>
                                  ) : Array.isArray(val) ? (
                                    val.join(", ")
                                  ) : (
                                    String(val)
                                  )}
                                </TableCell>
                              );
                            })}
                            <TableCell className="text-right py-3.5 px-4">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleDeleteResponse(res.id)}
                                disabled={isPending}
                                className="h-7 w-7 text-neutral-500 hover:text-red-400"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination controls */}
                  {totalPages > 1 && (
                    <div className="border-t border-neutral-900 bg-neutral-900/10 px-4 py-3 flex items-center justify-between">
                      <div className="text-xs text-neutral-500">
                        Menampilkan <span className="text-neutral-450">{startIndex + 1}</span> hingga{" "}
                        <span className="text-neutral-450">{Math.min(startIndex + itemsPerPage, totalItems)}</span> dari{" "}
                        <span className="text-neutral-450">{totalItems}</span> tanggapan
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                          disabled={currentPage === 1}
                          className="h-8 w-8 border-neutral-800 disabled:opacity-30"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-xs text-neutral-400 font-medium px-2">
                          Halaman {currentPage} dari {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                          disabled={currentPage === totalPages}
                          className="h-8 w-8 border-neutral-800 disabled:opacity-30"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </>
        )}

        {/* TAB 2: ANALYTICS CHARTS */}
        {activeTab === "analytics" && (
          <div className="space-y-6">
            {responses.length === 0 ? (
              <Card className="bg-neutral-900/10 border-neutral-900 p-16 text-center text-neutral-500 text-sm">
                Belum ada tanggapan masuk untuk dianalisis.
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {fields.map((field) => {
                  // CHOICE FIELDS: radio and select rendering visual charts
                  if (field.type === "radio" || field.type === "select") {
                    const stats = getFieldStats(field);
                    return (
                      <Card key={field.id} className="bg-neutral-900/20 border-neutral-900 overflow-hidden shadow-md">
                        <CardHeader className="py-4 px-6 border-b border-neutral-900/60 bg-neutral-900/10">
                          <CardTitle className="text-sm font-semibold text-neutral-200">{field.label}</CardTitle>
                          <CardDescription className="text-neutral-500 text-xs uppercase font-mono tracking-wider pt-0.5">
                            Visual Chart ({field.type})
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                          {stats.length === 0 ? (
                            <p className="text-xs text-neutral-500 italic">Tidak ada opsi.</p>
                          ) : (
                            stats.map((item, idx) => (
                              <div key={idx} className="space-y-1.5">
                                <div className="flex justify-between items-center text-xs">
                                  <span className="text-neutral-300 font-medium">{item.option}</span>
                                  <span className="text-neutral-450 font-semibold">{item.count} tanggapan ({item.percentage}%)</span>
                                </div>
                                <div className="h-2.5 w-full bg-neutral-950 rounded-full overflow-hidden border border-neutral-900/80">
                                  <div 
                                    className="h-full bg-gradient-to-r from-primary/60 to-primary rounded-full transition-all duration-300"
                                    style={{ width: `${item.percentage}%` }}
                                  />
                                </div>
                              </div>
                            ))
                          )}
                        </CardContent>
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
                      <Card key={field.id} className="bg-neutral-900/20 border-neutral-900 overflow-hidden shadow-md">
                        <CardHeader className="py-4 px-6 border-b border-neutral-900/60 bg-neutral-900/10">
                          <CardTitle className="text-sm font-semibold text-neutral-200">{field.label}</CardTitle>
                          <CardDescription className="text-neutral-500 text-xs uppercase font-mono tracking-wider pt-0.5">
                            Teks Masuk Terkini (Maks. 5)
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="p-4">
                          {textAnswers.length === 0 ? (
                            <p className="text-xs text-neutral-500 italic p-3">Belum ada jawaban teks.</p>
                          ) : (
                            <div className="divide-y divide-neutral-900">
                              {textAnswers.map((ans, idx) => (
                                <p key={idx} className="text-xs text-neutral-350 py-2.5 px-2 leading-relaxed">
                                  • {String(ans)}
                                </p>
                              ))}
                            </div>
                          )}
                        </CardContent>
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
                      <Card key={field.id} className="bg-neutral-900/20 border-neutral-900 overflow-hidden shadow-md">
                        <CardHeader className="py-4 px-6 border-b border-neutral-900/60 bg-neutral-900/10">
                          <CardTitle className="text-sm font-semibold text-neutral-200">{field.label}</CardTitle>
                          <CardDescription className="text-neutral-500 text-xs uppercase font-mono tracking-wider pt-0.5">
                            Berkas Terkini (Maks. 5)
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="p-4">
                          {uploadedFilesList.length === 0 ? (
                            <p className="text-xs text-neutral-500 italic p-3">Belum ada berkas terunggah.</p>
                          ) : (
                            <div className="divide-y divide-neutral-900">
                              {uploadedFilesList.map((url, idx) => {
                                const filename = url.split("/").pop() || "Unduh File";
                                return (
                                  <div key={idx} className="py-2 px-2 flex items-center justify-between text-xs">
                                    <span className="text-neutral-400 truncate max-w-[200px]" title={filename}>{filename}</span>
                                    <Link 
                                      href={url} 
                                      target="_blank" 
                                      className="text-primary hover:underline flex items-center shrink-0"
                                    >
                                      Buka Berkas
                                      <ExternalLink className="h-3 w-3 ml-1" />
                                    </Link>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  }

                  return null;
                })}
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}

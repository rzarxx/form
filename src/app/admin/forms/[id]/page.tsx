"use client";

import React, { useEffect, useState, useTransition, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getFormDetailAction, deleteFormAction, toggleFormActiveAction } from "@/app/actions/forms";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Clock
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

  const handleExportCSV = () => {
    if (!form || responses.length === 0) {
      toast.error("Tidak ada tanggapan untuk diekspor.");
      return;
    }

    try {
      // fields is already defined in parent component scope and safely parsed
      
      // Setup CSV headers
      const headers = ["ID", "Waktu Pengiriman", ...fields.map(f => f.label)];
      
      // Setup CSV rows
      const rows = responses.map(res => {
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
        
        return [res.id, dateStr, ...answerValues];
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
      link.setAttribute("download", `respons_${cleanTitle}_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("File CSV berhasil diunduh.");
    } catch (err) {
      console.error("CSV Export failed:", err);
      toast.error("Gagal mengekspor data ke CSV.");
    }
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
    });
  });

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
        <p className="text-sm text-neutral-400">Memuat detail formulir...</p>
      </div>
    );
  }

  if (!form) {
    return null;
  }

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
              className={`h-9 px-3 border border-neutral-800 transition-all duration-200 ${
                form.is_active 
                  ? "text-emerald-400 hover:text-emerald-350 hover:bg-emerald-950/15" 
                  : "text-amber-500 hover:text-amber-450 hover:bg-amber-950/15"
              }`}
            >
              <span className={`h-2 w-2 rounded-full mr-2 ${form.is_active ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`} />
              {form.is_active ? "Form Aktif" : "Form Tutup"}
            </Button>
            <Link href={`/forms/${form.id}`} target="_blank">
              <Button 
                variant="outline" 
                size="sm" 
                className="border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900 h-9"
              >
                <ExternalLink className="h-4 w-4 mr-1.5" />
                Buka Link Publik
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
                  Hapus Form
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
              disabled={responses.length === 0}
              className="bg-primary text-primary-foreground hover:bg-primary/95 font-medium h-10 shrink-0"
            >
              <Download className="h-4 w-4 mr-2" />
              Ekspor ke CSV
            </Button>
          </CardContent>
        </Card>

        {/* Responses statistics */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-200 flex items-center">
            <Inbox className="h-4 w-4 mr-2 text-primary" />
            Tanggapan Masuk
            <span className="ml-2.5 px-2 py-0.5 rounded-full text-xs bg-neutral-900 border border-neutral-800 text-neutral-400">
              {responses.length} Respons
            </span>
          </h2>

          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-500" />
            <input
              type="text"
              placeholder="Cari tanggapan..."
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
                <p className="text-neutral-500 text-sm mt-1 max-w-sm">
                  Kirim link formulir ini ke pengisi, dan tanggapan mereka akan muncul secara instan di tabel ini.
                </p>
              </div>
            </div>
          ) : filteredResponses.length === 0 ? (
            <div className="p-16 text-center text-neutral-500 text-sm">
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
                      {fields.map((field) => (
                        <TableHead key={field.id} className="text-neutral-450 font-semibold py-3 px-4 min-w-[150px]">
                          {field.label}
                        </TableHead>
                      ))}
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

      </main>
    </div>
  );
}

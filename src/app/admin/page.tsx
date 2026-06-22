"use client";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getFormsAction, deleteFormAction } from "@/app/actions/forms";
import { logoutAction } from "@/app/actions/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { 
  Plus, 
  Trash2, 
  FileText, 
  ExternalLink, 
  Eye, 
  LogOut, 
  BarChart3, 
  Database,
  Search,
  Calendar,
  Loader2,
  FileSpreadsheet,
  Settings,
  Sparkles,
  Layers,
  Inbox
} from "lucide-react";

interface FormSchema {
  id: string;
  title: string;
  description: string;
  created_at: string;
  fields: any[];
  response_count: number;
  is_active: boolean;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [forms, setForms] = useState<FormSchema[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const fetchForms = async () => {
    setIsLoading(true);
    const result = await getFormsAction();
    if (result.success && result.data) {
      setForms(result.data as unknown as FormSchema[]);
    } else {
      toast.error(result.error || "Gagal memuat formulir.");
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchForms();
  }, []);

  const handleLogout = async () => {
    const result = await logoutAction();
    if (result.success) {
      toast.success("Berhasil keluar.");
      router.push("/login");
      router.refresh();
    }
  };

  const handleDeleteForm = async (formId: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus formulir ini? Semua respons yang masuk juga akan dihapus permanen.")) {
      return;
    }

    startTransition(async () => {
      const result = await deleteFormAction(formId);
      if (result.success) {
        toast.success("Formulir berhasil dihapus.");
        setForms((prev) => prev.filter((f) => f.id !== formId));
      } else {
        toast.error(result.error || "Gagal menghapus formulir.");
      }
    });
  };

  // Filter forms based on search query
  const filteredForms = forms.filter((form) =>
    form.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (form.description && form.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Statistics calculation
  const totalForms = forms.length;
  const totalResponses = forms.reduce((acc, curr) => acc + curr.response_count, 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-950 via-neutral-900 to-neutral-950 text-neutral-100 flex flex-col relative overflow-hidden">
      {/* Background glow decoration */}
      <div className="absolute top-0 left-1/4 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] rounded-full bg-violet-500/5 blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="border-b border-neutral-900 bg-neutral-950/40 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-16 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary shadow-lg shadow-primary/5">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-neutral-100 via-neutral-200 to-neutral-450 bg-clip-text text-transparent">
              Personal Form Builder
            </span>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleLogout}
            className="text-neutral-450 hover:text-red-400 hover:bg-red-950/15 h-9 transition-colors"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Keluar Dasbor
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 relative z-10">
        
        {/* Top Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-neutral-50 via-neutral-100 to-neutral-350 bg-clip-text text-transparent flex items-center gap-2">
              Dasbor Administrasi
              <Sparkles className="h-5 w-5 text-primary animate-pulse" />
            </h1>
            <p className="text-neutral-400 text-sm leading-relaxed">
              Kelola lembar formulir kustom Anda, ubah struktur pertanyaan, dan analisis jawaban secara visual.
            </p>
          </div>
          <Link href="/admin/forms/new" className="shrink-0">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium px-5 h-10.5 shadow-lg shadow-primary/10 hover:shadow-primary/20 hover:scale-[1.015] transition-all duration-200">
              <Plus className="h-4.5 w-4.5 mr-2" />
              Buat Formulir Baru
            </Button>
          </Link>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Card className="bg-neutral-900/30 border-neutral-900/80 overflow-hidden relative shadow-md backdrop-blur-md">
            <div className="absolute top-0 left-0 w-[3px] h-full bg-primary" />
            <div className="absolute top-0 right-0 p-6 opacity-[0.03] pointer-events-none">
              <FileText className="h-28 w-28 text-neutral-100" />
            </div>
            <CardContent className="p-6 flex items-center justify-between">
              <div className="space-y-2">
                <CardDescription className="text-neutral-450 font-semibold tracking-wide uppercase text-[10px]">Total Formulir Aktif</CardDescription>
                <CardTitle className="text-4xl font-black tracking-tight text-neutral-100">
                  {isLoading ? <Loader2 className="h-8 w-8 animate-spin text-primary" /> : totalForms}
                </CardTitle>
                <div className="text-xs text-neutral-500 flex items-center gap-1.5 pt-1">
                  <Database className="h-3.5 w-3.5" />
                  <span>Daftar form tersimpan dalam database postgres</span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner">
                <Layers className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-neutral-900/30 border-neutral-900/80 overflow-hidden relative shadow-md backdrop-blur-md">
            <div className="absolute top-0 left-0 w-[3px] h-full bg-violet-500" />
            <div className="absolute top-0 right-0 p-6 opacity-[0.03] pointer-events-none">
              <BarChart3 className="h-28 w-28 text-neutral-100" />
            </div>
            <CardContent className="p-6 flex items-center justify-between">
              <div className="space-y-2">
                <CardDescription className="text-neutral-450 font-semibold tracking-wide uppercase text-[10px]">Total Respons Masuk</CardDescription>
                <CardTitle className="text-4xl font-black tracking-tight text-neutral-100">
                  {isLoading ? <Loader2 className="h-8 w-8 animate-spin text-primary" /> : totalResponses}
                </CardTitle>
                <div className="text-xs text-neutral-500 flex items-center gap-1.5 pt-1">
                  <Eye className="h-3.5 w-3.5" />
                  <span>Akumulasi tanggapan dari semua formulir publik</span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 shadow-inner">
                <Inbox className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search Bar & Forms List */}
        <div className="space-y-5">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-neutral-500" />
            <input
              type="text"
              placeholder="Cari berdasarkan judul formulir atau kata deskripsi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-900/20 border border-neutral-900 rounded-xl pl-11 pr-4 py-3 text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all duration-200 shadow-inner"
            />
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-neutral-500">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-2.5" />
              <p className="text-sm font-medium">Memuat data formulir...</p>
            </div>
          ) : filteredForms.length === 0 ? (
            <div className="border border-dashed border-neutral-900 rounded-xl p-16 text-center flex flex-col items-center justify-center space-y-4 bg-neutral-950/20">
              <div className="h-14 w-14 rounded-2xl bg-neutral-900/60 flex items-center justify-center border border-neutral-850 shadow-inner">
                <FileText className="h-6 w-6 text-neutral-550" />
              </div>
              <div className="max-w-sm space-y-1">
                <h3 className="font-semibold text-neutral-200">
                  {searchQuery ? "Tidak Ditemukan" : "Belum Ada Formulir"}
                </h3>
                <p className="text-neutral-500 text-xs leading-relaxed">
                  {searchQuery 
                    ? "Kata kunci pencarian tidak cocok dengan judul formulir manapun." 
                    : "Mulai buat formulir kustom pertama Anda untuk disebarkan secara publik."}
                </p>
              </div>
              {!searchQuery && (
                <Link href="/admin/forms/new">
                  <Button size="sm" className="bg-primary/20 text-primary border border-primary/20 hover:bg-primary/30 h-9 px-4">
                    Buat Sekarang
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredForms.map((form) => (
                <Card 
                  key={form.id} 
                  className="bg-neutral-900/10 border-neutral-900 hover:border-primary/20 hover:bg-neutral-900/15 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 overflow-hidden relative group"
                >
                  <CardContent className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2 max-w-2xl">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-lg text-neutral-200 group-hover:text-neutral-50 transition-colors">
                          {form.title}
                        </h3>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-violet-950/20 border border-violet-900/40 text-violet-400">
                          {form.response_count} Respons
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${
                          form.is_active !== false 
                            ? "bg-emerald-950/20 border-emerald-900/40 text-emerald-400" 
                            : "bg-amber-950/20 border-amber-900/40 text-amber-500"
                        }`}>
                          {form.is_active !== false ? "Aktif" : "Ditutup"}
                        </span>
                      </div>
                      {form.description && (
                        <p className="text-neutral-400 text-xs line-clamp-2 leading-relaxed">
                          {form.description}
                        </p>
                      )}
                      <div className="flex items-center space-x-4 text-[10px] text-neutral-550 pt-1">
                        <span className="flex items-center">
                          <Calendar className="h-3.5 w-3.5 mr-1" />
                          Dibuat: {new Date(form.created_at).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric"
                          })}
                        </span>
                        <span>•</span>
                        <span>{(Array.isArray(form.fields) ? form.fields : typeof form.fields === "string" ? JSON.parse(form.fields) : []).length} Input Lapangan</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:self-center shrink-0">
                      <Link href={`/forms/${form.id}`} target="_blank">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="border-neutral-850 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900 h-9 text-xs transition-colors"
                        >
                          <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                          Buka Form
                        </Button>
                      </Link>
                      <Link href={`/admin/forms/${form.id}`}>
                        <Button 
                          size="sm" 
                          className="bg-neutral-950 border border-neutral-850 text-neutral-300 hover:bg-neutral-900 h-9 text-xs shadow-sm hover:scale-[1.01] transition-all"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1.5 text-primary" />
                          Lihat Respons
                        </Button>
                      </Link>
                      <Link href={`/admin/forms/${form.id}/edit`}>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="border-neutral-850 text-neutral-450 hover:text-neutral-200 hover:bg-neutral-900 h-9 text-xs transition-colors"
                        >
                          <Settings className="h-3.5 w-3.5 mr-1.5" />
                          Edit Skema
                        </Button>
                      </Link>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDeleteForm(form.id)}
                        disabled={isPending}
                        className="text-neutral-550 hover:text-red-400 hover:bg-red-950/20 h-9 w-9 transition-colors"
                      >
                        {isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

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
  Settings
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
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-neutral-900 bg-neutral-950/50 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-16 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <div className="h-9 w-9 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
            </div>
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-neutral-100 to-neutral-400 bg-clip-text text-transparent">
              Personal Form Builder
            </span>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleLogout}
            className="text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Keluar
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Top Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-neutral-100 to-neutral-300 bg-clip-text text-transparent">
              Dasbor Utama
            </h1>
            <p className="text-neutral-400 text-sm mt-1">
              Kelola formulir kustom Anda dan lihat tanggapan secara real-time.
            </p>
          </div>
          <Link href="/admin/forms/new">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/95 font-medium shadow-lg hover:shadow-primary/10 transition-all duration-200">
              <Plus className="h-4 w-4 mr-2" />
              Buat Formulir
            </Button>
          </Link>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-neutral-900/50 border-neutral-900 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
              <FileText className="h-24 w-24 text-neutral-100" />
            </div>
            <CardHeader className="pb-2">
              <CardDescription className="text-neutral-400 font-medium">Total Formulir</CardDescription>
              <CardTitle className="text-4xl font-extrabold tracking-tight text-neutral-100 mt-1">
                {isLoading ? <Loader2 className="h-8 w-8 animate-spin text-neutral-500" /> : totalForms}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-neutral-500 flex items-center space-x-1">
              <Database className="h-3 w-3 text-neutral-500" />
              <span>Formulir aktif dalam database Anda</span>
            </CardContent>
          </Card>

          <Card className="bg-neutral-900/50 border-neutral-900 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
              <BarChart3 className="h-24 w-24 text-neutral-100" />
            </div>
            <CardHeader className="pb-2">
              <CardDescription className="text-neutral-400 font-medium">Total Respons Masuk</CardDescription>
              <CardTitle className="text-4xl font-extrabold tracking-tight text-neutral-100 mt-1">
                {isLoading ? <Loader2 className="h-8 w-8 animate-spin text-neutral-500" /> : totalResponses}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-neutral-500 flex items-center space-x-1">
              <Eye className="h-3 w-3 text-neutral-500" />
              <span>Tanggapan formulir dari semua pengisi</span>
            </CardContent>
          </Card>
        </div>

        {/* Search Bar & Forms List */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
            <input
              type="text"
              placeholder="Cari formulir berdasarkan judul atau deskripsi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-900/40 border border-neutral-900 rounded-lg pl-10 pr-4 py-2.5 text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-neutral-800 transition-colors"
            />
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-neutral-500">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
              <p className="text-sm">Memuat formulir...</p>
            </div>
          ) : filteredForms.length === 0 ? (
            <div className="border border-dashed border-neutral-900 rounded-xl p-12 text-center flex flex-col items-center justify-center space-y-3">
              <div className="h-12 w-12 rounded-full bg-neutral-900/50 flex items-center justify-center border border-neutral-800">
                <FileText className="h-6 w-6 text-neutral-500" />
              </div>
              <div className="max-w-sm">
                <h3 className="font-semibold text-neutral-200">
                  {searchQuery ? "Tidak ditemukan" : "Belum ada formulir"}
                </h3>
                <p className="text-neutral-500 text-sm mt-1">
                  {searchQuery 
                    ? "Kata kunci tidak cocok dengan judul formulir apa pun." 
                    : "Mulai buat formulir kustom pertama Anda dengan menekan tombol di bawah."}
                </p>
              </div>
              {!searchQuery && (
                <Link href="/admin/forms/new">
                  <Button size="sm" className="mt-2 bg-primary/20 text-primary border border-primary/20 hover:bg-primary/30">
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
                  className="bg-neutral-900/30 border-neutral-900 hover:border-neutral-800 transition-all duration-300 overflow-hidden relative group"
                >
                  <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="space-y-1.5 max-w-xl">
                      <div className="flex items-center space-x-2.5">
                        <h3 className="font-semibold text-lg text-neutral-200 group-hover:text-neutral-100 transition-colors">
                          {form.title}
                        </h3>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-neutral-900 border border-neutral-800 text-neutral-400">
                          {form.response_count} Respons
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${
                          form.is_active !== false 
                            ? "bg-emerald-950/25 border-emerald-900/50 text-emerald-400" 
                            : "bg-amber-950/25 border-amber-900/50 text-amber-500"
                        }`}>
                          {form.is_active !== false ? "Aktif" : "Ditutup"}
                        </span>
                      </div>
                      {form.description && (
                        <p className="text-neutral-400 text-sm line-clamp-2">
                          {form.description}
                        </p>
                      )}
                      <div className="flex items-center space-x-4 text-xs text-neutral-500 pt-1.5">
                        <span className="flex items-center">
                          <Calendar className="h-3.5 w-3.5 mr-1" />
                          {new Date(form.created_at).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric"
                          })}
                        </span>
                        <span>•</span>
                        <span>{(Array.isArray(form.fields) ? form.fields : typeof form.fields === "string" ? JSON.parse(form.fields) : []).length} Pertanyaan</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:self-center">
                      <Link href={`/forms/${form.id}`} target="_blank">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900 h-9"
                        >
                          <ExternalLink className="h-4 w-4 mr-1.5" />
                          Buka Form
                        </Button>
                      </Link>
                      <Link href={`/admin/forms/${form.id}`}>
                        <Button 
                          size="sm" 
                          className="bg-neutral-900 border border-neutral-800 text-neutral-200 hover:bg-neutral-800 h-9"
                        >
                          <Eye className="h-4 w-4 mr-1.5" />
                          Lihat Respons
                        </Button>
                      </Link>
                      <Link href={`/admin/forms/${form.id}/edit`}>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900 h-9"
                        >
                          <Settings className="h-4 w-4 mr-1.5" />
                          Edit
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteForm(form.id)}
                        disabled={isPending}
                        className="text-neutral-500 hover:text-red-400 hover:bg-red-950/20 h-9"
                      >
                        {isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
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

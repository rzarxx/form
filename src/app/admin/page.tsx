"use client";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getFormsAction, deleteFormAction } from "@/app/actions/forms";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

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
    <div className="bg-[#f1f5f9] text-slate-800 flex flex-col min-h-full">
      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Top Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
              Dasbor Administrasi
            </h1>
            <p className="text-slate-500 text-sm leading-relaxed">
              Kelola lembar formulir kustom Anda, ubah struktur pertanyaan, dan analisis jawaban secara visual.
            </p>
          </div>
          <Link href="/admin/forms/new" className="shrink-0">
            <Button className="bg-primary text-white hover:bg-primary/90 font-semibold px-5 h-10.5 rounded-xl shadow-md transition-all">
              <i className="fa-solid fa-plus mr-2"></i>
              Buat Formulir Baru
            </Button>
          </Link>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-white border-slate-200/80 overflow-hidden relative shadow-sm rounded-2xl">
            <div className="absolute top-0 left-0 w-[4px] h-full bg-primary" />
            <div className="absolute top-0 right-0 p-6 opacity-[0.015] pointer-events-none">
              <i className="fa-regular fa-file-lines text-9xl"></i>
            </div>
            <CardContent className="p-6 flex items-center justify-between">
              <div className="space-y-2">
                <CardDescription className="text-slate-450 font-bold tracking-wide uppercase text-[10px]">Total Formulir Aktif</CardDescription>
                <CardTitle className="text-3xl font-black tracking-tight text-slate-900">
                  {isLoading ? <i className="fa-solid fa-circle-notch fa-spin text-primary text-2xl"></i> : totalForms}
                </CardTitle>
                <div className="text-xs text-slate-400 flex items-center gap-1.5 pt-1 font-medium">
                  <i className="fa-solid fa-database"></i>
                  <span>Daftar form tersimpan dalam database postgres</span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner">
                <i className="fa-solid fa-layer-group text-lg"></i>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200/80 overflow-hidden relative shadow-sm rounded-2xl">
            <div className="absolute top-0 left-0 w-[4px] h-full bg-violet-500" />
            <div className="absolute top-0 right-0 p-6 opacity-[0.015] pointer-events-none">
              <i className="fa-regular fa-envelope text-9xl"></i>
            </div>
            <CardContent className="p-6 flex items-center justify-between">
              <div className="space-y-2">
                <CardDescription className="text-slate-450 font-bold tracking-wide uppercase text-[10px]">Total Respons Masuk</CardDescription>
                <CardTitle className="text-3xl font-black tracking-tight text-slate-900">
                  {isLoading ? <i className="fa-solid fa-circle-notch fa-spin text-violet-500 text-2xl"></i> : totalResponses}
                </CardTitle>
                <div className="text-xs text-slate-400 flex items-center gap-1.5 pt-1 font-medium">
                  <i className="fa-solid fa-chart-line"></i>
                  <span>Akumulasi tanggapan dari semua formulir publik</span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-xl bg-violet-50/80 border border-violet-100 flex items-center justify-center text-violet-600 shadow-inner">
                <i className="fa-solid fa-inbox text-lg"></i>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search Bar & Forms List */}
        <div className="space-y-6">
          <div className="relative">
            <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
            <input
              type="text"
              placeholder="Cari berdasarkan judul formulir atau kata deskripsi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-11 pr-4 py-3.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all shadow-sm"
            />
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <i className="fa-solid fa-circle-notch fa-spin text-primary text-3xl mb-3"></i>
              <p className="text-sm font-semibold">Memuat data formulir...</p>
            </div>
          ) : filteredForms.length === 0 ? (
            <div className="border border-dashed border-slate-300 rounded-2xl p-16 text-center flex flex-col items-center justify-center space-y-4 bg-white/50 shadow-sm">
              <div className="h-14 w-14 rounded-2xl bg-white flex items-center justify-center border border-slate-200 shadow-sm">
                <i className="fa-regular fa-file-lines text-xl text-slate-400"></i>
              </div>
              <div className="max-w-sm space-y-1.5">
                <h3 className="font-bold text-slate-800 text-lg">
                  {searchQuery ? "Tidak Ditemukan" : "Belum Ada Formulir"}
                </h3>
                <p className="text-slate-500 text-xs leading-relaxed">
                  {searchQuery 
                    ? "Kata kunci pencarian tidak cocok dengan judul formulir manapun." 
                    : "Mulai buat formulir kustom pertama Anda untuk disebarkan secara publik."}
                </p>
              </div>
              {!searchQuery && (
                <Link href="/admin/forms/new">
                  <Button size="sm" className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 h-9 px-4 rounded-lg font-semibold">
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
                  className="bg-white border-slate-200 hover:border-primary/30 hover:shadow-md transition-all duration-300 overflow-hidden relative group rounded-2xl"
                >
                  <CardContent className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2.5 max-w-2xl">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-lg text-slate-900 group-hover:text-primary transition-colors">
                          {form.title}
                        </h3>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-50 border border-violet-100 text-violet-600">
                          {form.response_count} Respons
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          form.is_active !== false 
                            ? "bg-emerald-50 border-emerald-100 text-emerald-600" 
                            : "bg-amber-50 border-amber-100 text-amber-600"
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full mr-1.5 ${form.is_active !== false ? "bg-emerald-500" : "bg-amber-500"}`} />
                          {form.is_active !== false ? "Aktif" : "Ditutup"}
                        </span>
                      </div>
                      {form.description && (
                        <p className="text-slate-500 text-xs line-clamp-2 leading-relaxed">
                          {form.description}
                        </p>
                      )}
                      <div className="flex items-center space-x-4 text-[10px] text-slate-400 pt-1 font-semibold">
                        <span className="flex items-center">
                          <i className="fa-regular fa-calendar mr-1.5 text-slate-400"></i>
                          Dibuat: {new Date(form.created_at).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric"
                          })}
                        </span>
                        <span>•</span>
                        <span className="flex items-center">
                          <i className="fa-regular fa-rectangle-list mr-1.5 text-slate-400"></i>
                          {(Array.isArray(form.fields) ? form.fields : typeof form.fields === "string" ? JSON.parse(form.fields) : []).length} Input Lapangan
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:self-center shrink-0">
                      <Link href={`/forms/${form.id}`} target="_blank">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 h-9 text-xs transition-colors rounded-xl font-semibold"
                        >
                          <i className="fa-solid fa-arrow-up-right-from-square mr-1.5 text-slate-400"></i>
                          Buka Form
                        </Button>
                      </Link>
                      <Link href={`/admin/forms/${form.id}`}>
                        <Button 
                          size="sm" 
                          className="bg-slate-900 text-white hover:bg-slate-800 h-9 text-xs shadow-sm transition-all rounded-xl font-semibold cursor-pointer"
                        >
                          <i className="fa-solid fa-eye mr-1.5 text-slate-400"></i>
                          Lihat Respons
                        </Button>
                      </Link>
                      <Link href={`/admin/forms/${form.id}/edit`}>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 h-9 text-xs transition-colors rounded-xl font-semibold"
                        >
                          <i className="fa-solid fa-sliders mr-1.5 text-slate-400"></i>
                          Edit Skema
                        </Button>
                      </Link>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDeleteForm(form.id)}
                        disabled={isPending}
                        className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 h-9 w-9 transition-colors rounded-xl cursor-pointer"
                      >
                        {isPending ? (
                          <i className="fa-solid fa-circle-notch fa-spin text-slate-400 text-sm"></i>
                        ) : (
                          <i className="fa-regular fa-trash-can text-sm"></i>
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

"use client";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getFormsAction, deleteFormAction } from "@/app/actions/forms";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [isSyncing, setIsSyncing] = useState(false);
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  // Custom Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // AI Settings Modal has been removed. AI configuration is now database-backed via /admin/profile.

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
    setConfirmModal({
      isOpen: true,
      title: "Hapus Formulir?",
      message: "Apakah Anda yakin ingin menghapus formulir ini? Semua data tanggapan responden yang masuk di dalam formulir ini juga akan dihapus permanen.",
      onConfirm: () => {
        startTransition(async () => {
          const result = await deleteFormAction(formId);
          if (result.success) {
            toast.success("Formulir berhasil dihapus.");
            setForms((prev) => prev.filter((f) => f.id !== formId));
          } else {
            toast.error(result.error || "Gagal menghapus formulir.");
          }
        });
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
          <div className="flex items-center gap-3 shrink-0">
            <Link href="/admin/profile">
              <Button
                variant="outline"
                className="border-slate-200 text-slate-700 bg-white hover:bg-slate-50 font-semibold px-4 h-10.5 rounded-xl shadow-sm cursor-pointer flex items-center gap-2"
              >
                <i className="fa-solid fa-wand-magic-sparkles text-indigo-600"></i>
                Setelan AI Akun
              </Button>
            </Link>
            <Link href="/admin/forms/new">
              <Button className="bg-primary text-white hover:bg-primary/90 font-semibold px-5 h-10.5 rounded-xl shadow-md transition-all">
                <i className="fa-solid fa-plus mr-2"></i>
                Buat Formulir Baru
              </Button>
            </Link>
          </div>
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
                <CardDescription className="text-slate-500 font-bold tracking-wide uppercase text-[10px]">Total Formulir Aktif</CardDescription>
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
                <CardDescription className="text-slate-500 font-bold tracking-wide uppercase text-[10px]">Total Respons Masuk</CardDescription>
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

        {/* Real-time Analytics Section */}
        <Card className="bg-white border-slate-200/80 shadow-sm rounded-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-[4px] h-full bg-indigo-600" />
          <CardHeader className="pt-6 pb-4 flex flex-row items-center justify-between border-b border-slate-100">
            <div className="space-y-1.5">
              <CardTitle className="text-lg font-black tracking-tight text-slate-900 flex items-center gap-2">
                <i className="fa-solid fa-chart-simple text-indigo-600"></i>
                Analitik Real-time Tanggapan
              </CardTitle>
              <CardDescription className="text-slate-500 text-xs">
                Perbandingan jumlah tanggapan antar formulir terpopuler Anda.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                setIsSyncing(true);
                await fetchForms();
                toast.success("Data analitik berhasil diperbarui.");
                setTimeout(() => setIsSyncing(false), 1000);
              }}
              disabled={isLoading || isSyncing}
              className="border-slate-200 text-indigo-600 hover:bg-indigo-50/50 h-9 px-3 rounded-xl text-xs font-semibold cursor-pointer flex items-center gap-1.5 transition-colors"
            >
              <i className={`fa-solid fa-sync ${isSyncing ? "fa-spin" : ""}`}></i>
              Sync Real-time
            </Button>
          </CardHeader>
          <CardContent className="p-6">
            {isLoading ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400">
                <i className="fa-solid fa-circle-notch fa-spin text-indigo-600 text-2xl mb-2"></i>
                <span className="text-xs">Memuat grafik...</span>
              </div>
            ) : (() => {
              const chartForms = [...forms]
                .sort((a, b) => b.response_count - a.response_count)
                .slice(0, 8);
              const maxVal = Math.max(...chartForms.map((f) => f.response_count), 5);
              const ticks = [0, Math.round(maxVal * 0.25), Math.round(maxVal * 0.5), Math.round(maxVal * 0.75), maxVal];
              const uniqueTicks = Array.from(new Set(ticks)).sort((a, b) => a - b);

              if (chartForms.length === 0 || totalResponses === 0) {
                return (
                  <div className="h-64 border border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-center p-6 bg-slate-50/30">
                    <i className="fa-solid fa-chart-pie text-slate-400 text-3xl mb-3"></i>
                    <p className="text-xs font-bold text-slate-700">Belum ada data tanggapan untuk dianalisis</p>
                    <p className="text-[10px] text-slate-400 mt-1 max-w-xs leading-relaxed">Kirim tautan formulir Anda ke responden untuk melihat grafik data di sini secara real-time.</p>
                  </div>
                );
              }

              return (
                <div className="relative">
                  <svg viewBox="0 0 800 300" width="100%" height="100%" className="overflow-visible select-none">
                    <defs>
                      <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.85" />
                        <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.3" />
                      </linearGradient>
                      <linearGradient id="barGradHover" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#4338ca" stopOpacity="0.95" />
                        <stop offset="100%" stopColor="#6d28d9" stopOpacity="0.45" />
                      </linearGradient>
                    </defs>

                    {/* Grid Lines */}
                    {uniqueTicks.map((tick) => {
                      const y = 250 - (tick / maxVal) * 210;
                      return (
                        <g key={tick} className="opacity-40">
                          <line 
                            x1="60" 
                            y1={y} 
                            x2="780" 
                            y2={y} 
                            stroke="#e2e8f0" 
                            strokeWidth="1" 
                            strokeDasharray={tick === 0 ? "0" : "4 4"}
                          />
                          <text 
                            x="45" 
                            y={y + 4} 
                            textAnchor="end" 
                            className="fill-slate-400 text-[10px] font-bold font-mono"
                          >
                            {tick}
                          </text>
                        </g>
                      );
                    })}

                    {/* Bars */}
                    {chartForms.map((form, index) => {
                      const barWidth = Math.min(50, 450 / chartForms.length);
                      const chartAreaWidth = 720;
                      const spacing = chartAreaWidth / chartForms.length;
                      const x = 70 + index * spacing + (spacing - barWidth) / 2;
                      const barHeight = (form.response_count / maxVal) * 210;
                      const y = 250 - barHeight;
                      const isHovered = hoveredBarIndex === index;

                      return (
                        <g key={form.id}>
                          {/* Hover trigger area */}
                          <rect
                            x={x - 10}
                            y={30}
                            width={barWidth + 20}
                            height={230}
                            fill="transparent"
                            className="cursor-pointer"
                            onMouseEnter={() => setHoveredBarIndex(index)}
                            onMouseLeave={() => setHoveredBarIndex(null)}
                          />
                          
                          {/* The visible bar */}
                          <rect
                            x={x}
                            y={y}
                            width={barWidth}
                            height={barHeight}
                            rx="6"
                            ry="6"
                            fill={isHovered ? "url(#barGradHover)" : "url(#barGrad)"}
                            stroke={isHovered ? "#4338ca" : "#4f46e5"}
                            strokeWidth={isHovered ? "1.5" : "0.5"}
                            className="transition-all duration-200"
                          />

                          {/* Top value label */}
                          {form.response_count > 0 && (
                            <text
                              x={x + barWidth / 2}
                              y={y - 8}
                              textAnchor="middle"
                              className={`fill-indigo-900 font-black text-[10px] transition-opacity duration-200 ${
                                isHovered ? "opacity-100" : "opacity-0 sm:opacity-100"
                              }`}
                            >
                              {form.response_count}
                            </text>
                          )}

                          {/* X-axis form title label */}
                          <text
                            x={x + barWidth / 2}
                            y="275"
                            textAnchor="middle"
                            className={`fill-slate-500 font-semibold text-[9px] transition-colors ${
                              isHovered ? "fill-indigo-600 font-bold" : ""
                            }`}
                          >
                            {form.title.length > 12 ? `${form.title.substring(0, 10)}...` : form.title}
                          </text>
                        </g>
                      );
                    })}
                    
                    {/* Base X-axis Line */}
                    <line x1="60" y1="250" x2="780" y2="250" stroke="#cbd5e1" strokeWidth="1.5" />
                  </svg>

                  {/* Tooltip */}
                  {hoveredBarIndex !== null && chartForms[hoveredBarIndex] && (
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-slate-900/95 text-white text-[11px] rounded-xl px-4 py-2 shadow-xl border border-slate-800 backdrop-blur-sm transition-all flex items-center gap-3">
                      <div className="flex flex-col">
                        <span className="font-extrabold max-w-[200px] truncate">{chartForms[hoveredBarIndex].title}</span>
                        <span className="text-[10px] text-slate-400">
                          {chartForms[hoveredBarIndex].response_count} respons masuk
                        </span>
                      </div>
                      <span className="bg-indigo-600 text-white font-mono px-2 py-0.5 rounded text-[10px] font-black">
                        {Math.round((chartForms[hoveredBarIndex].response_count / totalResponses) * 100) || 0}%
                      </span>
                    </div>
                  )}
                </div>
              );
            })()}
          </CardContent>
        </Card>

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

      {/* AI Settings Modal removed */}

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

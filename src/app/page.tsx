"use client"

import React, { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { 
  TableProperties, 
  SlidersHorizontal, 
  ArrowRight, 
  Layers, 
  FileSpreadsheet, 
  CheckCircle2, 
  Lock,
  Sparkles,
  Receipt,
  Globe,
  Send,
  Percent,
  CircleDollarSign,
  ShieldCheck,
  Zap,
  BarChart3,
  Check
} from "lucide-react";

const fakePurchases = [
  { message: "Rian baru saja meningkatkan ke akun Pro Premium!", desc: "Baru saja" },
  { message: "Siti baru saja menghubungkan custom domain registrasi.siti.id", desc: "2 menit yang lalu" },
  { message: "Ahmad baru saja menarik saldo hasil penjualan Rp450.000", desc: "5 menit yang lalu" },
  { message: "Budi membuat kupon baru 'LAUNCH2026' dengan potongan 20%", desc: "7 menit yang lalu" },
  { message: "Rina mengirim 124 auto-invoice PDF ke pembeli via Resend", desc: "10 menit yang lalu" },
  { message: "Joko mengintegrasikan GTM dan Facebook Pixel di form pendaftarannya", desc: "12 menit yang lalu" },
  { message: "Dewi mengaktifkan autoresponder WhatsApp via Fonnte", desc: "15 menit yang lalu" },
  { message: "CV Maju Bersama mengekspor 500 tanggapan ke format Excel Premium", desc: "18 menit yang lalu" },
  { message: "Doni menggunakan AI Response Insights untuk merangkum hasil survei", desc: "22 menit yang lalu" },
  { message: "Anisa menyembunyikan branding platform pada formulir kustomnya", desc: "25 menit yang lalu" }
];

export default function Home() {
  useEffect(() => {
    // Show first toast after 3 seconds to greet the visitor
    const initialTimer = setTimeout(() => {
      const item = fakePurchases[0];
      toast.success(item.message, { description: item.desc });
    }, 3000);

    // Show subsequent toasts every 18 seconds
    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * fakePurchases.length);
      const item = fakePurchases[randomIndex];
      if (Math.random() > 0.4) {
        toast.success(item.message, { description: item.desc });
      } else {
        toast.info(item.message, { description: item.desc });
      }
    }, 18000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 text-slate-100 overflow-hidden relative">
      {/* Background glow blobs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-indigo-500/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] rounded-full bg-blue-500/10 blur-[140px] pointer-events-none" />

      {/* Header */}
      <header className="border-b border-slate-800/60 bg-slate-950/40 backdrop-blur-md sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-indigo-500 to-blue-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <TableProperties className="h-5 w-5 text-white" />
            </div>
            <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              Personal Form Builder <span className="text-indigo-400 text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 ml-1.5 font-normal">Pro Edition</span>
            </span>
          </div>
          
          <Link href="/admin">
            <Button variant="outline" className="border-slate-800 text-slate-300 hover:bg-slate-900 hover:text-white h-9 text-xs rounded-xl font-semibold transition-all">
              <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
              Kelola Form
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 relative z-10">
        <div className="flex flex-col items-center justify-center text-center space-y-8 max-w-4xl mx-auto">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 text-xs font-semibold tracking-wide uppercase shadow-inner">
            <Sparkles className="h-3.5 w-3.5 text-indigo-400 animate-pulse" />
            <span>Update Raksasa Terkini</span>
            <span>•</span>
            <span className="text-slate-400 font-normal">White-label & Monetisasi</span>
          </div>
          
          <h1 className="text-4xl sm:text-7xl font-black tracking-tight text-white leading-[1.1]">
            Bangun & Bisniskan <br />
            <span className="bg-gradient-to-r from-indigo-400 via-sky-400 to-blue-500 bg-clip-text text-transparent">Formulir Anda Sendiri</span>
          </h1>
          
          <p className="text-slate-400 text-base sm:text-xl max-w-3xl mx-auto leading-relaxed">
            Platform pembuatan formulir modern tanpa batas. Kumpulkan jawaban, terima pembayaran, bagikan pendapatan dengan komisi otomatis, integrasikan domain kustom, kirim PDF otomatis, dan hapus logo platform untuk kepemilikan penuh.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-md pt-4">
            <Link href="/admin" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto bg-gradient-to-r from-indigo-500 to-indigo-600 text-white hover:from-indigo-600 hover:to-indigo-700 font-bold px-8 h-12 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/35 transition-all duration-200 text-sm rounded-xl">
                Masuk ke Dasbor Admin
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
            <a href="https://github.com/rzarxx/form" target="_blank" rel="noreferrer" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full sm:w-auto border-slate-800 text-slate-300 hover:bg-slate-900 hover:text-white h-12 px-8 text-sm rounded-xl font-semibold transition-colors bg-slate-950/40">
                Dokumentasi GitHub
              </Button>
            </a>
          </div>
        </div>

        {/* Feature Grid Section */}
        <div className="mt-24">
          <div className="text-center space-y-3 mb-16">
            <h2 className="text-3xl font-extrabold text-white">Fitur Premium Kelas Enterprise</h2>
            <p className="text-slate-400 text-sm max-w-2xl mx-auto">Dirancang untuk kebutuhan profesional, bisnis, dan institusi yang menginginkan kontrol penuh dan kustomisasi total.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* 1. Keuangan & Saldo */}
            <div className="border border-slate-800/80 bg-slate-950/50 backdrop-blur-md rounded-2xl p-6 space-y-4 hover:border-indigo-500/40 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-300 group">
              <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-sm group-hover:bg-indigo-500/20 transition-all">
                <CircleDollarSign className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-white text-base">Sistem Saldo & Bagi Hasil</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Terima pembayaran formulir otomatis via TriPay. Dilengkapi kalkulasi potongan komisi platform (misal 5%) dan sistem withdraw saldo langsung dari dasbor Creator.
              </p>
            </div>

            {/* 2. Custom Domain */}
            <div className="border border-slate-800/80 bg-slate-950/50 backdrop-blur-md rounded-2xl p-6 space-y-4 hover:border-indigo-500/40 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-300 group">
              <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-sm group-hover:bg-indigo-500/20 transition-all">
                <Globe className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-white text-base">Koneksi Domain Kustom</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Tampilkan formulir Anda di bawah domain sendiri (misal: <code className="text-indigo-300 font-mono text-xs">daftar.eventku.com</code>). Perutean otomatis secara aman menggunakan middleware bawaan.
              </p>
            </div>

            {/* 3. Auto-Invoice PDF */}
            <div className="border border-slate-800/80 bg-slate-950/50 backdrop-blur-md rounded-2xl p-6 space-y-4 hover:border-indigo-500/40 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-300 group">
              <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-sm group-hover:bg-indigo-500/20 transition-all">
                <Receipt className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-white text-base">Auto-Invoice PDF & Email</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Kirim invoice cetak digital secara otomatis ke email pembeli setelah status TriPay dinyatakan lunas. PDF disimpan otomatis ke Vercel Blob.
              </p>
            </div>

            {/* 4. Kupon Diskon */}
            <div className="border border-slate-800/80 bg-slate-950/50 backdrop-blur-md rounded-2xl p-6 space-y-4 hover:border-indigo-500/40 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-300 group">
              <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-sm group-hover:bg-indigo-500/20 transition-all">
                <Percent className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-white text-base">Manajemen Kupon Diskon</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Buat kode promo kustom (contoh: <code className="text-indigo-300 font-mono text-xs">EARLYBIRD</code>) berupa persentase atau nominal tetap untuk memotong tagihan transaksi secara real-time.
              </p>
            </div>

            {/* 5. Autoresponder WA & Email */}
            <div className="border border-slate-800/80 bg-slate-950/50 backdrop-blur-md rounded-2xl p-6 space-y-4 hover:border-indigo-500/40 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-300 group">
              <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-sm group-hover:bg-indigo-500/20 transition-all">
                <Send className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-white text-base">Notifikasi WhatsApp & Email</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Konfirmasi instan ke pembeli melalui pengiriman WhatsApp Gateway via Fonnte dan autoresponder email informatif menggunakan serverless API Resend.
              </p>
            </div>

            {/* 6. Tanpa Branding & Redirect */}
            <div className="border border-slate-800/80 bg-slate-950/50 backdrop-blur-md rounded-2xl p-6 space-y-4 hover:border-indigo-500/40 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-300 group">
              <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-sm group-hover:bg-indigo-500/20 transition-all">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-white text-base">White-Labeling & Redirect</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Hapus watermark platform di bagian bawah form secara penuh dan alihkan pengisi form langsung ke URL khusus Anda (grup WA/Telegram) setelah pengiriman sukses.
              </p>
            </div>

            {/* 7. Analitik Pixel & GTM */}
            <div className="border border-slate-800/80 bg-slate-950/50 backdrop-blur-md rounded-2xl p-6 space-y-4 hover:border-indigo-500/40 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-300 group">
              <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-sm group-hover:bg-indigo-500/20 transition-all">
                <BarChart3 className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-white text-base">Facebook Pixel & GTM</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Suntik kode pelacakan analitik secara dinamis di header formulir publik Anda untuk memantau data konversi iklan dan aktivitas pengunjung form.
              </p>
            </div>

            {/* 8. Ekspor Excel (.xlsx) Premium */}
            <div className="border border-slate-800/80 bg-slate-950/50 backdrop-blur-md rounded-2xl p-6 space-y-4 hover:border-indigo-500/40 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-300 group">
              <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-sm group-hover:bg-indigo-500/20 transition-all">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-white text-base">Ekspor Excel (.xlsx) Rapi</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Unduh tanggapan responden dalam format Excel yang rapi dan terformat dengan auto-fit ukuran kolom untuk analisis data yang lebih mendalam.
              </p>
            </div>

            {/* 9. Analisis Jawaban AI */}
            <div className="border border-slate-800/80 bg-slate-950/50 backdrop-blur-md rounded-2xl p-6 space-y-4 hover:border-indigo-500/40 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-300 group">
              <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-sm group-hover:bg-indigo-500/20 transition-all">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-white text-base">AI Response Insights</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Pindai ratusan entri tanggapan responden dan hasilkan rangkaman analisis naratif cerdas secara instan bertenaga LLM (Gemini AI).
              </p>
            </div>

          </div>
        </div>

        {/* Pricing Plan Section */}
        <div className="mt-28 mb-12">
          <div className="text-center space-y-3 mb-16">
            <h2 className="text-3xl font-extrabold text-white">Paket Penawaran & Lisensi</h2>
            <p className="text-slate-400 text-sm max-w-2xl mx-auto">Pilih paket yang sesuai dengan volume formulir dan tingkat branding bisnis Anda.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Tier */}
            <div className="border border-slate-800/80 bg-slate-950/30 rounded-3xl p-8 flex flex-col justify-between hover:border-slate-700 transition-all">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-300">Basic (Free)</h3>
                  <p className="text-slate-500 text-xs mt-1">Sesuai untuk penggunaan dasar & internal</p>
                </div>
                <div className="flex items-baseline">
                  <span className="text-4xl font-extrabold text-white">Rp0</span>
                  <span className="text-slate-500 text-sm ml-2">/ selamanya</span>
                </div>
                <ul className="space-y-3 text-sm text-slate-400">
                  <li className="flex items-center">
                    <Check className="h-4 w-4 text-emerald-500 mr-2.5 shrink-0" />
                    Buat Formulir Dinamis Tanpa Batas
                  </li>
                  <li className="flex items-center">
                    <Check className="h-4 w-4 text-emerald-500 mr-2.5 shrink-0" />
                    Input Standar (Teks, Pilihan Ganda, dll)
                  </li>
                  <li className="flex items-center">
                    <Check className="h-4 w-4 text-emerald-500 mr-2.5 shrink-0" />
                    Ekspor Tanggapan sebagai file CSV
                  </li>
                  <li className="flex items-center text-slate-600">
                    <Lock className="h-3.5 w-3.5 mr-3 shrink-0" />
                    Kustomisasi Domain & Hapus Logo
                  </li>
                  <li className="flex items-center text-slate-600">
                    <Lock className="h-3.5 w-3.5 mr-3 shrink-0" />
                    Sistem Saldo & Bagi Hasil Creator
                  </li>
                </ul>
              </div>
              <div className="pt-8">
                <Link href="/admin">
                  <Button className="w-full border-slate-800 text-slate-300 hover:bg-slate-900 hover:text-white bg-slate-950/40 rounded-xl py-5" variant="outline">
                    Mulai Akun Gratis
                  </Button>
                </Link>
              </div>
            </div>

            {/* Pro Tier */}
            <div className="border-2 border-indigo-500 bg-slate-950/60 rounded-3xl p-8 flex flex-col justify-between shadow-xl shadow-indigo-500/5 relative">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 text-[10px] font-bold text-white uppercase tracking-wider shadow">
                Sangat Direkomendasikan
              </div>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center">
                    Pro Premium
                    <Zap className="h-4 w-4 text-amber-400 ml-1.5 fill-amber-400" />
                  </h3>
                  <p className="text-indigo-300/80 text-xs mt-1">Untuk penyelenggara event, penjual, & agensi</p>
                </div>
                <div className="flex items-baseline">
                  <span className="text-4xl font-extrabold text-white">Rp99.000</span>
                  <span className="text-slate-400 text-sm ml-2">/ bulan</span>
                </div>
                <ul className="space-y-3 text-sm text-slate-300">
                  <li className="flex items-center">
                    <Check className="h-4 w-4 text-indigo-400 mr-2.5 shrink-0" />
                    Semua Fitur Akun Gratis
                  </li>
                  <li className="flex items-center font-semibold text-indigo-200">
                    <Check className="h-4 w-4 text-indigo-400 mr-2.5 shrink-0" />
                    Perutean Domain & Subdomain Kustom
                  </li>
                  <li className="flex items-center text-indigo-200">
                    <Check className="h-4 w-4 text-indigo-400 mr-2.5 shrink-0" />
                    Hapus Logo Platform (White-Label)
                  </li>
                  <li className="flex items-center">
                    <Check className="h-4 w-4 text-indigo-400 mr-2.5 shrink-0" />
                    Kupon Diskon & Auto-Invoice PDF
                  </li>
                  <li className="flex items-center">
                    <Check className="h-4 w-4 text-indigo-400 mr-2.5 shrink-0" />
                    Autoresponder WhatsApp & Webhook URL
                  </li>
                  <li className="flex items-center">
                    <Check className="h-4 w-4 text-indigo-400 mr-2.5 shrink-0" />
                    Pixel FB, GTM, & Ekspor Excel Premium
                  </li>
                </ul>
              </div>
              <div className="pt-8">
                <Link href="/admin/premium">
                  <Button className="w-full bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold rounded-xl py-5 shadow-lg shadow-indigo-500/25">
                    Upgrade ke Premium Pro
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-8 text-center text-xs text-slate-500 bg-slate-950/60 backdrop-blur-sm relative z-10">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} Personal Form Builder Pro. Hak Cipta Dilindungi.</p>
          <p className="flex items-center justify-center text-[10px] font-semibold text-slate-600">
            <Lock className="h-2.5 w-2.5 mr-1.5 text-slate-600" />
            Integrasi Pembayaran Aman Menggunakan Sandbox/Production TriPay API
          </p>
        </div>
      </footer>
    </div>
  );
}

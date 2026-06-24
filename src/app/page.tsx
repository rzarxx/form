"use client"

import React, { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { 
  TableProperties, 
  ArrowRight, 
  Layers, 
  FileSpreadsheet, 
  Lock,
  Sparkles,
  Receipt,
  Globe,
  Send,
  Percent,
  CircleDollarSign,
  BarChart3,
  Check,
  Zap,
  ArrowUpRight
} from "lucide-react";

const fakePurchases = [
  { message: "R*** A*** baru saja mendaftar akun Pro Premium!", desc: "Baru saja" },
  { message: "S*** N*** baru saja menghubungkan custom domain registrasi.s***.id", desc: "2 menit yang lalu" },
  { message: "A*** H*** baru saja menarik saldo hasil penjualan Rp450.000", desc: "5 menit yang lalu" },
  { message: "B*** S*** membuat kupon baru 'LAUNCH2026' dengan potongan 20%", desc: "7 menit yang lalu" },
  { message: "R*** W*** mengirim 124 auto-invoice PDF ke pembeli via Resend", desc: "10 menit yang lalu" },
  { message: "J*** P*** mengintegrasikan GTM dan Facebook Pixel di form pendaftarannya", desc: "12 menit yang lalu" },
  { message: "D*** K*** mengaktifkan autoresponder WhatsApp via Fonnte", desc: "15 menit yang lalu" },
  { message: "M*** B*** mengekspor 500 tanggapan ke format Excel Premium", desc: "18 menit yang lalu" },
  { message: "D*** P*** menggunakan AI Response Insights untuk merangkum hasil survei", desc: "22 menit yang lalu" },
  { message: "A*** R*** menyembunyikan branding platform pada formulir kustomnya", desc: "25 menit yang lalu" }
];

export default function Home() {
  useEffect(() => {
    // Show first toast after 3 seconds to greet the visitor
    const initialTimer = setTimeout(() => {
      const item = fakePurchases[0];
      toast.success(item.message, { description: item.desc });
    }, 3000);

    // Show subsequent toasts every 15 seconds
    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * fakePurchases.length);
      const item = fakePurchases[randomIndex];
      if (Math.random() > 0.4) {
        toast.success(item.message, { description: item.desc });
      } else {
        toast.info(item.message, { description: item.desc });
      }
    }, 15000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-[#020215] text-slate-100 overflow-hidden relative font-mono select-none selection:bg-cyan-500 selection:text-black">
      {/* Cyber Y2K Grid Overlay */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(to right, #00f0ff 1px, transparent 1px),
            linear-gradient(to bottom, #00f0ff 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }}
      />

      {/* Cyber Neon Glow Blobs */}
      <div className="absolute top-[10%] left-1/4 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-cyan-500/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-1/4 w-[600px] h-[600px] rounded-full bg-pink-500/10 blur-[150px] pointer-events-none" />
      <div className="absolute top-[60%] left-1/2 -translate-x-1/2 w-[700px] h-[200px] bg-indigo-500/5 blur-[120px] pointer-events-none transform -rotate-12" />

      {/* Header */}
      <header className="border-b-2 border-cyan-500/30 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 shadow-[0_4px_20px_rgba(0,240,255,0.08)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-cyan-500 via-indigo-500 to-pink-500 flex items-center justify-center shadow-lg shadow-cyan-500/20 border border-cyan-400">
              <TableProperties className="h-5 w-5 text-black" />
            </div>
            <span className="font-black text-sm sm:text-base tracking-widest text-transparent bg-gradient-to-r from-cyan-400 via-pink-400 to-white bg-clip-text">
              FORM::BUILDER <span className="hidden sm:inline-block text-[9px] px-2 py-0.5 rounded border border-pink-500/40 bg-pink-500/10 text-pink-400 ml-2 font-bold tracking-normal uppercase">NEON v2.6</span>
            </span>
          </div>
          
          <div className="flex items-center space-x-3">
            <Link href="/login">
              <Button variant="ghost" className="text-slate-300 hover:bg-slate-900 hover:text-white h-9 text-xs rounded-lg font-bold transition-all border border-transparent hover:border-slate-800">
                Masuk
              </Button>
            </Link>
            <Link href="/register?plan=pro">
              <Button className="bg-cyan-500 text-black hover:bg-cyan-400 font-black h-9 text-xs rounded-lg shadow-md shadow-cyan-500/20 transition-all border border-cyan-300">
                Daftar Akun
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 relative z-10 w-full">
        <div className="flex flex-col items-center justify-center text-center space-y-8 max-w-4xl mx-auto">
          {/* Neon Badge */}
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded bg-cyan-950/40 border border-cyan-500/40 text-cyan-400 text-[10px] sm:text-xs font-bold tracking-widest uppercase shadow-[0_0_15px_rgba(0,240,255,0.15)] animate-pulse">
            <Sparkles className="h-4.5 w-4.5 text-pink-400" />
            <span>✦ RETRO-FUTURE DATA MATRIX ACTIVATED ✦</span>
          </div>
          
          {/* Main Title */}
          <h1 className="text-4xl sm:text-7xl font-black tracking-tighter text-white leading-[1.05] uppercase">
            SISTEM FORMULIR <br />
            <span className="text-transparent bg-gradient-to-r from-cyan-400 via-indigo-400 to-pink-500 bg-clip-text drop-shadow-[0_0_30px_rgba(0,240,255,0.2)]">CYBER-MONETIZE</span>
          </h1>
          
          {/* Headline Description */}
          <p className="text-slate-400 text-sm sm:text-lg max-w-3xl mx-auto leading-relaxed font-sans">
            Bangun formulir dinamis modern dengan desain estetika neon digital. Integrasikan custom domain, terima pembayaran instan dengan potongan komisi platform otomatis, kirim invoice PDF, autoresponder WhatsApp, dan pantau data konversi Pixel secara mandiri.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-md pt-4">
            <Link href="/register?plan=pro" className="w-full sm:w-1/2">
              <Button className="w-full bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 text-white hover:brightness-110 font-black h-12 shadow-lg shadow-pink-500/20 transition-all text-xs rounded-xl border border-pink-400/30 uppercase tracking-wider">
                Daftar Paket Pro
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
            <Link href="/register?plan=free" className="w-full sm:w-1/2">
              <Button variant="outline" className="w-full border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-400 h-12 text-xs rounded-xl font-black transition-all bg-slate-950/60 uppercase tracking-wider">
                Mulai Akun Free
              </Button>
            </Link>
          </div>
        </div>

        {/* Feature Grid Section */}
        <div className="mt-28">
          <div className="text-center space-y-3 mb-16">
            <h2 className="text-2xl sm:text-3xl font-black tracking-widest text-white uppercase">
              ✦ RETRO SYSTEM SPECIFICATIONS ✦
            </h2>
            <div className="w-24 h-1 bg-gradient-to-r from-cyan-500 to-pink-500 mx-auto" />
            <p className="text-slate-500 text-xs font-sans max-w-lg mx-auto pt-2">
              Arsitektur database & logika server terintegrasi penuh untuk performa instan tinggi.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* 1. Keuangan & Saldo */}
            <div className="border-2 border-slate-800/80 bg-slate-950/80 rounded-xl p-6 space-y-4 hover:border-cyan-500/50 hover:shadow-[0_0_20px_rgba(0,240,255,0.1)] transition-all duration-300 group">
              <div className="h-10 w-10 rounded bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-sm group-hover:bg-cyan-500/20 transition-all">
                <CircleDollarSign className="h-5 w-5" />
              </div>
              <h3 className="font-black text-white text-sm uppercase tracking-wider">SISTEM SALDO CREATOR</h3>
              <p className="text-slate-400 text-xs leading-relaxed font-sans">
                Terima pembayaran otomatis via TriPay. Potong komisi platform (misal 5% diatur dari admin panel) dan tarik saldo langsung dari dasbor Anda.
              </p>
            </div>

            {/* 2. Custom Domain */}
            <div className="border-2 border-slate-800/80 bg-slate-950/80 rounded-xl p-6 space-y-4 hover:border-cyan-500/50 hover:shadow-[0_0_20px_rgba(0,240,255,0.1)] transition-all duration-300 group">
              <div className="h-10 w-10 rounded bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-sm group-hover:bg-cyan-500/20 transition-all">
                <Globe className="h-5 w-5" />
              </div>
              <h3 className="font-black text-white text-sm uppercase tracking-wider">KONEKSI DOMAIN KUSTOM</h3>
              <p className="text-slate-400 text-xs leading-relaxed font-sans">
                Hubungkan domain sendiri (misal: <code className="text-cyan-300 font-mono text-xs">daftar.eventku.com</code>). Routing middleware Next.js menangani perutean data secara transparan.
              </p>
            </div>

            {/* 3. Auto-Invoice PDF */}
            <div className="border-2 border-slate-800/80 bg-slate-950/80 rounded-xl p-6 space-y-4 hover:border-cyan-500/50 hover:shadow-[0_0_20px_rgba(0,240,255,0.1)] transition-all duration-300 group">
              <div className="h-10 w-10 rounded bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-sm group-hover:bg-cyan-500/20 transition-all">
                <Receipt className="h-5 w-5" />
              </div>
              <h3 className="font-black text-white text-sm uppercase tracking-wider">AUTO-INVOICE PDF</h3>
              <p className="text-slate-400 text-xs leading-relaxed font-sans">
                Generate tanda terima digital otomatis berformat PDF dan kirimkan langsung ke email pembeli setelah status TriPay dinyatakan PAID.
              </p>
            </div>

            {/* 4. Kupon Diskon */}
            <div className="border-2 border-slate-800/80 bg-slate-950/80 rounded-xl p-6 space-y-4 hover:border-cyan-500/50 hover:shadow-[0_0_20px_rgba(0,240,255,0.1)] transition-all duration-300 group">
              <div className="h-10 w-10 rounded bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-sm group-hover:bg-cyan-500/20 transition-all">
                <Percent className="h-5 w-5" />
              </div>
              <h3 className="font-black text-white text-sm uppercase tracking-wider">KUPON DISKON REAL-TIME</h3>
              <p className="text-slate-400 text-xs leading-relaxed font-sans">
                Buat kode promo (seperti <code className="text-cyan-300 font-mono text-xs">EARLYBIRD</code>) persentase/potongan tetap untuk memotong harga tagihan formulir bayar secara dinamis.
              </p>
            </div>

            {/* 5. Autoresponder WA */}
            <div className="border-2 border-slate-800/80 bg-slate-950/80 rounded-xl p-6 space-y-4 hover:border-cyan-500/50 hover:shadow-[0_0_20px_rgba(0,240,255,0.1)] transition-all duration-300 group">
              <div className="h-10 w-10 rounded bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-sm group-hover:bg-cyan-500/20 transition-all">
                <Send className="h-5 w-5" />
              </div>
              <h3 className="font-black text-white text-sm uppercase tracking-wider">WHATSAPP AUTORESPONDER</h3>
              <p className="text-slate-400 text-xs leading-relaxed font-sans">
                Kirim pesan konfirmasi otomatis ke nomor responden menggunakan gateway WhatsApp Fonnte atau autoresponder email terintegrasi.
              </p>
            </div>

            {/* 6. Tanpa Branding */}
            <div className="border-2 border-slate-800/80 bg-slate-950/80 rounded-xl p-6 space-y-4 hover:border-cyan-500/50 hover:shadow-[0_0_20px_rgba(0,240,255,0.1)] transition-all duration-300 group">
              <div className="h-10 w-10 rounded bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-sm group-hover:bg-cyan-500/20 transition-all">
                <Layers className="h-5 w-5" />
              </div>
              <h3 className="font-black text-white text-sm uppercase tracking-wider">HAPUS PLATFORM BRANDING</h3>
              <p className="text-slate-400 text-xs leading-relaxed font-sans">
                Sembunyikan watermark footer platform sepenuhnya untuk menampilkan formulir yang bersih dan profesional bagi audiens bisnis Anda.
              </p>
            </div>

            {/* 7. Analitik Pixel */}
            <div className="border-2 border-slate-800/80 bg-slate-950/80 rounded-xl p-6 space-y-4 hover:border-cyan-500/50 hover:shadow-[0_0_20px_rgba(0,240,255,0.1)] transition-all duration-300 group">
              <div className="h-10 w-10 rounded bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-sm group-hover:bg-cyan-500/20 transition-all">
                <BarChart3 className="h-5 w-5" />
              </div>
              <h3 className="font-black text-white text-sm uppercase tracking-wider">FB PIXEL & GTM TRACKING</h3>
              <p className="text-slate-400 text-xs leading-relaxed font-sans">
                Render kode tag analytics secara dinamis pada tag <code className="text-cyan-300">head</code> formulir publik untuk memantau trafik, efektivitas iklan, dan konversi responden.
              </p>
            </div>

            {/* 8. Ekspor Excel Premium */}
            <div className="border-2 border-slate-800/80 bg-slate-950/80 rounded-xl p-6 space-y-4 hover:border-cyan-500/50 hover:shadow-[0_0_20px_rgba(0,240,255,0.1)] transition-all duration-300 group">
              <div className="h-10 w-10 rounded bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-sm group-hover:bg-cyan-500/20 transition-all">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <h3 className="font-black text-white text-sm uppercase tracking-wider">EKSPOR EXCEL (.XLSX) PRO</h3>
              <p className="text-slate-400 text-xs leading-relaxed font-sans">
                Unduh file spreadsheet Excel Premium lengkap dengan ukuran kolom yang otomatis menyesuaikan konten secara rapi.
              </p>
            </div>

            {/* 9. Analisis AI */}
            <div className="border-2 border-slate-800/80 bg-slate-950/80 rounded-xl p-6 space-y-4 hover:border-cyan-500/50 hover:shadow-[0_0_20px_rgba(0,240,255,0.1)] transition-all duration-300 group">
              <div className="h-10 w-10 rounded bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-sm group-hover:bg-cyan-500/20 transition-all">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="font-black text-white text-sm uppercase tracking-wider">AI INSIGHTS ANALYTICS</h3>
              <p className="text-slate-400 text-xs leading-relaxed font-sans">
                Dapatkan visualisasi ringkasan tanggapan dan analisis sentimen naratif instan bertenaga LLM (Gemini AI) untuk melacak tren form.
              </p>
            </div>

          </div>
        </div>

        {/* Pricing Plan Section */}
        <div className="mt-28 mb-12">
          <div className="text-center space-y-3 mb-16">
            <h2 className="text-2xl sm:text-3xl font-black tracking-widest text-white uppercase">
              ✦ PRICING MATRIX CHANNELS ✦
            </h2>
            <div className="w-24 h-1 bg-gradient-to-r from-pink-500 to-indigo-500 mx-auto" />
            <p className="text-slate-500 text-xs font-sans max-w-lg mx-auto pt-2">
              Satu lisensi terpusat. Pilih paket optimal Anda untuk mulai merancang.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto w-full">
            {/* Free Tier */}
            <div className="border-2 border-slate-800 bg-slate-950/60 rounded-xl p-8 flex flex-col justify-between hover:border-slate-700 transition-all">
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-black text-slate-300 uppercase tracking-widest">Basic (Free)</h3>
                  <p className="text-slate-500 text-[10px] mt-1 font-sans">Cocok untuk penggunaan internal dasar</p>
                </div>
                <div className="flex items-baseline">
                  <span className="text-3xl font-extrabold text-white">Rp0</span>
                  <span className="text-slate-500 text-xs ml-2">/ selamanya</span>
                </div>
                <ul className="space-y-3 text-xs text-slate-400 font-sans">
                  <li className="flex items-center">
                    <Check className="h-4 w-4 text-emerald-400 mr-2.5 shrink-0" />
                    Buat Formulir Tanpa Batas
                  </li>
                  <li className="flex items-center">
                    <Check className="h-4 w-4 text-emerald-400 mr-2.5 shrink-0" />
                    Input Formulir Standar
                  </li>
                  <li className="flex items-center">
                    <Check className="h-4 w-4 text-emerald-400 mr-2.5 shrink-0" />
                    Ekspor Tanggapan (.CSV)
                  </li>
                  <li className="flex items-center text-slate-700">
                    <Lock className="h-3.5 w-3.5 mr-3 shrink-0" />
                    Kustomisasi Domain & Webhooks
                  </li>
                  <li className="flex items-center text-slate-700">
                    <Lock className="h-3.5 w-3.5 mr-3 shrink-0" />
                    Potongan Komisi & WhatsApp Autoresponder
                  </li>
                </ul>
              </div>
              <div className="pt-8">
                <Link href="/register?plan=free">
                  <Button className="w-full border-slate-800 text-slate-300 hover:bg-slate-900 hover:text-white bg-slate-950/40 rounded-lg py-5 text-xs font-bold" variant="outline">
                    Mulai Paket Free
                  </Button>
                </Link>
              </div>
            </div>

            {/* Pro Tier */}
            <div className="border-2 border-cyan-500 bg-slate-950/90 rounded-xl p-8 flex flex-col justify-between shadow-[0_0_30px_rgba(0,240,255,0.08)] relative overflow-hidden">
              <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded bg-cyan-500 text-[8px] font-black text-black uppercase tracking-widest">
                POPULER
              </div>
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-black text-cyan-400 uppercase tracking-widest flex items-center">
                    Pro Premium
                    <Zap className="h-4 w-4 text-pink-500 ml-1.5 fill-pink-500 animate-bounce" />
                  </h3>
                  <p className="text-slate-400 text-[10px] mt-1 font-sans">Untuk bisnis, promotor event, & agensi</p>
                </div>
                <div className="flex items-baseline">
                  <span className="text-3xl font-extrabold text-white">Rp99.000</span>
                  <span className="text-slate-500 text-xs ml-2">/ bulan</span>
                </div>
                <ul className="space-y-3 text-xs text-slate-300 font-sans">
                  <li className="flex items-center font-bold text-cyan-300">
                    <Check className="h-4 w-4 text-cyan-400 mr-2.5 shrink-0" />
                    Semua Fitur Akun Gratis
                  </li>
                  <li className="flex items-center font-bold text-cyan-300">
                    <Check className="h-4 w-4 text-cyan-400 mr-2.5 shrink-0" />
                    Custom Domain & Tanpa Branding
                  </li>
                  <li className="flex items-center">
                    <Check className="h-4 w-4 text-cyan-400 mr-2.5 shrink-0" />
                    Bagi Hasil Penjualan & Saldo
                  </li>
                  <li className="flex items-center">
                    <Check className="h-4 w-4 text-cyan-400 mr-2.5 shrink-0" />
                    Kupon Diskon & PDF Invoice
                  </li>
                  <li className="flex items-center">
                    <Check className="h-4 w-4 text-cyan-400 mr-2.5 shrink-0" />
                    Autoresponder WA via Fonnte
                  </li>
                  <li className="flex items-center">
                    <Check className="h-4 w-4 text-cyan-400 mr-2.5 shrink-0" />
                    Tracking FB Pixel, GTM & Excel (.XLSX)
                  </li>
                </ul>
              </div>
              <div className="pt-8">
                <Link href="/register?plan=pro">
                  <Button className="w-full bg-cyan-500 text-black hover:bg-cyan-400 font-black rounded-lg py-5 text-xs shadow-md shadow-cyan-500/10 uppercase tracking-widest border border-cyan-300">
                    Daftar Paket Pro
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t-2 border-slate-900 py-8 text-center text-[10px] text-slate-500 bg-slate-950/80 relative z-10 font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} FORM::BUILDER NEON. HAK CIPTA DILINDUNGI.</p>
          <p className="flex items-center justify-center text-[9px] font-semibold text-slate-600 tracking-wider">
            <Lock className="h-3.5 w-3.5 mr-1.5 text-slate-700" />
            SECURE ACCESS SHIELD ENABLED
          </p>
        </div>
      </footer>
    </div>
  );
}

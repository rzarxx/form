import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { 
  TableProperties, 
  SlidersHorizontal, 
  ArrowRight, 
  Layers, 
  FileSpreadsheet, 
  CheckCircle2, 
  Lock 
} from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-tr from-slate-50 via-indigo-50/30 to-blue-50/50 text-slate-800 overflow-hidden relative">
      {/* Background glow blobs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] rounded-full bg-blue-500/5 blur-[130px] pointer-events-none" />

      {/* Header */}
      <header className="border-b border-slate-200/60 bg-white/40 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="h-9 w-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center shadow-sm">
              <TableProperties className="h-5 w-5 text-indigo-600" />
            </div>
            <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
              Personal Form Builder
            </span>
          </div>
          
          <Link href="/admin">
            <Button variant="outline" className="border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 h-9 text-xs rounded-xl font-semibold transition-colors">
              <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
              Kelola Form
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-20 text-center space-y-10 relative z-10 max-w-4xl mx-auto">
        <div className="space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-bold tracking-wide uppercase shadow-sm">
            <span>Versi 1.0.0</span>
            <span>•</span>
            <span className="text-slate-400">Serverless & Clean UI</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-slate-900 leading-[1.15]">
            Sistem Formulir Mandiri <br />
            Untuk Kebutuhan Internal Anda
          </h1>
          <p className="text-slate-500 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed pt-2">
            Bangun, sebarkan, dan kelola formulir kustom secara mandiri menyerupai Google Forms. Dirancang khusus untuk penggunaan pribadi/internal dengan performa serverless instan.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-md pt-2">
          <Link href="/admin" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto bg-indigo-600 text-white hover:bg-indigo-700 font-semibold px-8 h-12 shadow-md hover:shadow-indigo-500/15 transition-all duration-200 text-sm rounded-xl">
              Masuk ke Dasbor Admin
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
          <a href="https://github.com/rzarxx/form" target="_blank" rel="noreferrer" className="w-full sm:w-auto">
            <Button variant="outline" className="w-full sm:w-auto border-slate-200 text-slate-600 hover:bg-slate-50 h-12 px-8 text-sm rounded-xl font-semibold transition-colors">
              Dokumentasi GitHub
            </Button>
          </a>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-16 w-full text-left">
          
          <div className="border border-white/80 bg-white/50 backdrop-blur-md rounded-2xl p-6 space-y-3.5 hover:border-indigo-200 hover:shadow-md transition-all duration-300">
            <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
              <Layers className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-slate-800 text-base">Builder Dinamis</h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              Tentukan sendiri input yang dibutuhkan: Teks Pendek, Paragraf, Dropdown, Pilihan Ganda (Radio), hingga Unggah Gambar/File.
            </p>
          </div>

          <div className="border border-white/80 bg-white/50 backdrop-blur-md rounded-2xl p-6 space-y-3.5 hover:border-indigo-200 hover:shadow-md transition-all duration-300">
            <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-slate-800 text-base">Unduh Data CSV</h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              Ekspor seluruh tanggapan masuk langsung ke format Excel/CSV yang bersih dalam satu klik, lengkap dengan link file yang diunggah.
            </p>
          </div>

          <div className="border border-white/80 bg-white/50 backdrop-blur-md rounded-2xl p-6 space-y-3.5 hover:border-indigo-200 hover:shadow-md transition-all duration-300">
            <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-slate-800 text-base">Validasi & Keamanan</h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              Dilengkapi dengan validasi input wajib, format email otomatis, serta keamanan basis data PostgreSQL dari serangan SQL Injection.
            </p>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/50 py-8 text-center text-xs text-slate-500 bg-white/10 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} Personal Form Builder. Hak Cipta Dilindungi.</p>
          <p className="flex items-center justify-center text-[10px] font-semibold text-slate-400">
            <Lock className="h-2.5 w-2.5 mr-1.5 text-slate-400" />
            Sandi Admin Tersimpan Aman di Environment Variables (.env)
          </p>
        </div>
      </footer>
    </div>
  );
}

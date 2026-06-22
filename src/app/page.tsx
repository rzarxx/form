import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { 
  FileSpreadsheet, 
  Settings, 
  ArrowRight, 
  Layers, 
  Download, 
  CheckCircle, 
  Lock 
} from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-radial from-neutral-900 to-neutral-950 text-neutral-100 overflow-hidden relative">
      {/* Background radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="border-b border-neutral-900/60 bg-neutral-950/20 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="h-9 w-9 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
            </div>
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-neutral-100 to-neutral-400 bg-clip-text text-transparent">
              Personal Form Builder
            </span>
          </div>
          
          <Link href="/admin">
            <Button variant="outline" className="border-neutral-800 text-neutral-300 hover:bg-neutral-900 hover:text-neutral-100 h-9 text-xs">
              <Settings className="h-3.5 w-3.5 mr-1.5" />
              Kelola Form
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-20 text-center space-y-10 relative z-10 max-w-4xl mx-auto">
        <div className="space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold tracking-wide uppercase">
            <span>Versi 1.0.0</span>
            <span>•</span>
            <span className="text-neutral-400">Serverless & Clean UI</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight bg-gradient-to-b from-neutral-50 via-neutral-150 to-neutral-400 bg-clip-text text-transparent leading-[1.15]">
            Sistem Formulir Mandiri <br />
            Untuk Kebutuhan Internal Anda
          </h1>
          <p className="text-neutral-400 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed pt-2">
            Bangun, sebarkan, dan kelola formulir kustom secara mandiri menyerupai Google Forms. Dirancang khusus untuk penggunaan pribadi/internal dengan performa serverless instan.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-md pt-2">
          <Link href="/admin" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/95 font-medium px-8 h-12 shadow-lg hover:shadow-primary/15 transition-all duration-200 text-sm">
              Masuk ke Dasbor Admin
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <a href="https://github.com" target="_blank" rel="noreferrer" className="w-full sm:w-auto">
            <Button variant="outline" className="w-full sm:w-auto border-neutral-800 text-neutral-300 hover:bg-neutral-900 h-12 px-8 text-sm">
              Dokumentasi GitHub
            </Button>
          </a>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-16 w-full text-left">
          
          <div className="border border-neutral-900 bg-neutral-950/40 rounded-xl p-6 space-y-3 hover:border-neutral-800 transition-colors">
            <div className="h-10 w-10 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-primary">
              <Layers className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-neutral-200">Builder Dinamis</h3>
            <p className="text-neutral-500 text-sm leading-relaxed">
              Tentukan sendiri input yang dibutuhkan: Teks Pendek, Paragraf, Dropdown, Pilihan Ganda (Radio), hingga Unggah Gambar/File.
            </p>
          </div>

          <div className="border border-neutral-900 bg-neutral-950/40 rounded-xl p-6 space-y-3 hover:border-neutral-800 transition-colors">
            <div className="h-10 w-10 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-primary">
              <Download className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-neutral-200">Unduh Data CSV</h3>
            <p className="text-neutral-500 text-sm leading-relaxed">
              Ekspor seluruh tanggapan masuk langsung ke format Excel/CSV yang bersih dalam satu klik, lengkap dengan link file yang diunggah.
            </p>
          </div>

          <div className="border border-neutral-900 bg-neutral-950/40 rounded-xl p-6 space-y-3 hover:border-neutral-800 transition-colors">
            <div className="h-10 w-10 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-primary">
              <CheckCircle className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-neutral-200">Validasi & Keamanan</h3>
            <p className="text-neutral-500 text-sm leading-relaxed">
              Dilengkapi dengan validasi input wajib, format email otomatis, serta keamanan basis data PostgreSQL dari serangan SQL Injection.
            </p>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-900/40 py-8 text-center text-xs text-neutral-600">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} Personal Form Builder. Hak Cipta Dilindungi.</p>
          <p className="flex items-center justify-center text-[10px]">
            <Lock className="h-3 w-3 mr-1 text-neutral-700" />
            Sandi Admin Tersimpan Aman di Environment Variables (.env)
          </p>
        </div>
      </footer>
    </div>
  );
}

"use client";

import React, { useState, useTransition, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { registerAction } from "@/app/actions/auth";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planParam = searchParams.get("plan");
  const defaultPlan = (planParam === "pro" || planParam === "free") ? planParam : "free";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [plan, setPlan] = useState<"free" | "pro">(defaultPlan);
  const [isPending, startTransition] = useTransition();

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      toast.error("Semua kolom wajib diisi.");
      return;
    }
    if (!email.trim().toLowerCase().endsWith("@gmail.com")) {
      toast.error("Hanya alamat email @gmail.com yang diperbolehkan.");
      return;
    }
    const localPart = email.trim().toLowerCase().split("@")[0];
    if (localPart.includes(".")) {
      toast.error("Penggunaan dot trick (titik) pada alamat Gmail tidak diperbolehkan.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Konfirmasi password tidak cocok.");
      return;
    }
    if (password.length < 6) {
      toast.error("Kata sandi harus minimal 6 karakter.");
      return;
    }

    startTransition(async () => {
      try {
        const result = await registerAction(name.trim(), email.trim(), password, plan);
        if (result.success) {
          toast.success("Pendaftaran berhasil! Selamat datang.");
          router.push("/admin");
          router.refresh();
        } else {
          toast.error(result.error || "Gagal mendaftar.");
        }
      } catch (err) {
        toast.error("Terjadi kesalahan sistem saat mendaftar.");
        console.error(err);
      }
    });
  };

  return (
    <div className="flex flex-col min-h-screen items-center justify-center bg-gradient-to-tr from-indigo-50 via-slate-50 to-blue-50/50 p-4 relative overflow-hidden text-slate-800">
      {/* Background glow decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />

      <Card className="w-full max-w-md border-white/60 bg-white/70 backdrop-blur-xl shadow-xl relative overflow-hidden transition-all duration-300 hover:shadow-indigo-500/5 group rounded-2xl">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent opacity-70 group-hover:opacity-100 transition-opacity" />
        
        <CardHeader className="space-y-3 text-center pt-8">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 shadow-inner">
            <i className="fa-solid fa-user-plus text-base"></i>
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl font-black tracking-tight text-slate-900">
              Daftar Akun Baru
            </CardTitle>
            <CardDescription className="text-slate-500 text-xs">
              Buat akun pembuat form Anda secara instan sekarang
            </CardDescription>
          </div>
        </CardHeader>
        
        <form onSubmit={handleRegister}>
          <CardContent className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-slate-600 text-xs font-semibold">
                Nama Lengkap
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="Masukkan nama lengkap Anda"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isPending}
                className="bg-white/60 border border-slate-200 text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 focus:bg-white h-11 rounded-xl transition-all text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-600 text-xs font-semibold">
                Alamat Email (@gmail.com)
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="contoh@gmail.com (tanpa titik/dot trick)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isPending}
                className="bg-white/60 border border-slate-200 text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 focus:bg-white h-11 rounded-xl transition-all text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-600 text-xs font-semibold">Pilih Paket Akun</Label>
              <div className="grid grid-cols-2 gap-3">
                <div 
                  onClick={() => !isPending && setPlan("free")}
                  className={`border p-3 rounded-xl cursor-pointer text-center transition-all ${plan === "free" ? "border-indigo-500 bg-indigo-50/50 text-indigo-700 font-bold" : "border-slate-200 hover:bg-slate-50 text-slate-500"}`}
                >
                  <span className="block text-sm">Basic (Free)</span>
                  <span className="block text-[10px] text-slate-400 font-normal">Rp0 / selamanya</span>
                </div>
                <div 
                  onClick={() => !isPending && setPlan("pro")}
                  className={`border p-3 rounded-xl cursor-pointer text-center transition-all relative overflow-hidden ${plan === "pro" ? "border-indigo-500 bg-indigo-50/50 text-indigo-700 font-bold" : "border-slate-200 hover:bg-slate-50 text-slate-500"}`}
                >
                  <div className="absolute top-0 right-0 bg-indigo-500 text-white text-[8px] px-1.5 py-0.5 rounded-bl">PRO</div>
                  <span className="block text-sm">Pro Premium</span>
                  <span className="block text-[10px] text-slate-400 font-normal">Rp99.000 / bln</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-600 text-xs font-semibold">
                Kata Sandi
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Minimal 6 karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isPending}
                className="bg-white/60 border border-slate-200 text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 focus:bg-white h-11 rounded-xl transition-all text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-slate-600 text-xs font-semibold">
                Ulangi Kata Sandi
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Ulangi kata sandi"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isPending}
                className="bg-white/60 border border-slate-200 text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 focus:bg-white h-11 rounded-xl transition-all text-sm"
              />
            </div>
          </CardContent>
          
          <CardFooter className="flex flex-col pb-8 pt-4 gap-4">
            <Button
              type="submit"
              disabled={isPending}
              className="w-full h-11 bg-indigo-600 text-white hover:bg-indigo-700 font-semibold transition-all duration-200 shadow-sm hover:shadow-indigo-500/10 hover:scale-[1.015] rounded-xl cursor-pointer"
            >
              {isPending ? (
                <>
                  <i className="fa-solid fa-circle-notch fa-spin mr-2"></i>
                  Mendaftarkan...
                </>
              ) : (
                <>
                  Daftarkan Akun
                  <i className="fa-solid fa-user-check ml-2 text-sm"></i>
                </>
              )}
            </Button>

            <div className="text-center">
              <span className="text-xs text-slate-500">Sudah punya akun? </span>
              <Link href="/login" className="text-xs text-indigo-600 font-bold hover:underline">
                Masuk di sini
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-tr from-indigo-50 via-slate-50 to-blue-50/50 flex items-center justify-center">
        <i className="fa-solid fa-circle-notch fa-spin text-indigo-600 text-3xl"></i>
      </div>
    }>
      <RegisterForm />
    </Suspense>
  );
}

"use client";

import React, { useState, useTransition, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loginAction } from "@/app/actions/auth";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      toast.error("Password wajib diisi.");
      return;
    }

    startTransition(async () => {
      try {
        const result = await loginAction(password);
        if (result.success) {
          toast.success("Login berhasil!");
          const redirectTo = searchParams.get("from") || "/admin";
          router.push(redirectTo);
          router.refresh();
        } else {
          toast.error(result.error || "Password salah.");
        }
      } catch (err) {
        toast.error("Terjadi kesalahan sistem saat masuk.");
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
            <i className="fa-solid fa-lock text-base"></i>
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl font-black tracking-tight text-slate-900">
              Panel Administrator
            </CardTitle>
            <CardDescription className="text-slate-500 text-xs">
              Masukkan kata sandi akses untuk mengelola formulir dinamis
            </CardDescription>
          </div>
        </CardHeader>
        
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-600 text-xs font-semibold">
                Kata Sandi Admin
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isPending}
                className="bg-white/60 border border-slate-200 text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 focus:bg-white h-11 rounded-xl transition-all"
              />
            </div>
          </CardContent>
          
          <CardFooter className="pb-8 pt-4">
            <Button
              type="submit"
              disabled={isPending}
              className="w-full h-11 bg-indigo-600 text-white hover:bg-indigo-700 font-semibold transition-all duration-200 shadow-sm hover:shadow-indigo-500/10 hover:scale-[1.015] rounded-xl cursor-pointer"
            >
              {isPending ? (
                <>
                  <i className="fa-solid fa-circle-notch fa-spin mr-2"></i>
                  Memverifikasi...
                </>
              ) : (
                <>
                  Masuk ke Dasbor
                  <i className="fa-solid fa-arrow-right ml-2 text-sm"></i>
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-tr from-indigo-50 via-slate-50 to-blue-50/50 flex items-center justify-center">
        <i className="fa-solid fa-circle-notch fa-spin text-indigo-600 text-3xl"></i>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}

"use client";

import React, { useState, useTransition, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loginAction } from "@/app/actions/auth";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Lock, ArrowRight, Loader2 } from "lucide-react";

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
    <div className="flex flex-col min-h-screen items-center justify-center bg-radial from-neutral-900 to-neutral-950 p-4">
      {/* Background decoration */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-primary/10 blur-[100px] pointer-events-none" />

      <Card className="w-full max-w-md border-neutral-800 bg-neutral-900/60 backdrop-blur-xl shadow-2xl relative overflow-hidden transition-all duration-300 hover:border-neutral-700">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
        
        <CardHeader className="space-y-2 text-center pt-8">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-neutral-800 border border-neutral-700">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-neutral-100">
            Panel Admin
          </CardTitle>
          <CardDescription className="text-neutral-400">
            Masukkan kata sandi untuk mengelola formulir Anda
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-neutral-300 text-sm">
                Kata Sandi
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isPending}
                className="bg-neutral-950/80 border-neutral-800 text-neutral-200 placeholder-neutral-600 focus:border-primary focus:ring-1 focus:ring-primary/50 h-11"
              />
            </div>
          </CardContent>
          
          <CardFooter className="pb-8 pt-4">
            <Button
              type="submit"
              disabled={isPending}
              className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/95 font-medium transition-all duration-200"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  Masuk
                  <ArrowRight className="ml-2 h-4 w-4" />
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
      <div className="min-h-screen bg-radial from-neutral-900 to-neutral-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}

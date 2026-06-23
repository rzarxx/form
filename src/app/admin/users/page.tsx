"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getUsersAction, impersonateUserAction } from "@/app/actions/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface UserSchema {
  id: string;
  email: string;
  role: string;
  created_at: string;
}

export default function ManageUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserSchema[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    async function loadUsers() {
      try {
        const res = await getUsersAction();
        if (res.success && res.data) {
          setUsers(res.data as unknown as UserSchema[]);
        } else {
          toast.error(res.error || "Gagal memuat daftar pengguna.");
          router.push("/admin");
        }
      } catch (err) {
        console.error("Error loading users:", err);
        toast.error("Terjadi kesalahan sistem saat memuat pengguna.");
        router.push("/admin");
      } finally {
        setIsLoading(false);
      }
    }
    loadUsers();
  }, [router]);

  const handleImpersonate = (userId: string, email: string) => {
    startTransition(async () => {
      try {
        const res = await impersonateUserAction(userId);
        if (res.success) {
          toast.success(`Berhasil masuk sebagai ${email}`);
          router.push("/admin");
          router.refresh();
        } else {
          toast.error(res.error || "Gagal masuk sebagai pengguna.");
        }
      } catch (err) {
        console.error("Impersonation failed:", err);
        toast.error("Terjadi kesalahan sistem.");
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-300 border-t-indigo-650"></div>
          <p className="text-sm font-semibold text-slate-500">Memuat daftar pengguna...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl p-4 md:p-6 2xl:p-10 space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
          <i className="fa-solid fa-users text-indigo-600"></i> Kelola Pengguna
        </h1>
        <p className="text-sm text-slate-500 font-medium mt-1">
          Daftar semua pengguna terdaftar dan fitur masuk akun langsung (impersonasi) tanpa password.
        </p>
      </div>

      <Card className="border-slate-200/80 shadow-sm bg-white rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
          <CardTitle className="text-base font-bold text-slate-800">
            Daftar Pengguna Aktif ({users.length})
          </CardTitle>
          <CardDescription className="text-xs">
            Klik tombol aksi untuk langsung masuk dan melihat dasbor formulir pengguna tersebut.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-650 font-bold">
                  <th className="px-6 py-4">No</th>
                  <th className="px-6 py-4">Alamat Email</th>
                  <th className="px-6 py-4">Peran (Role)</th>
                  <th className="px-6 py-4">Tanggal Daftar</th>
                  <th className="px-6 py-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {users.length > 0 ? (
                  users.map((u, idx) => (
                    <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-400">{idx + 1}</td>
                      <td className="px-6 py-4 font-bold text-slate-800">{u.email}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          u.role === "super_admin" 
                            ? "bg-rose-100 text-rose-700" 
                            : "bg-indigo-100 text-indigo-700"
                        }`}>
                          <i className={`fa-solid ${u.role === "super_admin" ? "fa-shield-halved" : "fa-user"} text-[10px]`}></i>
                          {u.role === "super_admin" ? "Super Admin" : "User"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {new Date(u.created_at).toLocaleDateString("id-ID", {
                          year: "numeric",
                          month: "long",
                          day: "numeric"
                        })}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {u.role !== "super_admin" ? (
                          <Button
                            onClick={() => handleImpersonate(u.id, u.email)}
                            disabled={isPending}
                            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 hover:text-indigo-700 font-bold text-xs px-4 py-2 rounded-xl transition-all border border-indigo-200/40 shadow-inner flex items-center gap-1.5 mx-auto cursor-pointer animate-fade-in"
                          >
                            <i className="fa-solid fa-user-lock text-[10px]"></i>
                            Masuk Akun
                          </Button>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium italic">Tidak Tersedia</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-400 font-medium">
                      Belum ada pengguna terdaftar di sistem.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

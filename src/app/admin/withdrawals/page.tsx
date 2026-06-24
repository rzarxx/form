"use client";

import React, { useState, useEffect, useTransition } from "react";
import { 
  getAdminPendingWithdrawalsAction, 
  processWithdrawalAction 
} from "@/app/actions/withdrawals";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { 
  Wallet, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Building, 
  CreditCard, 
  User, 
  Calendar,
  AlertTriangle,
  Mail,
  ShieldCheck,
  Check,
  X
} from "lucide-react";

interface AdminWithdrawalItem {
  id: string;
  user_id: string;
  user_email: string;
  amount: number;
  bank_name: string;
  account_number: string;
  account_name: string;
  status: string;
  created_at: string;
}

export default function AdminWithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<AdminWithdrawalItem[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "completed" | "rejected">("pending");
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const loadWithdrawals = async () => {
    try {
      const res = await getAdminPendingWithdrawalsAction();
      if (res.success && res.data) {
        setWithdrawals(res.data as any as AdminWithdrawalItem[]);
      } else {
        toast.error(res.error || "Gagal mengambil daftar penarikan.");
      }
    } catch (err) {
      console.error("Error loading withdrawals:", err);
      toast.error("Terjadi kesalahan sistem saat memuat data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWithdrawals();
  }, []);

  const handleProcess = (withdrawalId: string, status: "completed" | "rejected") => {
    const confirmationText = status === "completed" 
      ? "Apakah Anda yakin telah mengirim dana ke rekening tujuan dan ingin menandai penarikan ini sebagai selesai?" 
      : "Apakah Anda yakin ingin menolak pengajuan penarikan dana ini? Saldo akan dikembalikan ke Creator.";
      
    if (!window.confirm(confirmationText)) return;

    startTransition(async () => {
      try {
        const res = await processWithdrawalAction(withdrawalId, status);
        if (res.success) {
          toast.success(res.message || "Penarikan dana berhasil diproses!");
          loadWithdrawals(); // Reload list
        } else {
          toast.error(res.error || "Gagal memproses penarikan.");
        }
      } catch (err) {
        console.error("Process withdrawal error:", err);
        toast.error("Terjadi kesalahan sistem saat memproses.");
      }
    });
  };

  const filteredItems = withdrawals.filter((item) => {
    if (filter === "all") return true;
    return item.status === filter;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
            <CheckCircle className="h-3.5 w-3.5" /> Selesai
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 border border-rose-200">
            <XCircle className="h-3.5 w-3.5" /> Ditolak
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 border border-amber-200 animate-pulse">
            <Clock className="h-3.5 w-3.5" /> Menunggu
          </span>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
        <span className="ml-3 text-slate-500 font-semibold">Memuat data penarikan...</span>
      </div>
    );
  }

  const pendingCount = withdrawals.filter(w => w.status === "pending").length;

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-6 space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
          <ShieldCheck className="h-8 w-8 text-indigo-600" /> Manajemen Penarikan Dana (Withdrawals)
        </h1>
        <p className="text-sm text-slate-500">
          Super Admin panel untuk meninjau, menyetujui, dan menolak pengajuan penarikan dana dari Creator.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-2">
        <div className="flex flex-wrap gap-2">
          {(["pending", "completed", "rejected", "all"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-4 py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer capitalize ${
                filter === t
                  ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                  : "bg-white border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              }`}
            >
              {t === "all" ? "Semua" : t === "pending" ? `Menunggu (${pendingCount})` : t === "completed" ? "Selesai" : "Ditolak"}
            </button>
          ))}
        </div>
        
        {pendingCount > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-1.5 flex items-center gap-2 text-xs text-amber-700 font-semibold">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            Ada {pendingCount} antrean pembayaran transfer manual tertunda.
          </div>
        )}
      </div>

      {/* Main List */}
      <div className="grid grid-cols-1 gap-6">
        {filteredItems.length === 0 ? (
          <Card className="border border-slate-200 shadow-sm rounded-2xl py-12 text-center text-slate-400">
            <CardContent className="space-y-3">
              <Check className="h-10 w-10 mx-auto text-slate-300 bg-slate-50 p-2.5 rounded-full" />
              <p className="text-sm font-semibold">Tidak ada data penarikan untuk filter ini.</p>
              <p className="text-xs">Antrean pengajuan dana akan muncul jika ada penarikan baru.</p>
            </CardContent>
          </Card>
        ) : (
          filteredItems.map((item) => (
            <Card key={item.id} className="shadow-sm border border-slate-200/80 hover:shadow-md hover:border-slate-300 transition-all duration-200 rounded-3xl overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 flex flex-col sm:flex-row justify-between sm:items-center gap-3 py-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-slate-400 font-bold bg-white border border-slate-200 rounded-md px-1.5 py-0.5">#{item.id.slice(0, 8)}</span>
                    <span className="text-xs text-slate-500 font-semibold flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(item.created_at).toLocaleString("id-ID")}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-700 font-bold">
                    <Mail className="h-3.5 w-3.5 text-slate-400" /> {item.user_email}
                  </div>
                </div>
                <div>
                  {getStatusBadge(item.status)}
                </div>
              </CardHeader>
              <CardContent className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                {/* Nominal & Bank details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full md:w-auto">
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Nominal Transfer</span>
                    <h3 className="text-2xl font-black text-slate-900">
                      Rp {item.amount.toLocaleString("id-ID")}
                    </h3>
                  </div>

                  <div className="bg-indigo-50/20 border border-indigo-100/50 rounded-2xl p-4 space-y-2 text-xs">
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-indigo-600" />
                      <span className="font-bold text-indigo-900">{item.bank_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-indigo-600" />
                      <span className="font-mono font-bold text-slate-800">{item.account_number}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-indigo-600" />
                      <span className="font-bold text-slate-700 uppercase tracking-wide">{item.account_name}</span>
                    </div>
                  </div>
                </div>

                {/* Quick actions for admin */}
                {item.status === "pending" && (
                  <div className="flex flex-row sm:flex-col md:flex-row gap-3 w-full md:w-auto mt-4 md:mt-0">
                    <Button
                      onClick={() => handleProcess(item.id, "rejected")}
                      disabled={isPending}
                      variant="outline"
                      className="flex-1 md:flex-none border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 font-bold px-4 py-2 rounded-xl cursor-pointer flex items-center gap-1.5 justify-center"
                    >
                      <X className="h-4 w-4" /> Tolak
                    </Button>
                    <Button
                      onClick={() => handleProcess(item.id, "completed")}
                      disabled={isPending}
                      className="flex-1 md:flex-none bg-emerald-600 text-white hover:bg-emerald-700 font-bold px-4 py-2 rounded-xl cursor-pointer flex items-center gap-1.5 justify-center"
                    >
                      <Check className="h-4 w-4" /> Tandai Selesai
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

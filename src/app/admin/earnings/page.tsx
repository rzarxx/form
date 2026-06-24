"use client";

import React, { useState, useEffect, useTransition } from "react";
import { 
  getCreatorBalanceAction, 
  requestWithdrawalAction, 
  getWithdrawalHistoryAction, 
  getCreatorTransactionsAction 
} from "@/app/actions/withdrawals";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { 
  Wallet, 
  DollarSign, 
  TrendingUp, 
  ArrowUpRight, 
  Building, 
  CreditCard, 
  User, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Calendar,
  Layers,
  ArrowDownLeft,
  ChevronRight
} from "lucide-react";

interface BalanceData {
  balance: number;
  total_earned: number;
  total_withdrawn: number;
  updated_at: string;
}

interface WithdrawalItem {
  id: string;
  amount: number;
  bank_name: string;
  account_number: string;
  account_name: string;
  status: string;
  created_at: string;
  completed_at: string | null;
}

interface TransactionItem {
  id: string;
  reference: string;
  amount: number;
  platform_commission: number;
  creator_amount: number;
  payment_method: string;
  status: string;
  payer_name: string;
  payer_email: string;
  created_at: string;
  form_title: string;
}

export default function CreatorEarningsPage() {
  const [balance, setBalance] = useState<BalanceData>({
    balance: 0,
    total_earned: 0,
    total_withdrawn: 0,
    updated_at: new Date().toISOString()
  });

  const [withdrawals, setWithdrawals] = useState<WithdrawalItem[]>([]);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [activeTab, setActiveTab] = useState<"transactions" | "withdrawals">("transactions");

  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [formData, setFormData] = useState({
    amount: "",
    bankName: "",
    accountNumber: "",
    accountName: ""
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const loadData = async () => {
    try {
      const [balRes, witRes, txRes] = await Promise.all([
        getCreatorBalanceAction(),
        getWithdrawalHistoryAction(),
        getCreatorTransactionsAction()
      ]);

      if (balRes.success && balRes.data) {
        setBalance(balRes.data as any as BalanceData);
      }
      if (witRes.success && witRes.data) {
        setWithdrawals(witRes.data as any as WithdrawalItem[]);
      }
      if (txRes.success && txRes.data) {
        setTransactions(txRes.data as any as TransactionItem[]);
      }
    } catch (err) {
      console.error("Error loading financial data:", err);
      toast.error("Terjadi kesalahan saat memuat data keuangan.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRequestWithdrawal = (e: React.FormEvent) => {
    e.preventDefault();
    const withdrawAmount = parseInt(formData.amount, 10);

    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      toast.error("Jumlah penarikan tidak valid.");
      return;
    }

    if (withdrawAmount < 20000) {
      toast.error("Minimal penarikan dana adalah Rp20.000.");
      return;
    }

    if (withdrawAmount > balance.balance) {
      toast.error("Saldo aktif Anda tidak mencukupi.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await requestWithdrawalAction({
          amount: withdrawAmount,
          bankName: formData.bankName,
          accountNumber: formData.accountNumber,
          accountName: formData.accountName
        });

        if (res.success) {
          toast.success(res.message || "Pengajuan penarikan dikirim!");
          setIsWithdrawOpen(false);
          setFormData({ amount: "", bankName: "", accountNumber: "", accountName: "" });
          loadData(); // Reload balance and withdrawals
        } else {
          toast.error(res.error || "Gagal mengajukan penarikan.");
        }
      } catch (err) {
        console.error("Submit withdrawal error:", err);
        toast.error("Terjadi kesalahan sistem saat mengirim pengajuan.");
      }
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="h-3.5 w-3.5" /> Selesai
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-1 text-xs font-bold text-rose-700 border border-rose-200">
            <XCircle className="h-3.5 w-3.5" /> Ditolak
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700 border border-amber-200">
            <Clock className="h-3.5 w-3.5" /> Menunggu
          </span>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
        <span className="ml-3 text-slate-500 font-semibold">Memuat dasbor keuangan...</span>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
            <Wallet className="h-8 w-8 text-indigo-600" /> Keuangan & Pendapatan
          </h1>
          <p className="text-sm text-slate-500">
            Pantau saldo formulir berbayar Anda, pendapatan bersih, dan kelola penarikan dana.
          </p>
        </div>

        <Button
          onClick={() => setIsWithdrawOpen(true)}
          disabled={balance.balance < 20000}
          className="bg-indigo-600 text-white hover:bg-indigo-700 shadow-md font-bold px-6 py-2.5 rounded-xl transition-all duration-200 flex items-center gap-2 cursor-pointer"
        >
          Tarik Saldo <ArrowUpRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Cards stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Active Balance */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-300">
          <div className="absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 rounded-full bg-indigo-50 blur-xl opacity-80" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Saldo Aktif (Dapat Ditarik)</span>
            <div className="bg-indigo-50 text-indigo-600 p-2.5 rounded-xl border border-indigo-100">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 space-y-1">
            <h3 className="text-3xl font-black text-slate-950 tracking-tight">
              Rp {balance.balance.toLocaleString("id-ID")}
            </h3>
            {balance.balance < 20000 && (
              <p className="text-[10px] text-amber-600 font-bold">
                * Batas minimal penarikan adalah Rp20.000
              </p>
            )}
          </div>
        </div>

        {/* Total Earned */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-300">
          <div className="absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 rounded-full bg-emerald-50 blur-xl opacity-80" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Pendapatan Bersih</span>
            <div className="bg-emerald-50 text-emerald-600 p-2.5 rounded-xl border border-emerald-100">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 space-y-1">
            <h3 className="text-3xl font-black text-slate-950 tracking-tight">
              Rp {balance.total_earned.toLocaleString("id-ID")}
            </h3>
            <p className="text-[10px] text-slate-400">
              Sudah dipotong komisi platform
            </p>
          </div>
        </div>

        {/* Total Withdrawn */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-300">
          <div className="absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 rounded-full bg-rose-50 blur-xl opacity-80" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Dana Ditarik</span>
            <div className="bg-rose-50 text-rose-600 p-2.5 rounded-xl border border-rose-100">
              <ArrowUpRight className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 space-y-1">
            <h3 className="text-3xl font-black text-slate-950 tracking-tight">
              Rp {balance.total_withdrawn.toLocaleString("id-ID")}
            </h3>
            <p className="text-[10px] text-slate-400 font-medium">
              Mutasi berhasil dikirim ke rekening bank
            </p>
          </div>
        </div>
      </div>

      {/* Tabs list history */}
      <div className="space-y-4">
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab("transactions")}
            className={`px-4 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === "transactions"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            Transaksi Masuk ({transactions.length})
          </button>
          <button
            onClick={() => setActiveTab("withdrawals")}
            className={`px-4 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === "withdrawals"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            Riwayat Penarikan ({withdrawals.length})
          </button>
        </div>

        {activeTab === "transactions" ? (
          <Card className="shadow-sm border border-slate-200/80 rounded-2xl overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-800">Daftar Penjualan Formulir</CardTitle>
              <CardDescription>Catatan dana masuk dari responden formulir berbayar Anda.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {transactions.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <ArrowDownLeft className="h-10 w-10 mx-auto text-slate-300 mb-3" />
                  <p className="text-sm font-semibold">Belum ada transaksi masuk.</p>
                  <p className="text-xs">Uang hasil penjualan dari form berbayar akan muncul di sini.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="px-6 py-4">Tanggal & Referensi</th>
                        <th className="px-6 py-4">Nama Formulir</th>
                        <th className="px-6 py-4">Payer / Pembayar</th>
                        <th className="px-6 py-4 text-right">Nilai Kotor</th>
                        <th className="px-6 py-4 text-right">Potongan Platform</th>
                        <th className="px-6 py-4 text-right text-indigo-600 font-bold">Hasil Bersih</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                      {transactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-50/20">
                          <td className="px-6 py-4">
                            <div className="font-semibold text-slate-800">
                              {new Date(tx.created_at).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit"
                              })}
                            </div>
                            <span className="font-mono text-[10px] text-slate-400 block mt-0.5">#{tx.reference}</span>
                          </td>
                          <td className="px-6 py-4 font-bold text-slate-700 max-w-xs truncate">
                            {tx.form_title}
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-slate-800 font-semibold">{tx.payer_name || "-"}</div>
                            <span className="text-[10px] text-slate-400 block">{tx.payer_email || "-"}</span>
                          </td>
                          <td className="px-6 py-4 text-right font-semibold text-slate-600">
                            Rp {tx.amount.toLocaleString("id-ID")}
                          </td>
                          <td className="px-6 py-4 text-right text-rose-500 font-semibold">
                            -Rp {tx.platform_commission.toLocaleString("id-ID")}
                          </td>
                          <td className="px-6 py-4 text-right font-extrabold text-emerald-600 bg-emerald-50/10">
                            Rp {tx.creator_amount.toLocaleString("id-ID")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-sm border border-slate-200/80 rounded-2xl overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-800">Riwayat Penarikan Dana</CardTitle>
              <CardDescription>Status pengajuan dana yang dikirimkan ke rekening bank Anda.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {withdrawals.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <ArrowUpRight className="h-10 w-10 mx-auto text-slate-300 mb-3" />
                  <p className="text-sm font-semibold">Belum ada riwayat penarikan dana.</p>
                  <p className="text-xs">Klik tombol "Tarik Saldo" untuk mengajukan penarikan.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="px-6 py-4">Tanggal Pengajuan</th>
                        <th className="px-6 py-4">Jumlah Penarikan</th>
                        <th className="px-6 py-4">Rekening Tujuan</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Tanggal Selesai</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                      {withdrawals.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/20">
                          <td className="px-6 py-4 font-semibold text-slate-800">
                            {new Date(item.created_at).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </td>
                          <td className="px-6 py-4 font-bold text-slate-900">
                            Rp {item.amount.toLocaleString("id-ID")}
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-bold text-slate-700">{item.bank_name}</div>
                            <div className="font-semibold text-slate-500 mt-0.5">{item.account_number}</div>
                            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mt-0.5">{item.account_name}</div>
                          </td>
                          <td className="px-6 py-4">
                            {getStatusBadge(item.status)}
                          </td>
                          <td className="px-6 py-4 text-slate-500">
                            {item.completed_at ? (
                              new Date(item.completed_at).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit"
                              })
                            ) : (
                              <span className="text-slate-300 italic">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Withdrawal Dialog Modal */}
      <Dialog open={isWithdrawOpen} onOpenChange={setIsWithdrawOpen}>
        <DialogContent className="sm:max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl">
          <form onSubmit={handleRequestWithdrawal}>
            <DialogHeader className="pb-4 border-b border-slate-200">
              <DialogTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Wallet className="h-5 w-5 text-indigo-600" /> Tarik Saldo Ke Rekening
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400 mt-1">
                Uang akan ditransfer secara manual oleh admin dalam 1-3 hari kerja.
              </DialogDescription>
            </DialogHeader>

            <div className="py-6 space-y-4">
              {/* Info Saldo */}
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 flex justify-between items-center text-xs">
                <span className="font-bold text-indigo-700">Saldo Anda yang dapat ditarik:</span>
                <span className="font-black text-indigo-950 text-sm">Rp {balance.balance.toLocaleString("id-ID")}</span>
              </div>

              {/* Nominal Penarikan */}
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-slate-700 font-bold text-xs">Nominal Penarikan (Rp)</Label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 font-bold text-xs">Rp</span>
                  <Input
                    id="amount"
                    name="amount"
                    type="number"
                    min="20000"
                    max={balance.balance}
                    required
                    placeholder="Masukkan jumlah nominal (min: 20000)"
                    value={formData.amount}
                    onChange={handleChange}
                    className="pl-8"
                  />
                </div>
              </div>

              {/* Pilihan Bank */}
              <div className="space-y-2">
                <Label htmlFor="bankName" className="text-slate-700 font-bold text-xs">Nama Bank Tujuan</Label>
                <Input
                  id="bankName"
                  name="bankName"
                  required
                  placeholder="Contoh: BCA, Mandiri, BNI, BRI, dll."
                  value={formData.bankName}
                  onChange={handleChange}
                />
              </div>

              {/* Nomor Rekening */}
              <div className="space-y-2">
                <Label htmlFor="accountNumber" className="text-slate-700 font-bold text-xs">Nomor Rekening</Label>
                <Input
                  id="accountNumber"
                  name="accountNumber"
                  required
                  placeholder="Masukkan nomor rekening tujuan"
                  value={formData.accountNumber}
                  onChange={handleChange}
                />
              </div>

              {/* Atas Nama */}
              <div className="space-y-2">
                <Label htmlFor="accountName" className="text-slate-700 font-bold text-xs">Nama Pemilik Rekening</Label>
                <Input
                  id="accountName"
                  name="accountName"
                  required
                  placeholder="Masukkan nama pemilik rekening sesuai buku tabungan"
                  value={formData.accountName}
                  onChange={handleChange}
                />
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-slate-200 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsWithdrawOpen(false)}
                className="font-bold border-slate-200 text-slate-500 hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer"
              >
                {isPending ? "Mengirim..." : "Kirim Pengajuan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

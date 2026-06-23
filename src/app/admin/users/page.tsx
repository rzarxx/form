"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { 
  getUsersAction, 
  impersonateUserAction, 
  createUserAction, 
  updateUserAction, 
  deleteUserAction 
} from "@/app/actions/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { 
  Trash2, 
  Edit3, 
  Plus, 
  UserPlus, 
  LogIn, 
  Crown, 
  Shield, 
  User, 
  Calendar,
  Key
} from "lucide-react";

interface UserSchema {
  id: string;
  email: string;
  role: string;
  is_premium: boolean;
  premium_expires_at: string | null;
  created_at: string;
}

export default function ManageUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserSchema[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Form states
  const [selectedUser, setSelectedUser] = useState<UserSchema | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    role: "user",
    is_premium: false,
    premium_expires_at: "",
  });

  const loadUsers = async () => {
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
  };

  useEffect(() => {
    loadUsers();
  }, [router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const val = type === "checkbox" ? (e.target as HTMLInputElement).checked : value;
    setFormData((prev) => ({
      ...prev,
      [name]: val,
    }));
  };

  // Impersonate user
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

  // Open Create Modal
  const openCreateModal = () => {
    setFormData({
      email: "",
      password: "",
      role: "user",
      is_premium: false,
      premium_expires_at: "",
    });
    setIsCreateOpen(true);
  };

  // Create User Submit
  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        const res = await createUserAction({
          email: formData.email,
          password: formData.password || undefined,
          role: formData.role,
          is_premium: formData.is_premium,
          premium_expires_at: formData.is_premium && formData.premium_expires_at ? formData.premium_expires_at : null,
        });

        if (res.success) {
          toast.success("Pengguna baru berhasil ditambahkan!");
          setIsCreateOpen(false);
          loadUsers();
        } else {
          toast.error(res.error || "Gagal menambahkan pengguna.");
        }
      } catch (err) {
        console.error("Create user error:", err);
        toast.error("Terjadi kesalahan sistem.");
      }
    });
  };

  // Open Edit Modal
  const openEditModal = (user: UserSchema) => {
    setSelectedUser(user);
    
    // Parse date for date input
    let formattedDate = "";
    if (user.premium_expires_at) {
      formattedDate = new Date(user.premium_expires_at).toISOString().split("T")[0];
    }

    setFormData({
      email: user.email,
      password: "", // empty means no change
      role: user.role,
      is_premium: user.is_premium,
      premium_expires_at: formattedDate,
    });
    setIsEditOpen(true);
  };

  // Edit User Submit
  const handleEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    startTransition(async () => {
      try {
        const res = await updateUserAction(selectedUser.id, {
          email: formData.email,
          password: formData.password || undefined,
          role: formData.role,
          is_premium: formData.is_premium,
          premium_expires_at: formData.is_premium && formData.premium_expires_at ? formData.premium_expires_at : null,
        });

        if (res.success) {
          toast.success("Data pengguna berhasil diperbarui!");
          setIsEditOpen(false);
          loadUsers();
        } else {
          toast.error(res.error || "Gagal memperbarui pengguna.");
        }
      } catch (err) {
        console.error("Edit user error:", err);
        toast.error("Terjadi kesalahan sistem.");
      }
    });
  };

  // Open Delete Modal
  const openDeleteModal = (user: UserSchema) => {
    setSelectedUser(user);
    setIsDeleteOpen(true);
  };

  // Delete User Submit
  const handleDeleteUser = () => {
    if (!selectedUser) return;

    startTransition(async () => {
      try {
        const res = await deleteUserAction(selectedUser.id);
        if (res.success) {
          toast.success("Pengguna berhasil dihapus!");
          setIsDeleteOpen(false);
          loadUsers();
        } else {
          toast.error(res.error || "Gagal menghapus pengguna.");
        }
      } catch (err) {
        console.error("Delete user error:", err);
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
    <div className="mx-auto max-w-6xl p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <i className="fa-solid fa-users text-indigo-600"></i> Kelola Pengguna
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Tambahkan, ubah, hapus, dan kelola langganan premium pengguna secara penuh.
          </p>
        </div>
        <Button
          onClick={openCreateModal}
          className="bg-indigo-600 hover:bg-indigo-750 text-white font-semibold text-sm px-4 py-2.5 rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer"
        >
          <UserPlus size={16} />
          Tambah Pengguna
        </Button>
      </div>

      <Card className="border-slate-200/80 shadow-md bg-white rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
          <div>
            <CardTitle className="text-base font-bold text-slate-800">
              Daftar Pengguna Aktif ({users.length})
            </CardTitle>
            <CardDescription className="text-xs">
              Kelola semua pengguna terdaftar dan fitur masuk akun langsung (impersonasi).
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-650 font-bold">
                  <th className="px-6 py-4">No</th>
                  <th className="px-6 py-4">Alamat Email</th>
                  <th className="px-6 py-4">Peran (Role)</th>
                  <th className="px-6 py-4">Status Akun</th>
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
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          u.role === "super_admin" 
                            ? "bg-rose-50 text-rose-700 border border-rose-200/50" 
                            : "bg-blue-50 text-blue-700 border border-blue-200/50"
                        }`}>
                          {u.role === "super_admin" ? (
                            <Shield size={10} className="text-rose-600" />
                          ) : (
                            <User size={10} className="text-blue-600" />
                          )}
                          {u.role === "super_admin" ? "Super Admin" : "User"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {u.is_premium ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="inline-flex items-center gap-1 w-fit px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200/50">
                              <Crown size={10} className="fill-amber-500 text-amber-600" />
                              Premium
                            </span>
                            <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <Calendar size={10} />
                              Exp: {u.premium_expires_at ? new Date(u.premium_expires_at).toLocaleDateString("id-ID", {
                                year: "numeric",
                                month: "short",
                                day: "numeric"
                              }) : "Selamanya"}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200/50">
                            Regular
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {new Date(u.created_at).toLocaleDateString("id-ID", {
                          year: "numeric",
                          month: "long",
                          day: "numeric"
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          {u.role !== "super_admin" && (
                            <Button
                              onClick={() => handleImpersonate(u.id, u.email)}
                              disabled={isPending}
                              title="Masuk ke Akun"
                              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200/40 p-2 rounded-lg cursor-pointer transition-all hover:scale-105 shadow-sm"
                            >
                              <LogIn size={14} />
                            </Button>
                          )}
                          <Button
                            onClick={() => openEditModal(u)}
                            disabled={isPending}
                            title="Edit Pengguna"
                            className="bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/60 p-2 rounded-lg cursor-pointer transition-all hover:scale-105 shadow-sm"
                          >
                            <Edit3 size={14} />
                          </Button>
                          <Button
                            onClick={() => openDeleteModal(u)}
                            disabled={isPending}
                            title="Hapus Pengguna"
                            className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/40 p-2 rounded-lg cursor-pointer transition-all hover:scale-105 shadow-sm"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-400 font-medium">
                      Belum ada pengguna terdaftar di sistem.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* CREATE MODAL */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl">
          <form onSubmit={handleCreateUser}>
            <DialogHeader className="pb-4 border-b border-slate-150">
              <DialogTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <UserPlus className="text-indigo-600" /> Tambah Pengguna Baru
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400 mt-1">
                Masukkan email, password, dan perizinan akses untuk pengguna baru.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="create-email">Alamat Email</Label>
                <Input
                  id="create-email"
                  name="email"
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="rounded-xl border-slate-200/80 focus:border-indigo-500 focus:ring-indigo-500/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-password">Kata Sandi (Password)</Label>
                <Input
                  id="create-password"
                  name="password"
                  type="password"
                  placeholder="Masukkan kata sandi (default: user123)"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="rounded-xl border-slate-200/80 focus:border-indigo-500 focus:ring-indigo-500/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-role">Peran (Role)</Label>
                <select
                  id="create-role"
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="flex h-9 w-full rounded-xl border border-slate-200/80 bg-white px-3 py-1.5 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/25 cursor-pointer"
                >
                  <option value="user">User biasa (Dapat membuat form)</option>
                  <option value="super_admin">Super Admin (Akses penuh)</option>
                </select>
              </div>

              <div className="border border-slate-150 rounded-xl p-3 bg-slate-50/50 space-y-3">
                <div className="flex items-center space-x-2">
                  <input
                    id="create-is-premium"
                    name="is_premium"
                    type="checkbox"
                    checked={formData.is_premium}
                    onChange={handleInputChange}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-655 focus:ring-indigo-650 cursor-pointer"
                  />
                  <Label htmlFor="create-is-premium" className="font-semibold text-slate-700 cursor-pointer flex items-center gap-1.5 text-xs">
                    <Crown size={12} className="text-amber-500 fill-amber-500" />
                    Aktifkan Paket Premium
                  </Label>
                </div>

                {formData.is_premium && (
                  <div className="space-y-1.5 pl-6 animate-fade-in">
                    <Label htmlFor="create-premium-expires" className="text-xs text-slate-500">Masa Berlaku Premium</Label>
                    <Input
                      id="create-premium-expires"
                      name="premium_expires_at"
                      type="date"
                      value={formData.premium_expires_at}
                      onChange={handleInputChange}
                      className="rounded-xl border-slate-200/80 text-xs w-full py-1 h-8"
                    />
                    <p className="text-[10px] text-slate-400">Kosongkan jika ingin premium selamanya (tanpa batas waktu).</p>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-slate-150 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                className="rounded-xl font-medium border-slate-200 hover:bg-slate-50 text-xs py-2 cursor-pointer"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-xs py-2 px-4 flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                {isPending ? "Menyimpan..." : "Tambah Pengguna"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT MODAL */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl">
          <form onSubmit={handleEditUser}>
            <DialogHeader className="pb-4 border-b border-slate-150">
              <DialogTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Edit3 size={18} className="text-indigo-600" /> Edit Data Pengguna
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400 mt-1">
                Ubah informasi profil, kata sandi, peran, atau status premium pengguna.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-email">Alamat Email</Label>
                <Input
                  id="edit-email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="rounded-xl border-slate-200/80 focus:border-indigo-500 focus:ring-indigo-500/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-password">Kata Sandi Baru (Opsional)</Label>
                <div className="relative">
                  <Input
                    id="edit-password"
                    name="password"
                    type="password"
                    placeholder="Kosongkan jika tidak ingin diubah"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="rounded-xl border-slate-200/80 focus:border-indigo-500 focus:ring-indigo-500/20 pr-9"
                  />
                  <div className="absolute inset-y-0 right-3 flex items-center text-slate-400">
                    <Key size={14} />
                  </div>
                </div>
                <p className="text-[10px] text-slate-400">Hanya diisi jika ingin mereset password akun pengguna ini.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-role">Peran (Role)</Label>
                <select
                  id="edit-role"
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="flex h-9 w-full rounded-xl border border-slate-200/80 bg-white px-3 py-1.5 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/25 cursor-pointer"
                >
                  <option value="user">User biasa (Dapat membuat form)</option>
                  <option value="super_admin">Super Admin (Akses penuh)</option>
                </select>
              </div>

              <div className="border border-slate-150 rounded-xl p-3 bg-slate-50/50 space-y-3">
                <div className="flex items-center space-x-2">
                  <input
                    id="edit-is-premium"
                    name="is_premium"
                    type="checkbox"
                    checked={formData.is_premium}
                    onChange={handleInputChange}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-650 focus:ring-indigo-650 cursor-pointer"
                  />
                  <Label htmlFor="edit-is-premium" className="font-semibold text-slate-700 cursor-pointer flex items-center gap-1.5 text-xs">
                    <Crown size={12} className="text-amber-500 fill-amber-500" />
                    Aktifkan Paket Premium
                  </Label>
                </div>

                {formData.is_premium && (
                  <div className="space-y-1.5 pl-6 animate-fade-in">
                    <Label htmlFor="edit-premium-expires" className="text-xs text-slate-500">Masa Berlaku Premium</Label>
                    <Input
                      id="edit-premium-expires"
                      name="premium_expires_at"
                      type="date"
                      value={formData.premium_expires_at}
                      onChange={handleInputChange}
                      className="rounded-xl border-slate-200/80 text-xs w-full py-1 h-8"
                    />
                    <p className="text-[10px] text-slate-400">Kosongkan jika ingin premium selamanya (tanpa batas waktu).</p>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-slate-150 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditOpen(false)}
                className="rounded-xl font-medium border-slate-200 hover:bg-slate-50 text-xs py-2 cursor-pointer"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl font-semibold text-xs py-2 px-4 flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                {isPending ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRM MODAL */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl">
          <DialogHeader className="pb-3">
            <DialogTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Trash2 className="text-rose-600" /> Hapus Akun Pengguna?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 mt-2">
              Apakah Anda benar-benar yakin ingin menghapus akun pengguna berikut?
            </DialogDescription>
          </DialogHeader>

          <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 my-2 text-sm space-y-1">
            <p className="text-xs font-bold text-rose-800">Detail Pengguna:</p>
            <p className="text-xs font-mono text-rose-700 bg-rose-100/50 p-1.5 rounded mt-1 overflow-x-auto">
              Email: {selectedUser?.email}
            </p>
            <p className="text-[11px] text-rose-600 font-medium pt-1">
              ⚠️ Seluruh formulir, riwayat respon formulir, dan transaksi terkait akun ini akan dihapus secara permanen dari sistem database.
            </p>
          </div>

          <DialogFooter className="pt-4 border-t border-slate-150 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteOpen(false)}
              className="rounded-xl font-medium border-slate-200 hover:bg-slate-50 text-xs py-2 cursor-pointer"
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleDeleteUser}
              disabled={isPending}
              className="bg-rose-600 hover:bg-rose-750 text-white rounded-xl font-semibold text-xs py-2 px-4 shadow-sm cursor-pointer"
            >
              {isPending ? "Menghapus..." : "Ya, Hapus Permanen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

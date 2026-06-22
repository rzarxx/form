"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";
import { toast } from "sonner";
import { 
  LayoutDashboard, 
  PlusCircle, 
  LogOut, 
  Menu, 
  X, 
  User, 
  FileSpreadsheet
} from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleLogout = async () => {
    startTransition(async () => {
      const result = await logoutAction();
      if (result.success) {
        toast.success("Berhasil keluar.");
        router.push("/login");
        router.refresh();
      } else {
        toast.error("Gagal keluar.");
      }
    });
  };

  const menuItems = [
    {
      name: "Dashboard",
      path: "/admin",
      icon: LayoutDashboard,
    },
    {
      name: "Buat Form Baru",
      path: "/admin/forms/new",
      icon: PlusCircle,
    },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-950 text-neutral-100 font-sans">
      {/* Sidebar for Desktop & Mobile Toggle */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-[#1c2434] border-r border-[#2e3a4f]/40 transition-all duration-300 xl:translate-x-0 xl:static ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between gap-2 px-6 py-5 border-b border-[#2e3a4f]/60">
          <Link href="/admin" className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center text-primary">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <span className="font-bold text-lg text-white tracking-tight">
              TailAdmin
            </span>
          </Link>

          <button
            onClick={() => setSidebarOpen(false)}
            className="block xl:hidden text-neutral-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Sidebar Navigation */}
        <div className="no-scrollbar flex flex-col overflow-y-auto flex-1 py-4">
          <nav className="px-4 py-4 space-y-6">
            <div>
              <h3 className="mb-4 ml-4 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Menu Utama
              </h3>

              <ul className="mb-6 flex flex-col gap-1.5">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.path;
                  return (
                    <li key={item.path}>
                      <Link
                        href={item.path}
                        onClick={() => setSidebarOpen(false)}
                        className={`group relative flex items-center gap-2.5 rounded-lg px-4 py-2.5 font-medium duration-300 ease-in-out hover:bg-[#333a48] hover:text-white ${
                          isActive ? "bg-[#333a48] text-white" : "text-[#dee4ee]"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        {item.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </nav>
        </div>

        {/* Sidebar Footer / Logout */}
        <div className="p-4 border-t border-[#2e3a4f]/60">
          <button
            onClick={handleLogout}
            disabled={isPending}
            className="flex w-full items-center gap-2.5 rounded-lg px-4 py-2.5 font-medium text-[#dee4ee] hover:bg-[#333a48] hover:text-rose-455 transition-all duration-200 cursor-pointer"
          >
            <LogOut className="h-5 w-5 text-neutral-400 group-hover:text-rose-455 animate-fade-in" />
            Keluar Dasbor
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="relative flex flex-1 flex-col overflow-y-auto overflow-x-hidden">
        {/* Top Header */}
        <header className="sticky top-0 z-40 flex w-full bg-neutral-955/80 border-b border-neutral-900 backdrop-blur-md">
          <div className="flex flex-grow items-center justify-between px-4 py-4 md:px-6 2xl:px-11">
            {/* Hamburger Button for mobile */}
            <div className="flex items-center gap-2 xl:hidden">
              <button
                onClick={() => setSidebarOpen(true)}
                className="z-50 block rounded-md border border-neutral-800 bg-neutral-900 p-1.5 text-neutral-400 hover:text-white"
              >
                <Menu className="h-5 w-5" />
              </button>
            </div>

            {/* Logo name/brand showing on desktop top bar */}
            <div className="hidden sm:block">
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                Panel Kontrol Admin
              </span>
            </div>

            {/* Right side: User dropdown & info */}
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <span className="block text-sm font-semibold text-white">Administrator</span>
                <span className="block text-[10px] text-neutral-500 font-medium">rezakusuma1804@gmail.com</span>
              </div>

              <div className="h-9 w-9 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-primary font-bold">
                <User className="h-4.5 w-4.5" />
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic children content */}
        <div className="flex-1 overflow-y-auto no-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
}

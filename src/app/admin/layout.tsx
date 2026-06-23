"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";
import { toast } from "sonner";

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
      icon: "fa-solid fa-chart-simple",
    },
    {
      name: "Buat Form Baru",
      path: "/admin/forms/new",
      icon: "fa-solid fa-square-plus",
    },
    {
      name: "Setelan Global",
      path: "/admin/settings",
      icon: "fa-solid fa-gears",
    },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-[#f1f5f9] text-slate-800 font-sans">
      {/* Sidebar for Desktop & Mobile Toggle */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72.5 flex-col bg-[#1c2434] transition-all duration-300 xl:translate-x-0 xl:static ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between gap-2 px-6 py-6 border-b border-[#2e3a4f]/40">
          <Link href="/admin" className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-lg bg-primary/20 border border-primary/45 flex items-center justify-center text-primary">
              <i className="fa-solid fa-file-invoice-dollar text-lg"></i>
            </div>
            <span className="font-extrabold text-xl text-white tracking-tight">
              TailAdmin
            </span>
          </Link>

          <button
            onClick={() => setSidebarOpen(false)}
            className="block xl:hidden text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        {/* Sidebar Navigation */}
        <div className="no-scrollbar flex flex-col overflow-y-auto flex-1 py-6">
          <nav className="px-4 space-y-6">
            <div>
              <h3 className="mb-4 ml-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                Menu Utama
              </h3>

              <ul className="flex flex-col gap-1.5">
                {menuItems.map((item) => {
                  const isActive = pathname === item.path;
                  return (
                    <li key={item.path}>
                      <Link
                        href={item.path}
                        onClick={() => setSidebarOpen(false)}
                        className={`group relative flex items-center gap-3 rounded-lg px-4 py-3 font-medium duration-200 ease-in-out hover:bg-[#333a48] hover:text-white ${
                          isActive ? "bg-[#333a48] text-white" : "text-[#dee4ee]"
                        }`}
                      >
                        <i className={`${item.icon} text-lg shrink-0`}></i>
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
        <div className="p-4 border-t border-[#2e3a4f]/40">
          <button
            onClick={handleLogout}
            disabled={isPending}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 font-medium text-[#dee4ee] hover:bg-[#333a48] hover:text-rose-450 transition-all duration-200 cursor-pointer"
          >
            <i className="fa-solid fa-right-from-bracket text-lg text-slate-400 group-hover:text-rose-450"></i>
            Keluar Dasbor
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="relative flex flex-1 flex-col overflow-y-auto overflow-x-hidden bg-[#f1f5f9]">
        {/* Top Header */}
        <header className="sticky top-0 z-40 flex w-full bg-white border-b border-slate-200/80 backdrop-blur-md shadow-sm">
          <div className="flex flex-grow items-center justify-between px-4 py-4 md:px-6 2xl:px-11">
            {/* Hamburger Button for mobile */}
            <div className="flex items-center gap-2 xl:hidden">
              <button
                onClick={() => setSidebarOpen(true)}
                className="z-50 block rounded-md border border-slate-200 bg-slate-50 p-2 text-slate-650 hover:text-primary transition-colors cursor-pointer"
              >
                <i className="fa-solid fa-bars text-lg"></i>
              </button>
            </div>

            {/* Logo/Brand Label */}
            <div className="hidden sm:block">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Panel Kontrol Admin
              </span>
            </div>

            {/* Right side: User Profile dropdown & info */}
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <span className="block text-sm font-bold text-slate-800">Administrator</span>
                <span className="block text-[10px] text-slate-400 font-semibold">rezakusuma1804@gmail.com</span>
              </div>

              <div className="h-9 w-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-bold">
                <i className="fa-regular fa-user text-sm"></i>
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

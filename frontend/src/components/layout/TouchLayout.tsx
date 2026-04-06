"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  PackageSearch,
  Scissors,
  ClipboardList,
  LogOut,
  UserCircle,
  PackageCheck
} from "lucide-react";

interface TouchLayoutProps {
  children: React.ReactNode;
  pageTitle: string;
}

// Monoblokda ishlatiladigan sodda va yirik Icon menyuli navigatsiya
const NAVIGATION = [
  { href: "/touch/products", icon: PackageSearch, label: "Modellar" },
  { href: "/touch/cut", icon: Scissors, label: "Bichuv" },
  { href: "/touch/pack", icon: PackageCheck, label: "Upakovka" },
  { href: "/touch/logs", icon: ClipboardList, label: "Ish jurnali" },
];

export default function TouchLayout({ children, pageTitle }: TouchLayoutProps) {
  const pathname = usePathname();
  
  // Vaqtinchalik statik foydalanuvchi ma'lumoti
  const currentUser = "Sardor Alimov (Menejer)";

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden font-sans select-none">
      
      {/* ── YIRIK SIDEBAR (Touch-optimized 100px) ── */}
      <aside className="w-[100px] shrink-0 bg-white border-r border-slate-200 flex flex-col justify-between items-center py-6 shadow-sm z-10">
        <div className="flex flex-col items-center w-full gap-8">
          {/* Logo/Brand Icon */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-md">
            <span className="text-white font-black text-2xl">ST</span>
          </div>

          {/* Menyu Iconlari */}
          <nav className="flex flex-col items-center gap-6 w-full px-3">
            {NAVIGATION.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    flex flex-col items-center justify-center w-[74px] h-[74px] rounded-2xl transition-all duration-200
                    active:scale-90 active:bg-indigo-100 touch-manipulation
                    ${
                      isActive
                        ? "bg-indigo-50 text-indigo-600 shadow-[inset_0px_0px_0px_2px_rgba(99,102,241,0.2)]"
                        : "bg-white text-slate-400 hover:bg-slate-100 hover:text-slate-600 border border-slate-100 shadow-sm"
                    }
                  `}
                >
                  <Icon size={32} strokeWidth={isActive ? 2.5 : 2} className="mb-1" />
                  <span className="text-[10px] font-bold tracking-tight uppercase">
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* LOGOUT Tugmasi */}
        <div className="w-full px-3">
          <button
            className="flex flex-col items-center justify-center w-[74px] h-[74px] rounded-2xl bg-red-50 text-red-500 border border-red-100 shadow-sm transition-all duration-200 active:scale-90 active:bg-red-200 hover:bg-red-100 touch-manipulation"
          >
            <LogOut size={32} strokeWidth={2.5} className="mb-1" />
            <span className="text-[10px] font-bold tracking-tight uppercase">Chiqish</span>
          </button>
        </div>
      </aside>

      {/* ── ASOSIY QISM ── */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        
        {/* Yirik Header */}
        <header className="h-[90px] shrink-0 bg-white border-b border-slate-200 flex flex-row justify-between items-center px-8 shadow-sm z-0">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-800">
              {pageTitle}
            </h1>
          </div>

          <div className="flex items-center gap-4 bg-slate-50 px-5 py-3 rounded-2xl border border-slate-100">
            <div className="flex flex-col items-end">
              <span className="text-[13px] font-bold text-slate-400 uppercase tracking-wider">
                Smena Menejeri
              </span>
              <span className="text-lg font-bold text-slate-800">
                {currentUser}
              </span>
            </div>
            <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 shrink-0 border-2 border-white shadow-sm">
              <UserCircle size={28} />
            </div>
          </div>
        </header>

        {/* Tarkib sahifasi */}
        <div className="flex-1 overflow-auto p-8 gap-6 flex flex-col">
          {children}
        </div>
      </main>

    </div>
  );
}

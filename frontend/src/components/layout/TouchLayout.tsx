"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { authApi } from "@/lib/api";
import {
  PenLine,
  Scissors,
  PackageCheck,
  Banknote,
  LogOut,
  UserCircle,
} from "lucide-react";

interface TouchLayoutProps {
  children: React.ReactNode;
  pageTitle: string;
}

function getCookie(name: string) {
  if (typeof document === "undefined") return "";
  const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : "";
}

const ALL_NAV = [
  { href: "/touch/work",    icon: PenLine,    label: "Ish",      roles: ["MANAGER"] },
  { href: "/touch/cut",     icon: Scissors,   label: "Bichuv",   roles: ["MANAGER","CUTTER"] },
  { href: "/touch/pack",    icon: PackageCheck,label: "Upakovka", roles: ["MANAGER","PACKER"] },
  { href: "/touch/advance", icon: Banknote,   label: "Avans",    roles: ["MANAGER"] },
];

export default function TouchLayout({ children, pageTitle }: TouchLayoutProps) {
  const pathname = usePathname();
  const router   = useRouter();
  const [name, setName]   = useState("Xodim");
  const [role, setRole]   = useState("");

  useEffect(() => {
    setName(getCookie("touchName") || getCookie("userId") ? "Xodim" : "Xodim");
    const n = getCookie("touchName");
    if (n) setName(n);
    setRole(getCookie("userRole").toUpperCase());
  }, []);

  const nav = ALL_NAV.filter(item =>
    !role || item.roles.includes(role)
  );

  const handleLogout = async () => {
    await authApi.logout().catch(() => {});
    ["userRole","userId","userPerms","touchName"].forEach(c => {
      document.cookie = `${c}=; path=/; max-age=0`;
    });
    router.push("/touch/login");
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden font-sans select-none">

      {/* ── SIDEBAR ── */}
      <aside className="w-[100px] shrink-0 bg-white border-r border-slate-200 flex flex-col justify-between items-center py-6 shadow-sm z-10">
        <div className="flex flex-col items-center w-full gap-6">
          {/* Logo */}
          <Link href={role === "MANAGER" ? "/touch/menu" : "#"}>
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-md">
              <span className="text-white font-black text-2xl">ST</span>
            </div>
          </Link>

          {/* Nav items */}
          <nav className="flex flex-col items-center gap-4 w-full px-3">
            {nav.map(item => {
              const Icon = item.icon;
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    flex flex-col items-center justify-center w-[74px] h-[74px] rounded-2xl
                    transition-all duration-200 active:scale-90 touch-manipulation
                    ${active
                      ? "bg-indigo-50 text-indigo-600 shadow-[inset_0px_0px_0px_2px_rgba(99,102,241,0.2)]"
                      : "bg-white text-slate-400 hover:bg-slate-100 hover:text-slate-600 border border-slate-100 shadow-sm"}
                  `}
                >
                  <Icon size={28} strokeWidth={active ? 2.5 : 2} className="mb-1" />
                  <span className="text-[10px] font-bold tracking-tight uppercase">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Logout */}
        <div className="w-full px-3">
          <button
            onClick={handleLogout}
            className="flex flex-col items-center justify-center w-[74px] h-[74px] rounded-2xl bg-red-50 text-red-500 border border-red-100 shadow-sm transition-all active:scale-90 active:bg-red-200 hover:bg-red-100 touch-manipulation"
          >
            <LogOut size={28} strokeWidth={2.5} className="mb-1" />
            <span className="text-[10px] font-bold tracking-tight uppercase">Chiqish</span>
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <header className="h-[80px] shrink-0 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm">
          <h1 className="text-2xl font-black tracking-tight text-slate-800">{pageTitle}</h1>
          <div className="flex items-center gap-3 bg-slate-50 px-4 py-2.5 rounded-2xl border border-slate-100">
            <div className="flex flex-col items-end">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Xodim</span>
              <span className="text-base font-bold text-slate-800 leading-tight">{name}</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center border-2 border-white shadow-sm">
              <UserCircle size={24} className="text-slate-500" />
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6 flex flex-col">
          {children}
        </div>
      </main>
    </div>
  );
}

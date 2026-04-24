"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { workLogsApi, authApi } from "@/lib/api";
import {
  PenLine, Scissors, Package, Banknote,
  Users, ListChecks, TrendingUp, LogOut,
} from "lucide-react";

const TILES = [
  {
    href: "/touch/work",
    icon: PenLine,
    label: "Ish kiritish",
    desc: "Ishchi ishi natijalarini qo'shish",
    color: "bg-indigo-500",
    glow: "shadow-indigo-500/30",
  },
  {
    href: "/touch/cut",
    icon: Scissors,
    label: "Bichuv",
    desc: "Matoni kesish va qayd etish",
    color: "bg-sky-500",
    glow: "shadow-sky-500/30",
  },
  {
    href: "/touch/pack",
    icon: Package,
    label: "Upakovka",
    desc: "Tayyor mahsulotni qadoqlash",
    color: "bg-violet-500",
    glow: "shadow-violet-500/30",
  },
  {
    href: "/touch/advance",
    icon: Banknote,
    label: "Avans berish",
    desc: "Ishchiga bo'nak pulini rasmiylashtirish",
    color: "bg-emerald-500",
    glow: "shadow-emerald-500/30",
  },
];

function getCookie(name: string) {
  if (typeof document === "undefined") return "";
  const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : "";
}

export default function TouchMenuPage() {
  const router = useRouter();
  const [stats, setStats] = useState<{ today_total: number; active_workers_today: number } | null>(null);
  const [name, setName] = useState("Menejer");

  useEffect(() => {
    setName(getCookie("touchName") || "Menejer");
    workLogsApi.tvDashboard()
      .then(d => setStats(d.stats))
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    await authApi.logout().catch(() => {});
    ["userRole","userId","userPerms","touchName"].forEach(c => {
      document.cookie = `${c}=; path=/; max-age=0`;
    });
    router.push("/touch/login");
  };

  const today = new Date().toLocaleDateString("uz-UZ", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col select-none">

      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-8 py-5 flex items-center justify-between shrink-0">
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-0.5">Smena Menejeri</p>
          <h1 className="text-2xl font-black text-white">{name}</h1>
          <p className="text-sm text-slate-400 mt-0.5">{today}</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 px-5 py-3 rounded-xl font-bold transition-all active:scale-95 touch-manipulation"
        >
          <LogOut size={20} /> Chiqish
        </button>
      </header>

      <div className="flex-1 p-8 flex flex-col gap-8">

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: Users,      label: "Faol ishchilar",  value: stats?.active_workers_today ?? "—" },
            { icon: ListChecks, label: "Bugungi ishlar",  value: stats?.today_total ? `${Number(stats.today_total).toLocaleString()} UZS` : "—" },
            { icon: TrendingUp, label: "Smena holati",    value: "Faol" },
          ].map(s => (
            <div key={s.label} className="bg-slate-800 rounded-2xl border border-slate-700 px-6 py-5 flex items-center gap-4">
              <s.icon size={28} className="text-indigo-400 shrink-0" />
              <div>
                <p className="text-xl font-black text-white">{s.value}</p>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* 2×2 tile grid */}
        <div className="grid grid-cols-2 gap-5 flex-1">
          {TILES.map(tile => (
            <Link
              key={tile.href}
              href={tile.href}
              className={`
                flex flex-col items-start justify-end p-8 rounded-3xl
                bg-slate-800 border border-slate-700
                hover:border-slate-500 transition-all duration-200
                active:scale-[0.97] touch-manipulation
                shadow-xl ${tile.glow}
                group
              `}
            >
              <div className={`w-16 h-16 rounded-2xl ${tile.color} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform`}>
                <tile.icon size={32} className="text-white" />
              </div>
              <h2 className="text-2xl font-black text-white mb-1">{tile.label}</h2>
              <p className="text-sm text-slate-400 font-medium">{tile.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

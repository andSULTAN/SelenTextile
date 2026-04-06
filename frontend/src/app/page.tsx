"use client";

import CRMLayout from "@/components/layout/CRMLayout";
import {
  Users,
  TrendingUp,
  Package,
  Scissors,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

/* ── Stat card data ── */
const stats = [
  {
    label: "Jami ishchilar",
    value: "142",
    change: "+12",
    trend: "up" as const,
    icon: Users,
    color: "indigo",
  },
  {
    label: "Bugungi ishlar",
    value: "1,284",
    change: "+8.2%",
    trend: "up" as const,
    icon: TrendingUp,
    color: "emerald",
  },
  {
    label: "Skladda mahsulot",
    value: "3,650",
    change: "-2.1%",
    trend: "down" as const,
    icon: Package,
    color: "amber",
  },
  {
    label: "Faol modellar",
    value: "28",
    change: "+3",
    trend: "up" as const,
    icon: Scissors,
    color: "violet",
  },
];

const colorMap: Record<string, { bg: string; iconBg: string; text: string }> = {
  indigo: { bg: "bg-indigo-50", iconBg: "bg-indigo-500", text: "text-indigo-600" },
  emerald: { bg: "bg-emerald-50", iconBg: "bg-emerald-500", text: "text-emerald-600" },
  amber: { bg: "bg-amber-50", iconBg: "bg-amber-500", text: "text-amber-600" },
  violet: { bg: "bg-violet-50", iconBg: "bg-violet-500", text: "text-violet-600" },
};

/* ── Recent activity data ── */
const recentWork = [
  { worker: "Alisher Karimov", code: "W-001", type: "Tikish", model: "FK-101", qty: 45, sum: "225,000", time: "14:32" },
  { worker: "Nilufar Azimova", code: "W-015", type: "Dazmollash", model: "SH-200", qty: 80, sum: "160,000", time: "14:20" },
  { worker: "Bobur Toshmatov", code: "W-023", type: "Qadoqlash", model: "FK-101", qty: 120, sum: "120,000", time: "13:55" },
  { worker: "Malika Rahimova", code: "W-008", type: "Tikish", model: "KR-305", qty: 32, sum: "192,000", time: "13:40" },
  { worker: "Jasur Normatov", code: "W-042", type: "Bichuv", model: "FK-101", qty: 200, sum: "400,000", time: "13:15" },
];

export default function DashboardPage() {
  return (
    <CRMLayout pageTitle="Dashboard">
      {/* ── Stats Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const colors = colorMap[stat.color];
          return (
            <div
              key={stat.label}
              className="bg-white rounded-2xl p-5 border border-slate-100 hover:shadow-md hover:shadow-slate-100/80 transition-all duration-300 group cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[12px] font-medium text-slate-400 uppercase tracking-wide">
                    {stat.label}
                  </p>
                  <p className="text-2xl font-bold text-slate-800 mt-1.5">
                    {stat.value}
                  </p>
                </div>
                <div className={`w-10 h-10 rounded-xl ${colors.iconBg} flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                  <Icon size={20} className="text-white" />
                </div>
              </div>
              <div className="flex items-center gap-1.5 mt-3">
                {stat.trend === "up" ? (
                  <ArrowUpRight size={14} className="text-emerald-500" />
                ) : (
                  <ArrowDownRight size={14} className="text-red-400" />
                )}
                <span
                  className={`text-xs font-semibold ${
                    stat.trend === "up" ? "text-emerald-500" : "text-red-400"
                  }`}
                >
                  {stat.change}
                </span>
                <span className="text-xs text-slate-400">o&apos;tgan haftaga nisbatan</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Main Content Grid ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* ── Recent Activity Table ── */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-100">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">
                So&apos;nggi ishlar
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Bugungi kiritilgan ishlar
              </p>
            </div>
            <button className="text-xs font-medium text-indigo-500 hover:text-indigo-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-indigo-50">
              Barchasini ko&apos;rish
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-50">
                  <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">
                    Ishchi
                  </th>
                  <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 py-3">
                    Ish turi
                  </th>
                  <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 py-3">
                    Model
                  </th>
                  <th className="text-right text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 py-3">
                    Soni
                  </th>
                  <th className="text-right text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">
                    Summa
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentWork.map((row, i) => (
                  <tr
                    key={i}
                    className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-[11px] font-bold text-slate-500">
                          {row.worker.split(" ").map(n => n[0]).join("")}
                        </div>
                        <div>
                          <p className="text-[13px] font-medium text-slate-700">
                            {row.worker}
                          </p>
                          <p className="text-[10px] text-slate-400">{row.code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3.5">
                      <span className="text-[13px] text-slate-600">{row.type}</span>
                    </td>
                    <td className="px-3 py-3.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-[11px] font-medium text-slate-600">
                        {row.model}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-right">
                      <span className="text-[13px] font-medium text-slate-700">{row.qty}</span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="text-[13px] font-semibold text-slate-800">
                        {row.sum}
                      </span>
                      <span className="text-[11px] text-slate-400 ml-0.5">so&apos;m</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Right Column: Quick Info ── */}
        <div className="space-y-4">
          {/* Production Status */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5">
            <h3 className="text-sm font-semibold text-slate-800 mb-4">
              Ishlab chiqarish holati
            </h3>
            <div className="space-y-4">
              {[
                { label: "Sklad → Bichuv", value: 78, color: "bg-indigo-500" },
                { label: "Bichuv → Tikuv", value: 62, color: "bg-violet-500" },
                { label: "Tikuv → Upakovka", value: 45, color: "bg-emerald-500" },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[12px] font-medium text-slate-600">
                      {item.label}
                    </span>
                    <span className="text-[12px] font-semibold text-slate-800">
                      {item.value}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.color} rounded-full transition-all duration-700`}
                      style={{ width: `${item.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Workers */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5">
            <h3 className="text-sm font-semibold text-slate-800 mb-4">
              Top ishchilar (bugun)
            </h3>
            <div className="space-y-3">
              {[
                { name: "Jasur Normatov", amount: "400,000", rank: 1 },
                { name: "Alisher Karimov", amount: "225,000", rank: 2 },
                { name: "Malika Rahimova", amount: "192,000", rank: 3 },
              ].map((worker) => (
                <div
                  key={worker.name}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold ${
                      worker.rank === 1
                        ? "bg-amber-100 text-amber-600"
                        : worker.rank === 2
                        ? "bg-slate-200 text-slate-600"
                        : "bg-orange-100 text-orange-600"
                    }`}
                  >
                    #{worker.rank}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-slate-700 truncate">
                      {worker.name}
                    </p>
                  </div>
                  <span className="text-[12px] font-semibold text-slate-800">
                    {worker.amount}
                    <span className="text-slate-400 font-normal ml-0.5 text-[10px]">
                      so&apos;m
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </CRMLayout>
  );
}

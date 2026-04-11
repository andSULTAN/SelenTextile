"use client";

import { useEffect, useState } from "react";
import CRMLayout from "@/components/layout/CRMLayout";
import { inventoryApi } from "@/lib/api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from "recharts";

export default function WasteAnalysisPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await inventoryApi.supplierAnalytics();
        setData(res);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading || !data) {
    return (
      <CRMLayout>
        <div className="flex h-screen items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      </CRMLayout>
    );
  }

  // Get Top 5 worst suppliers overall (lowest efficiency)
  const allSuppliers = [...data.weavers, ...data.dyers]
    .sort((a, b) => a.efficiency - b.efficiency)
    .slice(0, 5)
    .map(s => ({
      name: s.supplier,
      type: s.type,
      efficiency: s.efficiency,
      waste_kg: s.waste_kg,
      total_kg: s.total_kg
    }));

  return (
    <CRMLayout>
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800">Ta'minotchilar Antireytingi</h1>
          <p className="text-sm text-slate-500">
            Sifat bo'yicha eng past natija ko'rsatayotgan Top-5 yetkazib beruvchilar tahlili.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h2 className="text-lg font-bold mb-4 text-slate-700">Top-5 Eng ko'p brak (Foiz)</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={allSuppliers} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} unit="%" />
                  <Tooltip 
                    formatter={(val: number) => [`${val}%`, 'Sifat (Efficiency)']}
                  />
                  <Bar dataKey="efficiency" radius={[4, 4, 0, 0]}>
                    {allSuppliers.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.efficiency < 95 ? "#ef4444" : "#4ade80"} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex items-center justify-center gap-4 text-sm">
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500"></span> Xavfli ( {"< 95%"} )</div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-400"></span> Me'yorda ( {">= 95%"} )</div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-700">Holat Jadvali</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Yetkazib beruvchi</th>
                    <th className="px-4 py-3 font-medium">Turi</th>
                    <th className="px-4 py-3 font-medium text-right">Jami Kirim</th>
                    <th className="px-4 py-3 font-medium text-right">Zavod Braki</th>
                    <th className="px-4 py-3 font-medium text-right">Sifat (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allSuppliers.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-semibold text-slate-800">{item.name}</td>
                      <td className="px-4 py-3 text-slate-500">{item.type}</td>
                      <td className="px-4 py-3 text-right font-medium">{item.total_kg} kg</td>
                      <td className="px-4 py-3 text-right text-red-500 font-medium">{item.waste_kg} kg</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`px-2 py-1 rounded-md font-bold text-xs ${item.efficiency < 95 ? 'bg-red-100 text-red-700 shadow-sm' : 'bg-emerald-100 text-emerald-700'}`}>
                          {item.efficiency}%
                        </span>
                      </td>
                    </tr>
                  ))}
                  {allSuppliers.length === 0 && (
                     <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-400">Ma'lumot topilmadi</td>
                     </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </CRMLayout>
  );
}

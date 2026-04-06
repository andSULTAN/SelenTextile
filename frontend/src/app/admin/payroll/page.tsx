"use client";

import { useEffect, useState } from "react";
import CRMLayout from "@/components/layout/CRMLayout";
import { accountsApi } from "@/lib/api";
import { FileDown, Search, CheckCircle, ShieldAlert, Loader2, Calendar } from "lucide-react";

export default function PayrollPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  const [payingId, setPayingId] = useState<number | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchPayroll = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await accountsApi.payrollList(month, year);
      setData(res);
    } catch {
      setFetchError("Ma'lumotlarni yuklashda xatolik yuz berdi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayroll();
  }, [month, year]);

  const handlePay = async (workerId: number) => {
    if (!confirm("Haqiqatdan ham bu xodimni yopmoqchimisiz?")) return;
    setPayingId(workerId);
    try {
      await accountsApi.paySalary({ worker_id: workerId, month, year });
      fetchPayroll(); // Refresh list to show 'Paid'
    } catch (error) {
      alert("Xatolik yuz berdi!");
    } finally {
      setPayingId(null);
    }
  };

  const handleExport = () => {
    window.open(accountsApi.exportPayrollUrl(month, year), "_blank");
  };

  return (
    <CRMLayout pageTitle="Oylik Hisob-Kitob (Payroll)">
      
      {/* TOOLBAR */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex-wrap gap-4">
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-4 py-2 rounded-lg">
            <Calendar size={18} className="text-slate-400" />
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="bg-transparent border-none text-sm font-bold text-slate-700 outline-none cursor-pointer">
              {Array.from({length: 12}).map((_, i) => (
                <option key={i+1} value={i+1}>{i+1}-oy</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-4 py-2 rounded-lg">
            <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="bg-transparent border-none text-sm font-bold text-slate-700 outline-none cursor-pointer">
              <option value={2026}>2026</option>
              <option value={2027}>2027</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={handleExport} className="flex items-center gap-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-5 py-2 rounded-lg font-bold transition-colors">
            <FileDown size={18} /> Excel Yuklab olish
          </button>
        </div>

      </div>

      {/* JADVAL */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="overflow-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Kod</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">F.I.SH.</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Jami Ishlagan (UZS)</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Olingan Avans (UZS)</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Sof Oylik (Net)</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Holat</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Harakat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-slate-400">
                    <Loader2 className="animate-spin inline-block mr-2" /> Yuklanmoqda...
                  </td>
                </tr>
              ) : fetchError ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-red-500 font-medium">{fetchError}</td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-slate-400 font-medium">Bu oy uchun ma'lumot topilmadi</td>
                </tr>
              ) : (
                data.map((row) => (
                  <tr key={row.worker_id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm bg-slate-100 text-slate-600 px-2 py-1 rounded">{row.worker_code}</span>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-800">{row.worker_name}</td>
                    
                    <td className="px-6 py-4 text-right font-medium text-slate-600">
                      {row.total_work.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-red-500">
                      - {row.total_advance.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right text-lg font-black text-indigo-600">
                      {row.net_salary.toLocaleString()}
                    </td>
                    
                    <td className="px-6 py-4 text-center">
                       {row.status === "Open" ? (
                         <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-600 text-xs font-bold px-3 py-1 rounded-full border border-amber-200">
                           <ShieldAlert size={14} /> To'lanmagan
                         </span>
                       ) : (
                         <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 text-xs font-bold px-3 py-1 rounded-full border border-emerald-200">
                           <CheckCircle size={14} /> Yopilgan
                         </span>
                       )}
                    </td>

                    <td className="px-6 py-4 text-center">
                       {row.status === "Open" ? (
                         <button
                           disabled={payingId === row.worker_id}
                           onClick={() => handlePay(row.worker_id)}
                           className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center gap-2 m-auto"
                         >
                           {payingId === row.worker_id ? <Loader2 size={16} className="animate-spin" /> : null}
                           To'lov Qilish
                         </button>
                       ) : (
                         <span className="text-slate-400 font-bold text-sm">--</span>
                       )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
    </CRMLayout>
  );
}

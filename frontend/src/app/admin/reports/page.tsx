"use client";

import { useEffect, useState } from "react";
import CRMLayout from "@/components/layout/CRMLayout";
import { accountsApi, reportsApi, type Worker } from "@/lib/api";
import { FileDown, FileText, Download, TrendingUp, AlertTriangle } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function ReportsPage() {
  const [stats, setStats] = useState<any[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>("");

  useEffect(() => {
    // Grafik ma'lumotlarini olish
    reportsApi.stats().then((res) => {
      setStats(res);
    });
    // Ishchilar ruyxatini olish
    accountsApi.workersList().then((res) => {
      setWorkers(res.results);
    });
  }, []);

  const handleGlobalExcel = () => {
    window.open(reportsApi.excelUrl(), "_blank");
  };

  const handlePdfSlip = () => {
    if (!selectedWorkerId) return alert("Ishchini tanlang!");
    window.open(reportsApi.pdfSlipUrl(Number(selectedWorkerId)), "_blank");
  };

  return (
    <CRMLayout pageTitle="Analitika va Hisobotlar">
      
      {/* TOOLBAR */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6">
        <div>
           <h2 className="text-xl font-bold text-slate-800">Ma'lumotlar Markazi</h2>
           <p className="text-sm text-slate-400 font-medium">Grafiklar va Export paneli</p>
        </div>

        <button onClick={handleGlobalExcel} className="flex items-center gap-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-5 py-2 rounded-lg font-bold transition-colors">
          <FileDown size={18} /> Umumiy Excel (Barcha xodimlar)
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
         {/* 1. CHART AREA (2 columns) */}
         <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col min-h-[350px]">
            <div className="flex items-center justify-between mb-6">
               <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><TrendingUp size={20} className="text-indigo-500" /> 7 Kunlik Ishlab Chiqarish Hajmi</h3>
            </div>
            <div className="flex-1 w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={stats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                    <Tooltip 
                       contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                       itemStyle={{ fontWeight: 'bold' }}
                    />
                    <Area type="monotone" dataKey="volume" name="Jami Hajm" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorVolume)" />
                 </AreaChart>
              </ResponsiveContainer>
            </div>
         </div>

         {/* 2. PDF GENERATOR PANEL & DEFECT RATE */}
         <div className="flex flex-col gap-6">
            
            {/* Defect Widget */}
            <div className="bg-gradient-to-br from-red-500 to-rose-600 rounded-xl shadow-sm p-6 text-white min-h-[120px] flex gap-4 items-center relative overflow-hidden">
               <div className="absolute -right-4 -bottom-4 opacity-20"><AlertTriangle size={120} /></div>
               <div className="bg-white/20 p-4 rounded-full"><AlertTriangle size={36} /></div>
               <div>
                  <p className="text-rose-100 font-bold uppercase tracking-widest text-xs mb-1">Kecha qayd etilgan brak</p>
                  <h3 className="text-4xl font-black">{stats.length > 0 ? stats[stats.length - 2]?.defect_pct || 0 : 0}%</h3>
               </div>
            </div>

            {/* Slip Generator Widget */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex-1 flex flex-col justify-center">
               <div className="w-12 h-12 bg-emerald-100 text-emerald-600 flex justify-center items-center rounded-xl mb-4">
                 <FileText size={24} />
               </div>
               <h3 className="text-lg font-bold text-slate-800 mb-2">Oylik Hisob-Kitob Varaqasi</h3>
               <p className="text-sm text-slate-400 mb-6">Ishchiga qo'liga beriladigan oylik qoldiq cheki (PDF Slip).</p>

               <div className="flex flex-col gap-3">
                  <select 
                     value={selectedWorkerId} 
                     onChange={e => setSelectedWorkerId(e.target.value)}
                     className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm font-bold text-slate-700 outline-none"
                  >
                     <option value="">-- Ishchini tanlang --</option>
                     {workers.map(w => (
                        <option key={w.id} value={w.id}>{w.full_name} ({w.code})</option>
                     ))}
                  </select>

                  <button 
                     onClick={handlePdfSlip}
                     className="w-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2 py-3 rounded-lg font-bold shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
                  >
                     <Download size={18} /> PDF Yuklab olish
                  </button>
               </div>
            </div>

         </div>

      </div>

    </CRMLayout>
  );
}

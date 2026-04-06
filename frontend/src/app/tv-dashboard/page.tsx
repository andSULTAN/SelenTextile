"use client";

import { useEffect, useState } from "react";
import { workLogsApi } from "@/lib/api";
import { Trophy, Medal, MapPin, Users, TrendingUp, Clock, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type TVStats = {
  stats: {
    today_total: number;
    month_total: number;
    active_workers_today: number;
    defect_percentage: number;
  };
  top_today: { rank: number; id: number; name: string; photo: string | null; amount: number; items: number }[];
  top_month: { rank: number; id: number; name: string; photo: string | null; amount: number; items: number }[];
};

export default function TvDashboardPage() {
  const [data, setData] = useState<TVStats | null>(null);
  const [currentTime, setCurrentTime] = useState("");

  const fetchData = async () => {
    try {
      const result = await workLogsApi.tvDashboard();
      setData(result as TVStats);
    } catch (error) {
      console.error("TV Dashboard xatosi:", error);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" }));
    }, 1000);
    return () => { clearInterval(interval); clearInterval(timeInterval); };
  }, []);

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-20 h-20 border-8 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Premium Colors
  const getRankTheme = (rank: number) => {
    if (rank === 1) return { bg: "bg-gradient-to-r from-yellow-50 to-amber-100", border: "border-yellow-400", text: "text-amber-600", accent: "text-yellow-500", rankBadge: "bg-yellow-500 text-white" };
    if (rank === 2) return { bg: "bg-gradient-to-r from-slate-50 to-slate-200", border: "border-slate-300", text: "text-slate-700", accent: "text-slate-400", rankBadge: "bg-slate-400 text-white" };
    if (rank === 3) return { bg: "bg-gradient-to-r from-orange-50 to-orange-100", border: "border-orange-300", text: "text-orange-800", accent: "text-orange-500", rankBadge: "bg-orange-500 text-white" };
    return { bg: "bg-white", border: "border-slate-100", text: "text-slate-600", accent: "text-slate-300", rankBadge: "bg-slate-100 text-slate-400" };
  };

  const defectPct = data.stats.defect_percentage || 0;

  return (
    <div className="min-h-screen bg-slate-100/50 text-slate-800 overflow-hidden font-sans flex flex-col">
      {/* ── PREMIUM HEADER (1920px ga mos 120px balandlik) ── */}
      <header className="h-[120px] bg-white border-b border-slate-200 flex items-center justify-between px-10 shrink-0 shadow-sm relative z-10">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-700 flex items-center justify-center shadow-xl shadow-indigo-500/20">
            <span className="text-3xl font-black text-white">ST</span>
          </div>
          <div>
            <h1 className="text-5xl font-extrabold tracking-tight text-slate-800">Selen Textile</h1>
            <p className="text-xl text-indigo-500 font-bold tracking-[0.2em] uppercase mt-1">Real-time Ishlab Chiqarish Reytingi</p>
          </div>
        </div>

        <div className="flex items-center gap-10">
          
          {/* Active Workers */}
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-2 text-indigo-500 mb-1">
              <Users size={24} />
              <span className="uppercase text-lg font-bold tracking-wider">Aktiv Ishtirokchilar</span>
            </div>
            <span className="text-5xl font-black text-slate-800">{data.stats.active_workers_today} <span className="text-2xl text-slate-400">kishi</span></span>
          </div>

          <div className="w-1 h-20 bg-slate-100 rounded-full mx-2"></div>

          {/* Today Revenue */}
          <div className="flex flex-col items-end">
            <span className="text-emerald-500 uppercase text-lg font-bold tracking-wider mb-1">Bugungi Jami Chiqim</span>
            <span className="text-5xl font-black text-slate-800">
              {data.stats.today_total.toLocaleString()} <span className="text-2xl text-slate-400">so&apos;m</span>
            </span>
          </div>

          <div className="w-1 h-20 bg-slate-100 rounded-full mx-2"></div>

          {/* TimeWidget */}
          <div className="flex items-center gap-4 bg-indigo-50 px-8 py-5 rounded-[2rem] border border-indigo-100 shadow-inner">
            <Clock size={36} className="text-indigo-600 animate-pulse" />
            <span className="text-5xl font-black text-indigo-700 tracking-tight">{currentTime || "00:00"}</span>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT (1920x1080 Layout) ── */}
      <main className="flex-1 p-10 flex gap-10 overflow-hidden h-full">

        {/* CHAP USTUN: Bugungi TOP 10 (Framer Motion Cards) */}
        <section className="w-2/3 flex flex-col bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 overflow-hidden relative">
          <div className="py-8 px-10 bg-gradient-to-r from-indigo-50 to-white flex items-center justify-between border-b border-indigo-50 shrink-0">
            <div className="flex items-center gap-5">
               <div className="w-16 h-16 bg-indigo-500 rounded-full flex items-center justify-center">
                 <TrendingUp size={36} className="text-white" />
               </div>
               <div>
                  <h2 className="text-4xl font-black tracking-tight text-slate-800">Bugungi TOP-10 Qo&apos;li Guloimlar</h2>
                  <p className="text-lg text-slate-500 font-bold tracking-wide mt-1">Joriy kun natijalari (Jonli efirda)</p>
               </div>
            </div>
            <span className="bg-emerald-100 text-emerald-600 px-6 py-2 rounded-full text-lg font-black tracking-widest uppercase flex items-center gap-2">
              <span className="w-4 h-4 bg-emerald-500 rounded-full animate-ping"></span> Live
            </span>
          </div>
          
          {/* List using Framer Motion layout animations */}
          <div className="flex-1 p-8 grid grid-cols-2 gap-x-8 gap-y-4 overflow-hidden content-start">
            <AnimatePresence>
              {data.top_today.map((worker) => {
                const theme = getRankTheme(worker.rank);
                return (
                  <motion.div
                    layout
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    key={worker.id}
                    className={`flex items-center rounded-[2rem] p-5 shadow-sm border-2 ${theme.bg} ${theme.border} h-[130px]`}
                  >
                    {/* Rank Badge */}
                    <div className="w-24 shrink-0 flex flex-col items-center justify-center relative">
                      {worker.rank === 1 && <Trophy size={60} className={theme.accent} />}
                      {worker.rank === 2 && <Medal size={56} className={theme.accent} />}
                      {worker.rank === 3 && <Medal size={50} className={theme.accent} />}
                      {worker.rank > 3 && <span className={`text-4xl font-black ${theme.accent}`}>#{worker.rank}</span>}
                      
                      {worker.rank <= 3 && (
                        <div className={`absolute -bottom-2 px-3 py-0.5 rounded-full text-xs font-black uppercase shadow-md ${theme.rankBadge}`}>
                          #{worker.rank}
                        </div>
                      )}
                    </div>
                    
                    {/* Worker Details */}
                    <div className="flex-1 ml-4 border-l-2 border-black/5 pl-6 flex flex-col justify-center h-full">
                      <div className="flex items-center gap-3 mb-1">
                        {worker.photo && (
                          <img
                            src={worker.photo}
                            alt={worker.name}
                            className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm shrink-0"
                          />
                        )}
                        <h3 className={`text-3xl font-black truncate ${theme.text}`}>{worker.name}</h3>
                      </div>
                      <p className="text-slate-500 text-lg font-bold tracking-wide">
                        Bajarilgan: <span className="text-slate-700">{worker.items} dona</span>
                      </p>
                    </div>

                    {/* Amount */}
                    <div className="text-right ml-4 shrink-0 pr-4">
                      <div className={`text-4xl font-black tracking-tight ${theme.text}`}>
                        {worker.amount.toLocaleString()} 
                        <span className="text-xl font-bold ml-1 opacity-70">so&apos;m</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {data.top_today.length === 0 && (
              <div className="col-span-2 h-full flex items-center justify-center text-slate-400 text-3xl font-bold">
                Jarayon endi boshlandi... (Ma&apos;lumot kutilyapti)
              </div>
            )}
          </div>
        </section>

        {/* O'NG USTUN: OY Yulduzlar & Progress & Brak */}
        <div className="w-1/3 flex flex-col gap-10 overflow-hidden h-full">
           
           {/* BRAK FOIZI VA PROGRESS */}
           <section className="bg-white rounded-[2.5rem] shadow-xl p-10 relative overflow-hidden shrink-0">
             <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
               <AlertTriangle size={150} className="text-red-500" />
             </div>
             <h3 className="text-2xl font-bold uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-3">
               Sifat Nazorati (Brak)
             </h3>

             <div className="flex items-end gap-6 mb-6">
                <span className={`text-8xl font-black tracking-tighter ${defectPct > 5 ? 'text-red-500' : 'text-emerald-500'}`}>
                  {defectPct}%
                </span>
             </div>
             
             <div className="w-full bg-slate-100 h-6 rounded-full overflow-hidden mt-4 shadow-inner">
               <div className={`h-full rounded-full transition-all duration-1000 ${defectPct > 5 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(defectPct, 100)}%` }}></div>
             </div>
             <p className="text-xl text-slate-500 font-bold mt-4">Ushbu kundagi jami brak miqdori foizda ko'rsatilgan.</p>
           </section>

           {/* OYLIK KATTA REYTING */}
           <section className="flex-1 bg-gradient-to-br from-indigo-600 to-indigo-900 rounded-[2.5rem] shadow-xl p-10 flex flex-col relative overflow-hidden">
             
             <div className="flex items-center justify-between mb-8 relative z-10">
               <div>
                 <h3 className="text-4xl font-black text-white">Oyning Eng Zorlari</h3>
                 <p className="text-indigo-200 mt-2 font-bold text-lg uppercase tracking-widest">({new Date().toLocaleString('uz-UZ', { month: 'long' })})</p>
               </div>
               <span className="bg-indigo-500/30 border border-indigo-400/50 text-indigo-100 px-6 py-3 rounded-2xl text-2xl font-black">
                 🏆
               </span>
             </div>

             <div className="flex-1 space-y-4 overflow-y-auto pr-4 relative z-10 custom-scrollbar">
                <AnimatePresence>
                  {data.top_month.slice(0, 5).map((w, idx) => (
                    <motion.div 
                      layout
                      initial={{ x: 50, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: idx * 0.1 }}
                      key={w.id} 
                      className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-6 flex items-center"
                    >
                      <div className="w-14 items-center flex justify-center text-3xl font-black text-indigo-200 mr-4">
                        #{w.rank}
                      </div>
                      <div className="flex-1">
                        <h4 className="text-2xl font-black text-white truncate">{w.name}</h4>
                        <div className="flex items-center mt-2 gap-2">
                           <div className="flex-1 bg-black/20 h-3 rounded-full overflow-hidden">
                              <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${Math.max(10, 100 - (w.rank * 15))}%` }}></div>
                           </div>
                        </div>
                      </div>
                      <div className="text-right ml-6">
                        <span className="text-3xl font-black text-yellow-400 drop-shadow-md">
                          {(w.amount / 1000000).toFixed(1)} <span className="text-xl">M</span>
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
             </div>

             {/* Background glow elements */}
             <div className="absolute top-1/2 right-0 w-96 h-96 bg-purple-500/20 rounded-full blur-[100px] pointer-events-none transform -translate-y-1/2"></div>
           </section>

        </div>
      </main>

    </div>
  );
}

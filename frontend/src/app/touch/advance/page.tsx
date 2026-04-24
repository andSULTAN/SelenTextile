"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import TouchLayout from "@/components/layout/TouchLayout";
import { accountsApi, getManagerId, type Worker } from "@/lib/api";
import { User, CheckCircle2, Loader2, Delete, Banknote, History, Wallet } from "lucide-react";

export default function POSTouchAdvancePage() {
  const router = useRouter();

  // Double-guard: middleware + page level
  useEffect(() => {
    const match = document.cookie.match(/(?:^|;\s*)userRole=([^;]+)/);
    const role = match ? match[1] : '';
    if (role === 'ADMIN' || role === 'MANAGER') router.replace('/');
  }, [router]);

  // Input mode: "CODE" = Worker Code kutadi. "AMOUNT" = Summa kutadi.
  const [inputMode, setInputMode] = useState<"CODE" | "AMOUNT">("CODE");

  // Worker Logic
  const [workerDigits, setWorkerDigits] = useState("");
  const [worker, setWorker] = useState<Worker | null>(null);
  const [workerLoading, setWorkerLoading] = useState(false);

  // Amount Logic
  const [amountDigits, setAmountDigits] = useState("");

  // History & UI State
  const [advancesHistory, setAdvancesHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [toastMessage, setToastMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Historini tortish
  const fetchHistory = () => {
    accountsApi.advanceList().then((res) => {
      setAdvancesHistory(res.results.slice(0, 5)); // Oxirgi 5 ta
      setLoadingHistory(false);
    });
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // Worker lookup logic (Auto trigger when code length is valid)
  useEffect(() => {
    if (inputMode === "CODE" && workerDigits.length >= 1) {
      const code = `W-${workerDigits.padStart(3, "0")}`;
      setWorkerLoading(true);
      
      const timer = setTimeout(() => {
        accountsApi.lookup(code)
          .then((w) => {
            if (w.status === "active") {
              setWorker(w);
              setInputMode("AMOUNT"); // Muvaffaqiyatli topsa darhol Pul kiritishga otadi
            } else {
              setWorker(null);
            }
          })
          .catch(() => setWorker(null))
          .finally(() => setWorkerLoading(false));
      }, 300); // Debounce
      
      return () => clearTimeout(timer);
    } else if (inputMode === "CODE" && workerDigits.length === 0) {
      setWorker(null);
    }
  }, [workerDigits, inputMode]);

  // Numpad handler
  const handleNumpad = (val: string) => {
    if (inputMode === "CODE") {
      if (workerDigits.length < 3) setWorkerDigits(prev => prev + val);
    } else if (inputMode === "AMOUNT") {
      // Amount limitation (e.g. up to 9 digits)
      if (amountDigits.length < 9) setAmountDigits(prev => prev + val);
    }
  };

  const handleBackspace = () => {
    if (inputMode === "CODE") setWorkerDigits(prev => prev.slice(0, -1));
    else if (inputMode === "AMOUNT") {
      if (amountDigits.length === 0) {
        setInputMode("CODE");
      } else {
        setAmountDigits(prev => prev.slice(0, -1));
      }
    }
  };

  const resetFlow = () => {
    setWorkerDigits("");
    setWorker(null);
    setAmountDigits("");
    setInputMode("CODE");
  };

  const handleSubmit = async () => {
    if (!worker || !amountDigits || parseInt(amountDigits) <= 0) return;

    setSubmitting(true);
    try {
      await accountsApi.advanceCreate({
        worker: worker.id,
        amount: parseInt(amountDigits),
        manager: getManagerId(),
      });
      setToastMessage("AVANS MUVAFFAQIYATLI BERILDI");
      setTimeout(() => { setToastMessage(""); resetFlow(); }, 1500);
      fetchHistory(); // Ekranni yangilaymiz
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const renderToast = () => {
    if (!toastMessage) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-emerald-500 rounded-[2rem] p-12 flex flex-col items-center shadow-2xl shadow-emerald-500/50 transform animate-in zoom-in-95 duration-200">
          <CheckCircle2 size={120} className="text-white mb-6" />
          <h2 className="text-5xl font-black text-white text-center uppercase tracking-wider">{toastMessage}</h2>
        </div>
      </div>
    );
  };

  return (
    <TouchLayout pageTitle="Avans To'lovlari">
      {renderToast()}
      
      <div className="flex gap-8 h-full bg-slate-50 relative overflow-hidden">
        
        {/* 1-Qism (CHAP): ISHCHI VA NUMPAD (POS KASSA) */}
        <div className="flex-1 flex flex-col h-full gap-6">
          
          {/* RECEIPT / ISHCHI MA'LUMOTI */}
          <div className={`bg-white rounded-[2.5rem] border-2 shadow-sm p-8 flex items-center gap-8 shrink-0 transition-colors ${worker ? "border-indigo-400" : "border-slate-200"}`}>
             <div className="w-24 h-24 rounded-full bg-slate-100 border-4 border-white shadow-md overflow-hidden flex items-center justify-center shrink-0">
               {workerLoading ? <Loader2 size={36} className="animate-spin text-indigo-300" /> : <User size={48} className={worker ? "text-indigo-500" : "text-slate-300"} />}
             </div>
             <div className="flex-1">
               <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Xodim</p>
               {worker ? (
                 <>
                   <h2 className="text-4xl font-black text-slate-800 leading-tight">{worker.full_name}</h2>
                   <div className="flex items-center gap-2 mt-2 text-indigo-500 font-bold text-xl uppercase">
                     <Wallet size={20} /> <span className="tracking-widest">{worker.code}</span>
                   </div>
                 </>
               ) : (
                 <h2 className="text-3xl font-black text-slate-300">Raqam kiriting...</h2>
               )}
             </div>
          </div>

          <div className="flex gap-6 flex-1 h-full min-h-0">
             {/* CHAP YON (Numpad) */}
             <div className="w-[45%] bg-slate-800 rounded-[2.5rem] p-6 flex flex-col gap-4 text-white shadow-xl">
                <div className="bg-slate-950/60 rounded-[2rem] p-6 text-right border border-white/10 relative overflow-hidden mb-2">
                  <span className="absolute left-6 top-6 text-indigo-300 font-bold uppercase tracking-widest flex items-center gap-2">
                    {inputMode === "CODE" ? <User size={18}/> : <Banknote size={18}/>}
                    {inputMode === "CODE" ? "ISHCHI KODI" : "SUMMA"}
                  </span>
                  <span className="text-6xl font-black tracking-widest mt-8 block">
                    {inputMode === "CODE" ? `W-${workerDigits.padEnd(3, '_')}` : (Number(amountDigits || 0).toLocaleString())}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-4 flex-1">
                  {[1,2,3,4,5,6,7,8,9].map(num => (
                    <button 
                      key={num} 
                      onClick={() => handleNumpad(num.toString())}
                      className="bg-slate-700/50 hover:bg-slate-700 rounded-3xl text-5xl font-black active:scale-95 transition-transform"
                    >
                      {num}
                    </button>
                  ))}
                  <button onClick={() => handleNumpad("000")} className="bg-emerald-500/20 text-emerald-400 rounded-3xl text-3xl font-black active:scale-95 transition-transform">000</button>
                  <button onClick={() => handleNumpad("0")} className="bg-slate-700/50 hover:bg-slate-700 rounded-3xl text-5xl font-black active:scale-95 transition-transform">0</button>
                  <button onClick={handleBackspace} className="bg-red-500/20 text-red-500 rounded-3xl flex items-center justify-center active:scale-95 transition-transform"><Delete size={40} /></button>
                </div>
             </div>

             {/* O'NG YON (Kalkulyatsiya va Tasdiqlash) */}
             <div className="flex-1 bg-white rounded-[2.5rem] border border-slate-200 p-8 flex flex-col shadow-sm">
                <h3 className="text-xl font-bold uppercase tracking-widest text-slate-400 mb-6">Berilayotgan Summa</h3>

                <div className="flex-1 flex flex-col items-center justify-center bg-emerald-50 rounded-3xl border-2 border-emerald-100 p-6 mb-6">
                   <div className="text-2xl font-bold text-emerald-600 uppercase mb-4 tracking-widest">To'lov qiymati</div>
                   <div className="text-6xl font-black text-emerald-600 flex items-end gap-2 text-center">
                     {Number(amountDigits || 0).toLocaleString()} <span className="text-2xl mb-1 opacity-70">UZS</span>
                   </div>
                </div>

                <button
                  disabled={!worker || !amountDigits || parseInt(amountDigits) <= 0 || submitting}
                  onClick={handleSubmit}
                  className="w-full h-[120px] rounded-[2rem] bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-200 disabled:text-slate-400 text-white text-4xl font-black tracking-widest uppercase shadow-xl shadow-emerald-500/40 transition-all active:scale-95 flex items-center justify-center gap-4"
                >
                  {submitting ? <Loader2 className="animate-spin" size={40} /> : <Banknote size={40} />}
                  AVANS BERISH
                </button>
             </div>
          </div>
        </div>

        {/* 2-Qism (O'NG): OXIRGI AVANSLAR TARIXI */}
        <div className="w-[30%] shrink-0 bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="p-8 bg-indigo-50 border-b border-indigo-100 flex items-center gap-4 shrink-0">
            <div className="w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center text-white"><History size={24} /></div>
            <h3 className="text-xl font-black text-indigo-900 tracking-widest uppercase">Oxirgi Tarix</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
             {loadingHistory && <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-slate-300" size={40} /></div>}
             {!loadingHistory && advancesHistory.map((item) => (
               <div key={item.id} className="p-5 rounded-3xl border border-slate-100 bg-slate-50 flex flex-col group hover:bg-white hover:border-slate-200 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-emerald-600 font-bold text-lg">{Number(item.amount).toLocaleString()} UZS</span>
                    <span className="text-xs font-bold text-slate-400 uppercase">{item.date}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User size={14} className="text-slate-400" />
                    <span className="text-slate-600 font-bold truncate">{item.worker_detail?.full_name}</span>
                  </div>
               </div>
             ))}
             {!loadingHistory && advancesHistory.length === 0 && (
               <div className="text-center text-slate-400 p-10 font-bold uppercase tracking-widest">Hali xech kim avans olmadi</div>
             )}
          </div>
        </div>

      </div>
    </TouchLayout>
  );
}

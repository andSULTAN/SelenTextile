"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import TouchLayout from "@/components/layout/TouchLayout";
import { inventoryApi, ApiError } from "@/lib/api";
import { AlertTriangle, CheckCircle2, ChevronRight, Loader2, Minus, Plus } from "lucide-react";

export default function TouchPackPage() {
  const router = useRouter();

  // Double-guard: middleware + page level
  useEffect(() => {
    const match = document.cookie.match(/(?:^|;\s*)userRole=([^;]+)/);
    const role = match ? match[1] : '';
    if (role === 'ADMIN' || role === 'MANAGER') router.replace('/');
  }, [router]);

  const [bichuvBatches, setBichuvBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Tanlangan partiya state'i
  const [selectedBatch, setSelectedBatch] = useState<any | null>(null);

  // 1: Yaroqli Qadoqlangan dona, 2: Nuqsonli (Brak) dona
  const [quantity, setQuantity] = useState(0);
  const [defectCount, setDefectCount] = useState(0);

  // Xatolik sityuatsiyasi
  const [errorFlash, setErrorFlash] = useState(false);
  const [successToast, setSuccessToast] = useState(false);

  useEffect(() => {
    // API orqali Bichuv dagi partiyalarni olamiz
    inventoryApi.bichuvList().then((res) => {
      setBichuvBatches(res.results);
      setLoading(false);
    });
  }, []);

  const validateCount = () => {
    if (selectedBatch && (quantity + defectCount) > selectedBatch.quantity) {
      setErrorFlash(true);
      setTimeout(() => setErrorFlash(false), 2500); 
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!selectedBatch || (quantity === 0 && defectCount === 0)) return;
    if (!validateCount()) return;

    try {
      const today = new Date().toISOString().split("T")[0];
      await inventoryApi.upakovkaCreate({
        bichuv: selectedBatch.id,
        batch_number: selectedBatch.batch_number,
        product_model: selectedBatch.product_model,
        quantity,
        defect_count: defectCount,
        pack_date: today,
      });
      setSuccessToast(true);
      setTimeout(() => {
        setSuccessToast(false);
        setSelectedBatch(null);
        setQuantity(0);
        setDefectCount(0);
      }, 2000);
    } catch (e) {
      if (e instanceof ApiError) {
        console.error("Upakovka saqlashda xatolik:", e.data);
      }
      setErrorFlash(true);
      setTimeout(() => setErrorFlash(false), 2500);
    }
  };

  if (loading) {
    return <TouchLayout pageTitle="Yuklanmoqda..."><Loader2 className="animate-spin text-indigo-500 m-auto" size={64} /></TouchLayout>;
  }

  return (
    <TouchLayout pageTitle="Upakovka Bekati (Qadoqlash)">
      
      {/* ── ERROR FLASH OVERLAY ── */}
      {errorFlash && (
        <div className="fixed inset-0 z-50 pointer-events-none ring-[20px] ring-inset ring-red-500 bg-red-500/10 flex items-center justify-center animate-pulse">
           <div className="bg-red-600 rounded-3xl p-10 flex flex-col items-center shadow-2xl text-white transform scale-110">
              <AlertTriangle size={100} className="mb-4" />
              <h2 className="text-5xl font-black uppercase tracking-widest text-center shadow-sm">XATO: Oshib ketdi!</h2>
              <p className="text-2xl mt-4 max-w-lg text-center opacity-90">Kiritilgan dona va braklar yig&apos;indisi bichuvdan kelgan jami donadan ko&apos;p bo&apos;lmasligi kerak.</p>
           </div>
        </div>
      )}

      {/* ── SUCCESS TOAST overlays ── */}
      {successToast && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-emerald-500 rounded-[2rem] p-10 flex flex-col items-center shadow-2xl transform animate-in zoom-in-95">
            <CheckCircle2 size={100} className="text-white mb-6" />
            <h2 className="text-4xl font-black text-white uppercase tracking-wider">Saqlandi</h2>
          </div>
        </div>
      )}

      <div className="flex gap-8 h-full"> 
        
        {/* 1-USTUN: Bichuv Partiyalari ro'yxati */}
        <div className="w-1/2 flex flex-col h-full bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 bg-slate-50 border-b border-slate-200 shrink-0">
            <h3 className="text-2xl font-black text-slate-800 uppercase tracking-widest">Bichuv Partiyalari</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {bichuvBatches.length > 0 ? bichuvBatches.map(batch => {
              const active = selectedBatch?.id === batch.id;
              return (
                <button
                  key={batch.id}
                  onClick={() => { setSelectedBatch(batch); setQuantity(0); setDefectCount(0); }}
                  className={`w-full text-left p-6 rounded-3xl border-2 transition-all active:scale-[0.98] flex items-center justify-between
                    ${active ? "bg-indigo-50 border-indigo-500 ring-4 ring-indigo-500/20" : "bg-white border-slate-200 hover:border-slate-300"}
                  `}
                >
                  <div>
                    <h4 className={`text-3xl font-black mb-2 ${active ? "text-indigo-700" : "text-slate-700"}`}>#{batch.batch_number}</h4>
                    <p className="text-lg font-bold text-slate-500">Kutilyapdi: {batch.quantity} ta (Dona)</p>
                  </div>
                  <ChevronRight size={40} className={active ? "text-indigo-500" : "text-slate-300"} />
                </button>
              )
            }) : (
              <div className="text-2xl text-slate-400 font-bold p-10 text-center">Bo'sh...</div>
            )}
          </div>
        </div>

        {/* 2-USTUN: Tanlangan partiyaga miqdor kiritish (Yaroqli va Brak) */}
        <div className="w-1/2 flex flex-col h-full bg-slate-100 rounded-[2rem] border border-slate-200 overflow-hidden shadow-inner p-6 gap-6">
           
           {!selectedBatch ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                <ChevronRight size={100} className="mb-4 opacity-50" />
                <h3 className="text-3xl font-bold uppercase tracking-widest">Partiyani tanlang</h3>
              </div>
           ) : (
             <>
               <div className="bg-white rounded-3xl p-6 shadow-sm">
                 <p className="text-sm font-bold text-indigo-500 uppercase tracking-widest mb-1">Joriy Partiya</p>
                 <h2 className="text-4xl font-black text-slate-800">#{selectedBatch.batch_number}</h2>
                 <p className="text-xl text-slate-500 font-bold mt-2">Kutilayotgan limit: <span className="text-indigo-600">{selectedBatch.quantity} ta qismlar</span></p>
               </div>

               <div className="flex-1 flex flex-col gap-6">
                 
                 {/* Yaroqli qadoqlar */}
                 <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-200">
                   <p className="text-lg font-bold text-slate-700 uppercase tracking-widest mb-4">Muvaffaqiyatli qadoq (Dona)</p>
                   <div className="flex gap-4">
                     <button onClick={() => setQuantity(p => Math.max(0, p - 10))} className="w-24 h-24 rounded-2xl bg-slate-100 text-slate-500 border border-slate-200 flex items-center justify-center active:bg-slate-300 active:scale-90 transition-all"><Minus size={48} /></button>
                     <div className="flex-1 bg-slate-50 rounded-2xl border-2 border-slate-200 flex flex-col justify-center items-center">
                       <span className="text-6xl font-black text-indigo-600">
                         {quantity}
                       </span>
                     </div>
                     <button onClick={() => {setQuantity(p => p + 10); validateCount()}} className="w-24 h-24 rounded-2xl bg-indigo-50 text-indigo-500 border border-indigo-200 flex items-center justify-center active:bg-indigo-200 active:scale-90 transition-all"><Plus size={48} /></button>
                   </div>
                 </div>

                 {/* Nuqsonli (Brak) */}
                 <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-200">
                   <p className="text-lg font-bold text-slate-700 uppercase tracking-widest mb-4">Yaroqsiz (Brak)</p>
                   <div className="flex gap-4">
                     <button onClick={() => setDefectCount(p => Math.max(0, p - 1))} className="w-24 h-24 rounded-2xl bg-red-50 text-red-500 border border-red-200 flex items-center justify-center active:bg-red-200 active:scale-90 transition-all"><Minus size={48} /></button>
                     <div className="flex-1 bg-slate-50 rounded-2xl border-2 border-slate-200 flex flex-col justify-center items-center">
                       <span className="text-6xl font-black text-red-500">{defectCount}</span>
                     </div>
                     <button onClick={() => {setDefectCount(p => p + 1); validateCount()}} className="w-24 h-24 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center active:bg-amber-100 active:scale-90 transition-all"><Plus size={48} /></button>
                   </div>
                 </div>

               </div>

               {/* Saqlash */}
               <button
                 disabled={(quantity === 0 && defectCount === 0) || (quantity + defectCount > selectedBatch.quantity)}
                 onClick={handleSave}
                 className="mt-4 w-full h-[100px] shrink-0 rounded-[2rem] bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-200 disabled:text-slate-400 text-white text-3xl font-black tracking-widest uppercase shadow-xl shadow-emerald-500/30 transition-all active:scale-[0.98]"
               >
                 TAYYOR
               </button>
             </>
           )}

        </div>

      </div>
    </TouchLayout>
  );
}

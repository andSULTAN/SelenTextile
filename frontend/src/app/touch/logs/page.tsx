"use client";

import { useState, useEffect, useCallback } from "react";
import TouchLayout from "@/components/layout/TouchLayout";
import { productsApi, workersApi, workLogsApi, getManagerId, type ProductModel, type Worker, type WorkType } from "@/lib/api";
import { User, CheckCircle2, Factory, Loader2, ArrowLeft, Delete, ShoppingBag } from "lucide-react";

export default function POSTouchEntryPage() {
  // State
  const [products, setProducts] = useState<ProductModel[]>([]);
  const [loading, setLoading] = useState(true);

  // Flow State
  // 1: Model tanlash, 2: Ish turi tanlash, 3: Ishchi kodi, 4: Soni kiritish
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form Data
  const [selectedProduct, setSelectedProduct] = useState<ProductModel | null>(null);
  const [selectedWorkType, setSelectedWorkType] = useState<WorkType | null>(null);
  
  // Worker Logic
  const [workerDigits, setWorkerDigits] = useState("");
  const [worker, setWorker] = useState<Worker | null>(null);
  const [workerLoading, setWorkerLoading] = useState(false);

  // Quantity Logic
  const [qtyDigits, setQtyDigits] = useState("");

  // UI
  const [toastMessage, setToastMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    productsApi.list(true)
      .then(res => {
        setProducts(res.results);
        setLoading(false);
      });
  }, []);

  // Worker lookup logic (Auto trigger when digits are entered)
  useEffect(() => {
    if (step === 3 && workerDigits.length >= 1) {
      // Pad to 3 digits (e.g., "1" -> "W-001")
      const code = `W-${workerDigits.padStart(3, "0")}`;
      setWorkerLoading(true);
      
      const timer = setTimeout(() => {
        workersApi.lookup(code)
          .then((w) => setWorker(w.status === "active" ? w : null))
          .catch(() => setWorker(null))
          .finally(() => setWorkerLoading(false));
      }, 300); // 300ms debounce
      
      return () => clearTimeout(timer);
    } else if (step === 3 && workerDigits.length === 0) {
      setWorker(null);
    }
  }, [workerDigits, step]);

  // Numpad handler
  const handleNumpad = (val: string) => {
    if (step === 3) {
      // Worker code digits (max 3 digits for W-001 format)
      if (workerDigits.length < 3) setWorkerDigits(prev => prev + val);
    } else if (step === 4) {
      // Quantity digits
      if (qtyDigits.length < 5) setQtyDigits(prev => prev + val);
    }
  };

  const handleBackspace = () => {
    if (step === 3) setWorkerDigits(prev => prev.slice(0, -1));
    else if (step === 4) setQtyDigits(prev => prev.slice(0, -1));
  };

  const showToast = () => {
    setToastMessage("MUVAFFAQIYATLI SAQLANDI");
    setTimeout(() => setToastMessage(""), 1500);
  };

  const resetFlow = () => {
    setWorkerDigits("");
    setWorker(null);
    setQtyDigits("");
    setStep(3); // Model va ish turi saqlanib qoladi, yangi ishchi kiritish so'raladi
  };

  const handleSubmit = async () => {
    if (!worker || !selectedWorkType || !qtyDigits || parseInt(qtyDigits) <= 0) return;

    setSubmitting(true);
    try {
      await workLogsApi.create({
        worker: worker.id,
        work_type: selectedWorkType.id,
        quantity: parseInt(qtyDigits),
        work_date: new Date().toISOString().split("T")[0],
        manager: getManagerId(),
      });
      showToast();
      resetFlow();
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <TouchLayout pageTitle="Yuklanmoqda..."><div className="flex justify-center mt-20"><Loader2 className="animate-spin text-indigo-500" size={48} /></div></TouchLayout>;
  }

  // Yirik Toast xabarnomasi (Overlay stylida)
  const renderToast = () => {
    if (!toastMessage) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-emerald-500 rounded-[2rem] p-10 flex flex-col items-center shadow-2xl shadow-emerald-500/30 transform animate-in zoom-in-95 duration-200">
          <CheckCircle2 size={100} className="text-white mb-6" />
          <h2 className="text-4xl font-black text-white text-center uppercase tracking-wider">{toastMessage}</h2>
        </div>
      </div>
    );
  };

  return (
    <TouchLayout pageTitle="Yangi Ish Qo'shish">
      {renderToast()}
      
      <div className="flex flex-col h-full bg-slate-50 gap-6">
        
        {/* ── BREADCRUMB / STEPS ── */}
        <div className="flex gap-4 p-4 bg-white rounded-3xl shadow-sm border border-slate-100 shrink-0">
          <button 
            onClick={() => setStep(1)}
            className={`flex-1 py-4 rounded-2xl font-bold uppercase transition-all flex items-center justify-center gap-2
              ${step === 1 ? "bg-indigo-500 text-white shadow-md shadow-indigo-200" : "bg-slate-50 text-slate-400 border border-slate-200 active:bg-slate-100"}`}
          >
            <Factory size={24} /> 1. Model
            {selectedProduct && step > 1 && <span className="ml-2 bg-white/20 text-white px-3 py-1 rounded-xl text-xs">{selectedProduct.code}</span>}
          </button>

          <button 
            disabled={!selectedProduct}
            onClick={() => setStep(2)}
            className={`flex-1 py-4 rounded-2xl font-bold uppercase transition-all flex items-center justify-center gap-2
              ${step === 2 ? "bg-indigo-500 text-white shadow-md shadow-indigo-200" : !selectedProduct ? "opacity-50" : "bg-slate-50 text-slate-400 border border-slate-200 active:bg-slate-100"}`}
          >
            <ShoppingBag size={24} /> 2. Ish Turi
            {selectedWorkType && step > 2 && <span className="ml-2 bg-white/20 text-white px-3 py-1 rounded-xl text-xs">{selectedWorkType.name}</span>}
          </button>

          <button 
            disabled={!selectedWorkType}
            onClick={() => setStep(3)}
            className={`flex-1 py-4 rounded-2xl font-bold uppercase transition-all flex items-center justify-center gap-2
              ${step === 3 ? "bg-indigo-500 text-white shadow-md shadow-indigo-200" : !selectedWorkType ? "opacity-50" : "bg-slate-50 text-slate-400 border border-slate-200 active:bg-slate-100"}`}
          >
            <User size={24} /> 3. Ishchi & Soni
          </button>
        </div>

        {/* ── INTERACTIVE AREA ── */}
        <div className="flex-1 overflow-hidden flex flex-col">
          
          {/* STEP 1: MODELLAR RENDERI (Grid Cardlar) */}
          {step === 1 && (
            <div className="grid grid-cols-3 xl:grid-cols-4 gap-6 p-2 overflow-y-auto pb-4">
              {products.map(p => (
                <div 
                  key={p.id}
                  onClick={() => { setSelectedProduct(p); setStep(2); setSelectedWorkType(null); }}
                  className="bg-white border-2 border-slate-200 rounded-[2rem] p-8 flex flex-col items-center justify-center cursor-pointer
                    active:scale-[0.97] transition-transform hover:border-indigo-300 hover:shadow-lg shadow-sm
                    h-48"
                >
                  <span className="text-5xl font-black text-indigo-500 mb-4">{p.code}</span>
                  <span className="text-xl font-bold text-slate-700 text-center uppercase tracking-wide">{p.name}</span>
                </div>
              ))}
            </div>
          )}

          {/* STEP 2: ISH TURLARI RENDERI (Grid Cardlar) */}
          {step === 2 && selectedProduct && (
            <div className="grid grid-cols-2 gap-6 p-2 overflow-y-auto pb-4">
              {selectedProduct.work_types.map(wt => (
                <div 
                  key={wt.id}
                  onClick={() => { setSelectedWorkType(wt); setStep(3); }}
                  className="bg-white border-2 border-slate-200 rounded-[2rem] p-8 flex justify-between items-center cursor-pointer
                    active:scale-[0.97] transition-transform hover:border-indigo-300 hover:shadow-lg shadow-sm
                    h-36"
                >
                  <span className="text-3xl font-black text-slate-700 uppercase tracking-wide">{wt.name}</span>
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-600 px-6 py-3 rounded-2xl">
                    <span className="text-2xl font-black">{parseFloat(wt.price).toLocaleString()} <span className="text-lg">so&apos;m</span></span>
                  </div>
                </div>
              ))}
              {selectedProduct.work_types.length === 0 && (
                <div className="col-span-2 text-center text-slate-500 text-2xl font-bold mt-10">Ushbu modelda ish turlari mavjud emas.</div>
              )}
            </div>
          )}

          {/* STEP 3 & 4: POS NUMPAD VA ISHCHI HISOBLASHLARI */}
          {(step === 3 || step === 4) && (
            <div className="flex gap-8 flex-1 h-full min-h-0">
              
              {/* O'NG TOMON - NUMPAD */}
              <div className="w-96 shrink-0 flex flex-col gap-4">
                <div className="flex gap-4">
                  <button onClick={() => setStep(3)} className={`flex-1 py-4 text-center rounded-2xl font-bold uppercase transition-all border-2 ${step === 3 ? "bg-indigo-50 border-indigo-500 text-indigo-600" : "bg-white border-slate-200 text-slate-500"}`}>Kod terish</button>
                  <button onClick={() => setStep(4)} disabled={!worker} className={`flex-1 py-4 text-center rounded-2xl font-bold uppercase transition-all border-2 ${step === 4 ? "bg-amber-50 border-amber-500 text-amber-600" : "bg-white border-slate-200 text-slate-500"} disabled:opacity-50`}>Soni kiritish</button>
                </div>

                <div className="bg-slate-800 rounded-[2rem] p-6 flex-1 flex flex-col gap-4 text-white shadow-xl shadow-slate-300">
                  <div className="bg-slate-950 rounded-2xl p-6 text-right border border-white/10 relative overflow-hidden">
                    <span className="absolute left-4 top-4 text-slate-500 text-xs font-bold uppercase tracking-widest">{step === 3 ? "Worker Code" : "Quantity"}</span>
                    <span className="text-5xl font-black tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                      {step === 3 ? `W-${workerDigits.padEnd(3, '_')}` : (qtyDigits || "0")}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-4 flex-1">
                    {[1,2,3,4,5,6,7,8,9].map(num => (
                      <button 
                        key={num} 
                        onClick={() => handleNumpad(num.toString())}
                        className="bg-slate-700/50 hover:bg-slate-700 rounded-2xl text-4xl font-black border border-white/5 active:scale-95 transition-transform"
                      >
                        {num}
                      </button>
                    ))}
                    <button 
                      onClick={handleBackspace}
                      className="bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-2xl flex items-center justify-center border border-red-500/20 active:scale-95 transition-transform"
                    >
                      <Delete size={36} />
                    </button>
                    <button 
                      onClick={() => handleNumpad("0")}
                      className="bg-slate-700/50 hover:bg-slate-700 rounded-2xl text-4xl font-black border border-white/5 active:scale-95 transition-transform"
                    >
                      0
                    </button>
                    <button 
                      onClick={() => {if(worker) setStep(4)}}
                      className="bg-indigo-500 text-white hover:bg-indigo-600 rounded-2xl text-2xl font-black active:scale-95 transition-transform flex items-center justify-center"
                    >
                      OK
                    </button>
                  </div>
                </div>
              </div>

              {/* CHAP TOMON - ISHCHI VA NATIJA (Kvitansiya) */}
              <div className="flex-1 bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-10 flex flex-col relative overflow-hidden">
                <h3 className="text-2xl font-bold text-slate-800 uppercase tracking-widest mb-8">Tasdiqlash</h3>

                <div className="flex items-center gap-6 mb-10 pb-10 border-b-2 border-slate-100 border-dashed">
                  <div className="w-32 h-32 rounded-full bg-slate-100 border-4 border-white shadow-lg overflow-hidden flex items-center justify-center shrink-0">
                     {workerLoading ? <Loader2 size={40} className="animate-spin text-slate-300" /> : <User size={60} className="text-slate-300" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Ishchi ma'lumoti</p>
                    {worker ? (
                      <>
                        <h2 className="text-4xl font-black text-slate-800 leading-tight">{worker.full_name}</h2>
                        <p className="text-xl text-emerald-500 font-bold mt-2 flex items-center gap-2"><CheckCircle2 size={24} /> {worker.code} — Faol</p>
                      </>
                    ) : (
                      <h2 className="text-4xl font-black text-slate-300 leading-tight">Yozilmoqda...</h2>
                    )}
                  </div>
                </div>

                <div className="space-y-6 flex-1">
                  <div className="flex justify-between items-center p-6 bg-slate-50 rounded-3xl">
                    <span className="text-lg font-bold text-slate-500 uppercase tracking-wide">Model & Ish</span>
                    <span className="text-2xl font-black text-slate-800">{selectedProduct?.code} — {selectedWorkType?.name}</span>
                  </div>
                  <div className="flex justify-between items-center p-6 bg-slate-50 rounded-3xl">
                    <span className="text-lg font-bold text-slate-500 uppercase tracking-wide">Birlik narxi</span>
                    <span className="text-2xl font-black text-slate-800">{selectedWorkType ? parseFloat(selectedWorkType.price).toLocaleString() : 0} so&apos;m</span>
                  </div>
                  <div className="flex justify-between items-center p-6 bg-indigo-50 rounded-3xl border border-indigo-100">
                    <span className="text-xl font-bold text-indigo-500 uppercase tracking-wide">Jami summa</span>
                    <span className="text-5xl font-black text-indigo-600">
                      {(parseInt(qtyDigits || "0") * (selectedWorkType ? parseFloat(selectedWorkType.price) : 0)).toLocaleString()} so&apos;m
                    </span>
                  </div>
                </div>

                <button
                  disabled={!worker || !qtyDigits || parseInt(qtyDigits) <= 0 || submitting}
                  onClick={handleSubmit}
                  className="mt-6 w-full h-[90px] rounded-[2rem] bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-200 disabled:text-slate-400 text-white text-3xl font-black tracking-widest uppercase shadow-xl shadow-emerald-500/30 transition-all active:scale-[0.98] flex items-center justify-center gap-4"
                >
                  {submitting ? <Loader2 className="animate-spin" size={32} /> : null}
                  SAQLASH
                </button>
              </div>

            </div>
          )}

        </div>
      </div>
    </TouchLayout>
  );
}

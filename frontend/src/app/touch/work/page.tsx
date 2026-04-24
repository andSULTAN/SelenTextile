"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import TouchLayout from "@/components/layout/TouchLayout";
import { productsApi, workersApi, workLogsApi, getManagerId, type Worker, type ProductModel, ApiError } from "@/lib/api";
import { ChevronLeft, Minus, Plus, CheckCircle2, Loader2, User } from "lucide-react";

type Step = "model" | "entry";

export default function TouchWorkPage() {
  const router = useRouter();

  // Guard
  useEffect(() => {
    const m = document.cookie.match(/(?:^|;\s*)userRole=([^;]+)/);
    const role = m ? m[1] : "";
    if (role === "CUTTER" || role === "PACKER") router.replace("/touch/cut");
  }, [router]);

  const [step, setStep] = useState<Step>("model");
  const [models, setModels] = useState<ProductModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<ProductModel | null>(null);

  // Entry form
  const [workerCode, setWorkerCode] = useState("");
  const [worker, setWorker]         = useState<Worker | null>(null);
  const [workerLoading, setWorkerLoading] = useState(false);
  const [selectedWorkType, setSelectedWorkType] = useState<number | null>(null);
  const [quantity, setQuantity]     = useState(0);
  const [saving, setSaving]         = useState(false);
  const [success, setSuccess]       = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => { productsApi.list(true).then(r => setModels(r.results)).catch(() => {}); }, []);

  // Auto-lookup worker by code (debounced)
  useEffect(() => {
    if (!workerCode.trim()) { setWorker(null); return; }
    const t = setTimeout(() => {
      setWorkerLoading(true);
      workersApi.lookup(workerCode.trim())
        .then(w => setWorker(w))
        .catch(() => setWorker(null))
        .finally(() => setWorkerLoading(false));
    }, 400);
    return () => clearTimeout(t);
  }, [workerCode]);

  const pickModel = (m: ProductModel) => {
    setSelectedModel(m);
    setSelectedWorkType(m.work_types[0]?.id ?? null);
    setStep("entry");
    setTimeout(() => codeRef.current?.focus(), 100);
  };

  const handleSave = async () => {
    if (!worker || !selectedWorkType || quantity <= 0 || !selectedModel) return;
    setSaving(true); setError(null);
    try {
      const today = new Date().toISOString().split("T")[0];
      await workLogsApi.create({
        worker: worker.id,
        work_type: selectedWorkType,
        quantity,
        work_date: today,
        manager: getManagerId(),
      });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setWorkerCode(""); setWorker(null);
        setQuantity(0);
        codeRef.current?.focus();
      }, 1500);
    } catch (e) {
      if (e instanceof ApiError) setError(Object.values(e.data).flat().join(" ") || "Xatolik");
      else setError("Serverga ulanishda xatolik.");
    } finally { setSaving(false); }
  };

  return (
    <TouchLayout pageTitle="Ish kiritish">

      {success && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-emerald-500 rounded-[2rem] p-10 flex flex-col items-center shadow-2xl">
            <CheckCircle2 size={80} className="text-white mb-4" />
            <h2 className="text-3xl font-black text-white uppercase tracking-wider">Saqlandi!</h2>
          </div>
        </div>
      )}

      {/* STEP: MODEL TANLASH */}
      {step === "model" && (
        <div className="flex flex-col h-full gap-4">
          <p className="text-lg font-bold text-slate-500 uppercase tracking-widest shrink-0">
            Model tanlang
          </p>
          <div className="grid grid-cols-3 gap-4 flex-1 overflow-y-auto content-start">
            {models.map(m => (
              <button
                key={m.id}
                onClick={() => pickModel(m)}
                className="bg-white border-2 border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 rounded-3xl p-6 text-left transition-all active:scale-95 touch-manipulation"
              >
                <p className="text-xl font-black text-slate-800 mb-1">{m.name}</p>
                <p className="text-sm text-slate-400 font-mono">{m.code}</p>
                <p className="text-xs text-indigo-500 font-semibold mt-2">{m.work_types.length} ta ish turi</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* STEP: ISH KIRITISH */}
      {step === "entry" && selectedModel && (
        <div className="flex gap-6 h-full">

          {/* LEFT: worker + work type */}
          <div className="w-1/2 flex flex-col gap-4">
            <button
              onClick={() => { setStep("model"); setWorkerCode(""); setWorker(null); setQuantity(0); }}
              className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold text-sm w-fit"
            >
              <ChevronLeft size={18} /> Model o'zgartirish
            </button>

            {/* Model info */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5">
              <p className="text-xs text-indigo-500 font-bold uppercase tracking-widest mb-1">Tanlangan model</p>
              <h2 className="text-3xl font-black text-indigo-800">{selectedModel.name}</h2>
            </div>

            {/* Worker code input */}
            <div className="bg-white border-2 border-slate-200 rounded-2xl p-5">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Ishchi kodi</p>
              <div className="flex items-center gap-3">
                <input
                  ref={codeRef}
                  type="text"
                  inputMode="text"
                  value={workerCode}
                  onChange={e => setWorkerCode(e.target.value)}
                  placeholder="W-001"
                  className="flex-1 text-3xl font-black text-slate-800 border-b-2 border-indigo-200 focus:border-indigo-500 outline-none bg-transparent pb-1"
                />
                {workerLoading && <Loader2 size={24} className="animate-spin text-indigo-400" />}
                {!workerLoading && worker && (
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                    <User size={20} className="text-emerald-600" />
                  </div>
                )}
              </div>
              {worker && (
                <p className="text-lg font-bold text-emerald-600 mt-2">{worker.full_name}</p>
              )}
              {workerCode && !worker && !workerLoading && (
                <p className="text-sm font-semibold text-red-500 mt-2">Ishchi topilmadi</p>
              )}
            </div>

            {/* Work type selection */}
            <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 flex-1">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Ish turi</p>
              <div className="space-y-2 overflow-y-auto max-h-40">
                {selectedModel.work_types.map(wt => (
                  <button
                    key={wt.id}
                    onClick={() => setSelectedWorkType(wt.id)}
                    className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${
                      selectedWorkType === wt.id
                        ? "border-indigo-500 bg-indigo-50 text-indigo-800"
                        : "border-slate-200 text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    <span className="font-bold">{wt.name}</span>
                    <span className="ml-2 text-sm text-slate-400">{Number(wt.price).toLocaleString()} so'm</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT: quantity + save */}
          <div className="w-1/2 flex flex-col gap-4">
            <div className="flex-1 bg-white border-2 border-slate-200 rounded-3xl p-6 flex flex-col items-center justify-center">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6">Dona soni</p>
              <div className="flex items-center gap-6">
                <button
                  onClick={() => setQuantity(q => Math.max(0, q - 1))}
                  className="w-20 h-20 rounded-2xl bg-slate-100 text-slate-600 border border-slate-200 flex items-center justify-center active:bg-slate-200 active:scale-90 transition-all touch-manipulation"
                >
                  <Minus size={40} />
                </button>
                <div className="flex-1 text-center">
                  <span className="text-7xl font-black text-indigo-600">{quantity}</span>
                </div>
                <button
                  onClick={() => setQuantity(q => q + 1)}
                  className="w-20 h-20 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center active:bg-indigo-100 active:scale-90 transition-all touch-manipulation"
                >
                  <Plus size={40} />
                </button>
              </div>

              {/* Quick +10, +50 buttons */}
              <div className="flex gap-3 mt-6">
                {[10, 50, 100].map(n => (
                  <button
                    key={n}
                    onClick={() => setQuantity(q => q + n)}
                    className="px-5 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm border border-slate-200 hover:bg-slate-200 active:scale-95 transition-all touch-manipulation"
                  >
                    +{n}
                  </button>
                ))}
                <button
                  onClick={() => setQuantity(0)}
                  className="px-4 py-2 bg-red-50 text-red-500 rounded-xl font-bold text-sm border border-red-100 hover:bg-red-100 active:scale-95 transition-all touch-manipulation"
                >
                  0
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm font-semibold px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            <button
              disabled={!worker || !selectedWorkType || quantity <= 0 || saving}
              onClick={handleSave}
              className="h-[90px] shrink-0 rounded-3xl bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-200 disabled:text-slate-400 text-white text-3xl font-black tracking-widest uppercase shadow-xl shadow-emerald-500/30 transition-all active:scale-[0.98] touch-manipulation flex items-center justify-center gap-3"
            >
              {saving ? <Loader2 size={32} className="animate-spin" /> : null}
              SAQLASH
            </button>
          </div>
        </div>
      )}
    </TouchLayout>
  );
}

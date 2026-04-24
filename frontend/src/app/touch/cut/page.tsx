"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import TouchLayout from "@/components/layout/TouchLayout";
import { inventoryApi, ApiError } from "@/lib/api";
import {
  AlertTriangle, CheckCircle2, ChevronRight,
  Loader2, Minus, Plus, History,
} from "lucide-react";

type Tab = "kirim" | "chiqim" | "tarix";

// ── Shared ─────────────────────────────────────────────────────────────────
function ErrorFlash({ msg }: { msg: string }) {
  return (
    <div className="fixed inset-0 z-50 pointer-events-none ring-[20px] ring-inset ring-red-500 bg-red-500/10 flex items-center justify-center animate-pulse">
      <div className="bg-red-600 rounded-3xl p-10 flex flex-col items-center shadow-2xl text-white">
        <AlertTriangle size={80} className="mb-4" />
        <h2 className="text-4xl font-black uppercase tracking-widest text-center">XATO!</h2>
        <p className="text-xl mt-3 max-w-md text-center opacity-90">{msg}</p>
      </div>
    </div>
  );
}

function SuccessToast() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-emerald-500 rounded-[2rem] p-10 flex flex-col items-center shadow-2xl">
        <CheckCircle2 size={80} className="text-white mb-4" />
        <h2 className="text-3xl font-black text-white uppercase tracking-wider">Saqlandi</h2>
      </div>
    </div>
  );
}

// ── KIRIM TAB ──────────────────────────────────────────────────────────────
function KirimTab() {
  const [batches, setBatches]     = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState<any | null>(null);
  const [weightKg, setWeightKg]   = useState(0);
  const [quantity, setQuantity]   = useState(0);
  const [errorMsg, setErrorMsg]   = useState("");
  const [success, setSuccess]     = useState(false);

  useEffect(() => {
    inventoryApi.skladList()
      .then(r => { setBatches(r.results); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const validate = () => {
    if (selected && weightKg > selected.quantity) {
      setErrorMsg("Kiritilgan og'irlik qoldiqdan oshib ketmoqda.");
      setTimeout(() => setErrorMsg(""), 2500);
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!selected || weightKg === 0 || quantity === 0) return;
    if (!validate()) return;
    try {
      const today = new Date().toISOString().split("T")[0];
      await inventoryApi.bichuvCreate({
        sklad: selected.id,
        batch_number: selected.batch_number,
        product_model: selected.product_model,
        quantity,
        weight_kg: weightKg,
        cut_date: today,
      });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false); setSelected(null); setWeightKg(0); setQuantity(0);
      }, 1800);
    } catch (e) {
      if (e instanceof ApiError) setErrorMsg(Object.values(e.data).flat().join(" ") || "Xatolik");
      else setErrorMsg("Xatolik yuz berdi");
      setTimeout(() => setErrorMsg(""), 2500);
    }
  };

  return (
    <div className="flex gap-6 h-full">
      {errorMsg && <ErrorFlash msg={errorMsg} />}
      {success && <SuccessToast />}

      {/* Partiyalar */}
      <div className="w-1/2 bg-white rounded-[2rem] border border-slate-200 flex flex-col overflow-hidden">
        <div className="p-5 bg-slate-50 border-b border-slate-200 shrink-0">
          <h3 className="text-lg font-black text-slate-800 uppercase tracking-widest">Sklad Partiyalari</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin text-indigo-400" size={36} /></div>
          ) : batches.length === 0 ? (
            <p className="text-center text-slate-400 font-bold py-10">Sklad bo'sh</p>
          ) : batches.map(b => {
            const active = selected?.id === b.id;
            return (
              <button key={b.id} onClick={() => { setSelected(b); setWeightKg(0); setQuantity(0); }}
                className={`w-full text-left p-5 rounded-2xl border-2 transition-all active:scale-[0.98] flex items-center justify-between touch-manipulation
                  ${active ? "bg-indigo-50 border-indigo-500 ring-4 ring-indigo-500/20" : "bg-white border-slate-200 hover:border-slate-300"}`}
              >
                <div>
                  <h4 className={`text-2xl font-black mb-1 ${active ? "text-indigo-700" : "text-slate-700"}`}>#{b.batch_number}</h4>
                  <p className="text-sm font-bold text-slate-500">{b.fabric_type} · {b.quantity} kg</p>
                </div>
                <ChevronRight size={28} className={active ? "text-indigo-500" : "text-slate-300"} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Miqdor */}
      <div className="w-1/2 flex flex-col gap-4 bg-slate-100 rounded-[2rem] p-5 border border-slate-200">
        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <ChevronRight size={80} className="mb-3 opacity-40" />
            <p className="text-2xl font-bold uppercase tracking-widest">Partiya tanlang</p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-2xl p-5 shrink-0">
              <p className="text-xs text-indigo-500 font-bold uppercase tracking-widest mb-1">Joriy Partiya</p>
              <h2 className="text-3xl font-black text-slate-800">#{selected.batch_number}</h2>
              <p className="text-base text-slate-500 font-bold mt-1">Max: <span className="text-red-500">{selected.quantity} kg</span></p>
            </div>

            {/* KG */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200">
              <p className="text-sm font-bold text-slate-600 uppercase tracking-widest mb-3">Ishlatilgan Kg</p>
              <div className="flex gap-3 items-center">
                <button onClick={() => setWeightKg(p => Math.max(0, p - 10))} className="w-16 h-16 rounded-xl bg-red-50 text-red-500 border border-red-200 flex items-center justify-center active:scale-90 touch-manipulation"><Minus size={32} /></button>
                <div className="flex-1 text-center">
                  <span className={`text-5xl font-black ${weightKg > selected.quantity ? "text-red-500" : "text-slate-800"}`}>{weightKg}</span>
                </div>
                <button onClick={() => { setWeightKg(p => p + 10); }} className="w-16 h-16 rounded-xl bg-emerald-50 text-emerald-500 border border-emerald-200 flex items-center justify-center active:scale-90 touch-manipulation"><Plus size={32} /></button>
              </div>
            </div>

            {/* Dona */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 flex-1">
              <p className="text-sm font-bold text-slate-600 uppercase tracking-widest mb-3">Tayyor Dona</p>
              <div className="flex gap-3 items-center">
                <button onClick={() => setQuantity(p => Math.max(0, p - 50))} className="w-16 h-16 rounded-xl bg-slate-100 text-slate-500 border border-slate-200 flex items-center justify-center active:scale-90 touch-manipulation"><Minus size={32} /></button>
                <div className="flex-1 text-center">
                  <span className="text-5xl font-black text-slate-800">{quantity}</span>
                </div>
                <button onClick={() => setQuantity(p => p + 50)} className="w-16 h-16 rounded-xl bg-indigo-50 text-indigo-500 border border-indigo-200 flex items-center justify-center active:scale-90 touch-manipulation"><Plus size={32} /></button>
              </div>
            </div>

            <button
              disabled={weightKg === 0 || quantity === 0 || weightKg > selected.quantity}
              onClick={handleSave}
              className="h-[80px] shrink-0 rounded-[2rem] bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-200 disabled:text-slate-400 text-white text-2xl font-black tracking-widest uppercase shadow-xl shadow-indigo-500/30 transition-all active:scale-[0.98] touch-manipulation"
            >
              SAQLASH
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── CHIQIM TAB ─────────────────────────────────────────────────────────────
function ChiqimTab() {
  const [batches, setBatches]   = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState<any | null>(null);
  const [models, setModels]     = useState<any[]>([]);
  const [modelId, setModelId]   = useState<number | null>(null);
  const [kesim, setKesim]       = useState(1);
  const [ishSoni, setIshSoni]   = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [success, setSuccess]   = useState(false);

  useEffect(() => {
    inventoryApi.bichuvKirimAvailableForChiqim()
      .then(r => { setBatches(Array.isArray(r) ? r : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selected) { setModels([]); setModelId(null); return; }
    inventoryApi.fabricModels(selected.fabric ?? selected.id)
      .then(r => { setModels(r); if (r.length) setModelId(r[0].product_model); })
      .catch(() => {});
  }, [selected]);

  useEffect(() => {
    if (!selected || !modelId) return;
    inventoryApi.bichuvChiqimNextKesim(selected.fabric ?? selected.id, modelId)
      .then(r => setKesim(r.next_kesim))
      .catch(() => {});
  }, [selected, modelId]);

  const handleSave = async () => {
    if (!selected || !modelId || ishSoni <= 0) return;
    try {
      await inventoryApi.bichuvChiqimCreate({
        fabric: selected.fabric ?? selected.id,
        product_model: modelId,
        ish_soni: ishSoni,
        beka_kg: 0,
        kesim_number: kesim,
      });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false); setSelected(null); setIshSoni(0); setKesim(1);
      }, 1800);
    } catch (e) {
      if (e instanceof ApiError) setErrorMsg(Object.values(e.data).flat().join(" ") || "Xatolik");
      else setErrorMsg("Xatolik yuz berdi");
      setTimeout(() => setErrorMsg(""), 2500);
    }
  };

  return (
    <div className="flex gap-6 h-full">
      {errorMsg && <ErrorFlash msg={errorMsg} />}
      {success && <SuccessToast />}

      <div className="w-1/2 bg-white rounded-[2rem] border border-slate-200 flex flex-col overflow-hidden">
        <div className="p-5 bg-slate-50 border-b border-slate-200 shrink-0">
          <h3 className="text-lg font-black text-slate-800 uppercase tracking-widest">Bichuv Kirim Partiyalari</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin text-indigo-400" size={36} /></div>
          ) : batches.length === 0 ? (
            <p className="text-center text-slate-400 font-bold py-10">Mavjud partiya yo'q</p>
          ) : batches.map((b: any) => {
            const active = selected?.id === b.id;
            return (
              <button key={b.id} onClick={() => { setSelected(b); setIshSoni(0); }}
                className={`w-full text-left p-5 rounded-2xl border-2 transition-all active:scale-[0.98] flex items-center justify-between touch-manipulation
                  ${active ? "bg-indigo-50 border-indigo-500" : "bg-white border-slate-200 hover:border-slate-300"}`}
              >
                <div>
                  <h4 className={`text-2xl font-black mb-1 ${active ? "text-indigo-700" : "text-slate-700"}`}>#{b.batch_number ?? b.id}</h4>
                  <p className="text-sm font-bold text-slate-500">{b.roll_count ?? ""} rulon · {b.weight_kg ?? ""} kg</p>
                </div>
                <ChevronRight size={28} className={active ? "text-indigo-500" : "text-slate-300"} />
              </button>
            );
          })}
        </div>
      </div>

      <div className="w-1/2 flex flex-col gap-4 bg-slate-100 rounded-[2rem] p-5 border border-slate-200">
        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <ChevronRight size={80} className="mb-3 opacity-40" />
            <p className="text-2xl font-bold uppercase tracking-widest">Partiya tanlang</p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-2xl p-4 shrink-0">
              <p className="text-xs text-indigo-500 font-bold uppercase tracking-widest mb-1">Partiya #{selected.batch_number ?? selected.id}</p>
              <div className="flex gap-3 mt-2 flex-wrap">
                {/* Model select */}
                {models.length > 0 && (
                  <select
                    value={modelId ?? ""}
                    onChange={e => setModelId(Number(e.target.value))}
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 outline-none"
                  >
                    {models.map((m: any) => (
                      <option key={m.product_model} value={m.product_model}>{m.product_model_name}</option>
                    ))}
                  </select>
                )}
                {/* Kesim */}
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2">
                  <span className="text-xs font-bold text-slate-500">Kesim:</span>
                  <span className="text-lg font-black text-indigo-600">#{kesim}</span>
                </div>
              </div>
            </div>

            {/* Ish soni */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 flex-1 flex flex-col">
              <p className="text-sm font-bold text-slate-600 uppercase tracking-widest mb-4">Ish Soni (Dona)</p>
              <div className="flex gap-3 items-center flex-1">
                <button onClick={() => setIshSoni(p => Math.max(0, p - 10))} className="w-16 h-16 rounded-xl bg-slate-100 text-slate-600 border border-slate-200 flex items-center justify-center active:scale-90 touch-manipulation"><Minus size={32} /></button>
                <div className="flex-1 text-center">
                  <span className="text-6xl font-black text-indigo-600">{ishSoni}</span>
                </div>
                <button onClick={() => setIshSoni(p => p + 10)} className="w-16 h-16 rounded-xl bg-indigo-50 text-indigo-500 border border-indigo-200 flex items-center justify-center active:scale-90 touch-manipulation"><Plus size={32} /></button>
              </div>
              <div className="flex gap-2 mt-3">
                {[50, 100, 200].map(n => (
                  <button key={n} onClick={() => setIshSoni(p => p + n)}
                    className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-sm border border-slate-200 active:scale-95 touch-manipulation">+{n}</button>
                ))}
              </div>
            </div>

            <button
              disabled={ishSoni <= 0}
              onClick={handleSave}
              className="h-[80px] shrink-0 rounded-[2rem] bg-sky-500 hover:bg-sky-600 disabled:bg-slate-200 disabled:text-slate-400 text-white text-2xl font-black tracking-widest uppercase shadow-xl shadow-sky-500/30 transition-all active:scale-[0.98] touch-manipulation"
            >
              CHIQIM QAYD
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── TARIX TAB ──────────────────────────────────────────────────────────────
function TarixTab() {
  const [kirimList, setKirimList]   = useState<any[]>([]);
  const [chiqimList, setChiqimList] = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    Promise.allSettled([
      inventoryApi.bichuvList(),
      inventoryApi.bichuvChiqimList(),
    ]).then(([k, c]) => {
      if (k.status === "fulfilled") {
        setKirimList((k.value.results ?? []).filter((r: any) => r.cut_date === today).slice(0, 20));
      }
      if (c.status === "fulfilled") {
        setChiqimList((c.value.results ?? []).filter((r: any) => r.created_at?.startsWith(today)).slice(0, 20));
      }
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Loader2 size={40} className="animate-spin text-indigo-400" /></div>;

  return (
    <div className="flex gap-6 h-full overflow-hidden">
      {/* Kirim tarixi */}
      <div className="w-1/2 bg-white rounded-[2rem] border border-slate-200 flex flex-col overflow-hidden">
        <div className="p-5 bg-slate-50 border-b border-slate-200 shrink-0">
          <h3 className="text-base font-black text-slate-700 uppercase tracking-widest">Bugungi Kirimlar</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {kirimList.length === 0 ? (
            <p className="text-center text-slate-400 font-bold py-10">Bugun kirim yo'q</p>
          ) : kirimList.map((r: any) => (
            <div key={r.id} className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <div className="flex items-center justify-between mb-1">
                <span className="font-black text-slate-700">#{r.batch_number}</span>
                <span className="text-sm font-bold text-indigo-600">{r.weight_kg} kg</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
                <span>{r.cut_date}</span>
                <span>{r.quantity} dona</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chiqim tarixi */}
      <div className="w-1/2 bg-white rounded-[2rem] border border-slate-200 flex flex-col overflow-hidden">
        <div className="p-5 bg-slate-50 border-b border-slate-200 shrink-0">
          <h3 className="text-base font-black text-slate-700 uppercase tracking-widest">Bugungi Chiqimlar</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {chiqimList.length === 0 ? (
            <p className="text-center text-slate-400 font-bold py-10">Bugun chiqim yo'q</p>
          ) : chiqimList.map((r: any) => (
            <div key={r.id} className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <div className="flex items-center justify-between mb-1">
                <span className="font-black text-slate-700">#{r.id}</span>
                <span className="text-sm font-bold text-sky-600">{r.ish_soni} dona</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
                <span>Kesim #{r.kesim_number}</span>
                <span>{r.product_model_name}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── PAGE ───────────────────────────────────────────────────────────────────
const TABS: { id: Tab; label: string }[] = [
  { id: "kirim",  label: "Kirim" },
  { id: "chiqim", label: "Chiqim (Kesim)" },
  { id: "tarix",  label: "Bugungi Tarix" },
];

export default function TouchCutPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("kirim");

  useEffect(() => {
    const m = document.cookie.match(/(?:^|;\s*)userRole=([^;]+)/);
    const role = m ? m[1].toUpperCase() : "";
    if (role === "ADMIN" || role === "MANAGER") router.replace("/");
  }, [router]);

  return (
    <TouchLayout pageTitle="Bichuv Bekati">
      {/* Tab bar */}
      <div className="flex gap-2 bg-slate-200 rounded-2xl p-1.5 mb-4 shrink-0">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all touch-manipulation ${
              tab === t.id ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0">
        {tab === "kirim"  && <KirimTab />}
        {tab === "chiqim" && <ChiqimTab />}
        {tab === "tarix"  && <TarixTab />}
      </div>
    </TouchLayout>
  );
}

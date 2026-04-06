"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import CRMLayout from "@/components/layout/CRMLayout";
import {
  productsApi,
  workersApi,
  workLogsApi,
  getManagerId,
  type ProductModel,
  type Worker,
  type WorkType,
  ApiError,
} from "@/lib/api";
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  Search,
  User,
  Hash,
  Package,
  ClipboardList,
} from "lucide-react";

/* ── Toast notification ── */
interface Toast {
  id: number;
  type: "success" | "error";
  message: string;
}

export default function WorkEntryPage() {
  // Data
  const [products, setProducts] = useState<ProductModel[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Form state
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [workerCode, setWorkerCode] = useState("");
  const [worker, setWorker] = useState<Worker | null>(null);
  const [workerLoading, setWorkerLoading] = useState(false);
  const [workerError, setWorkerError] = useState("");
  const [selectedWorkTypeId, setSelectedWorkTypeId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState("");
  const [workDate, setWorkDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  });
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const workerCodeRef = useRef<HTMLInputElement>(null);
  const quantityRef = useRef<HTMLInputElement>(null);
  const toastIdRef = useRef(0);

  // Derived
  const selectedProduct = products.find((p) => p.id === selectedProductId) ?? null;
  const selectedWorkType = selectedProduct?.work_types.find(
    (wt) => wt.id === selectedWorkTypeId
  ) ?? null;

  /* ── Load products on mount ── */
  useEffect(() => {
    productsApi
      .list(true)
      .then((data) => {
        setProducts(data.results);
        setLoadingProducts(false);
      })
      .catch(() => {
        setLoadingProducts(false);
        addToast("error", "Modellarni yuklashda xatolik");
      });
  }, []);

  /* ── Worker lookup on blur ── */
  const lookupWorker = useCallback(async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) {
      setWorker(null);
      setWorkerError("");
      return;
    }
    setWorkerLoading(true);
    setWorkerError("");
    setWorker(null);
    try {
      const w = await workersApi.lookup(trimmed);
      setWorker(w);
      if (w.status !== "active") {
        setWorkerError("Ishchi faol emas");
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setWorkerError("Ishchi topilmadi");
      } else {
        setWorkerError("Qidirish xatosi");
      }
    } finally {
      setWorkerLoading(false);
    }
  }, []);

  /* ── Toast helper ── */
  const addToast = (type: "success" | "error", message: string) => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  /* ── Reset form (keep product) ── */
  const resetForm = () => {
    setWorkerCode("");
    setWorker(null);
    setWorkerError("");
    setSelectedWorkTypeId(null);
    setQuantity("");
    setNote("");
    // Focus worker code input
    setTimeout(() => workerCodeRef.current?.focus(), 100);
  };

  /* ── Submit ── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!worker || !selectedWorkTypeId || !quantity || !selectedProductId) {
      addToast("error", "Barcha maydonlarni to'ldiring");
      return;
    }

    if (worker.status !== "active") {
      addToast("error", "Ishchi faol emas");
      return;
    }

    setSubmitting(true);
    try {
      const result = await workLogsApi.create({
        worker: worker.id,
        work_type: selectedWorkTypeId,
        quantity: parseInt(quantity, 10),
        work_date: workDate,
        manager: getManagerId(),
        note,
      });

      addToast(
        "success",
        `✅ ${worker.full_name} — ${result.work_type_name} × ${result.quantity} = ${parseFloat(result.total_sum).toLocaleString()} so'm`
      );
      resetForm();
    } catch (err) {
      if (err instanceof ApiError) {
        const detail = err.data.detail || JSON.stringify(err.data);
        addToast("error", `Xatolik: ${detail}`);
      } else {
        addToast("error", "Serverga ulanishda xatolik");
      }
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Can submit? ── */
  const canSubmit =
    !!worker &&
    worker.status === "active" &&
    !!selectedWorkTypeId &&
    !!quantity &&
    parseInt(quantity, 10) > 0 &&
    !!selectedProductId &&
    !submitting;

  return (
    <CRMLayout pageTitle="Ish kiritish">
      {/* ── Toasts ── */}
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`
              flex items-start gap-2.5 px-4 py-3 rounded-xl shadow-lg border
              animate-in slide-in-from-right fade-in duration-300
              ${
                toast.type === "success"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-red-50 border-red-200 text-red-800"
              }
            `}
          >
            {toast.type === "success" ? (
              <CheckCircle2 size={18} className="text-emerald-500 mt-0.5 shrink-0" />
            ) : (
              <AlertCircle size={18} className="text-red-500 mt-0.5 shrink-0" />
            )}
            <p className="text-[13px] font-medium leading-snug">{toast.message}</p>
          </div>
        ))}
      </div>

      <div className="max-w-2xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* ── 1. Model tanlash ── */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5">
            <label className="flex items-center gap-2 text-[13px] font-semibold text-slate-700 mb-3">
              <Package size={16} className="text-indigo-400" />
              Mahsulot modeli
            </label>

            {loadingProducts ? (
              <div className="flex items-center gap-2 text-slate-400 text-sm py-3">
                <Loader2 size={16} className="animate-spin" />
                Yuklanmoqda...
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {products.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setSelectedProductId(p.id);
                      setSelectedWorkTypeId(null);
                    }}
                    className={`
                      flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all duration-150
                      ${
                        selectedProductId === p.id
                          ? "border-indigo-300 bg-indigo-50/60 ring-1 ring-indigo-200"
                          : "border-slate-150 bg-slate-50/50 hover:border-slate-300 hover:bg-slate-50"
                      }
                    `}
                  >
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0 ${
                        selectedProductId === p.id
                          ? "bg-indigo-500 text-white"
                          : "bg-slate-200 text-slate-500"
                      }`}
                    >
                      {p.code}
                    </div>
                    <div className="min-w-0">
                      <p
                        className={`text-[13px] font-medium truncate ${
                          selectedProductId === p.id
                            ? "text-indigo-700"
                            : "text-slate-700"
                        }`}
                      >
                        {p.name}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {p.work_types.length} ta ish turi
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── 2. Worker Code ── */}
          {selectedProduct && (
            <div className="bg-white rounded-2xl border border-slate-100 p-5">
              <label
                htmlFor="workerCode"
                className="flex items-center gap-2 text-[13px] font-semibold text-slate-700 mb-3"
              >
                <Search size={16} className="text-indigo-400" />
                Ishchi kodi
              </label>

              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Hash
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    ref={workerCodeRef}
                    id="workerCode"
                    type="text"
                    value={workerCode}
                    onChange={(e) => setWorkerCode(e.target.value.toUpperCase())}
                    onBlur={() => lookupWorker(workerCode)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        lookupWorker(workerCode);
                      }
                    }}
                    placeholder="W-001"
                    autoComplete="off"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70
                              text-sm text-slate-800 placeholder:text-slate-400
                              focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300
                              transition-all"
                  />
                  {workerLoading && (
                    <Loader2
                      size={16}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-indigo-400 animate-spin"
                    />
                  )}
                </div>
              </div>

              {/* Worker result */}
              {worker && !workerError && (
                <div className="mt-3 flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-50/70 border border-emerald-200">
                  <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <User size={18} className="text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-slate-800">
                      {worker.full_name}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Kod: {worker.code} · {worker.status === "active" ? "Faol" : worker.status}
                    </p>
                  </div>
                </div>
              )}

              {workerError && (
                <div className="mt-3 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-50 border border-red-200">
                  <AlertCircle size={16} className="text-red-400 shrink-0" />
                  <p className="text-[13px] text-red-600 font-medium">{workerError}</p>
                </div>
              )}
            </div>
          )}

          {/* ── 3. Ish turi tanlash (radio) ── */}
          {selectedProduct && worker && !workerError && (
            <div className="bg-white rounded-2xl border border-slate-100 p-5">
              <label className="flex items-center gap-2 text-[13px] font-semibold text-slate-700 mb-3">
                <ClipboardList size={16} className="text-indigo-400" />
                Ish turi
              </label>

              <div className="space-y-1.5">
                {selectedProduct.work_types.map((wt) => (
                  <label
                    key={wt.id}
                    className={`
                      flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all duration-150
                      ${
                        selectedWorkTypeId === wt.id
                          ? "border-indigo-300 bg-indigo-50/60 ring-1 ring-indigo-200"
                          : "border-slate-100 hover:border-slate-250 hover:bg-slate-50/50"
                      }
                    `}
                  >
                    <input
                      type="radio"
                      name="workType"
                      value={wt.id}
                      checked={selectedWorkTypeId === wt.id}
                      onChange={() => {
                        setSelectedWorkTypeId(wt.id);
                        // Focus quantity after selecting work type
                        setTimeout(() => quantityRef.current?.focus(), 50);
                      }}
                      className="w-4 h-4 text-indigo-500 border-slate-300 focus:ring-indigo-300"
                    />
                    <div className="flex-1">
                      <span className="text-[13px] font-medium text-slate-700">
                        {wt.name}
                      </span>
                    </div>
                    <span className="text-[13px] font-semibold text-slate-800">
                      {parseFloat(wt.price).toLocaleString()}
                      <span className="text-[11px] text-slate-400 font-normal ml-1">
                        so&apos;m
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* ── 4. Miqdor va sana ── */}
          {selectedWorkType && (
            <div className="bg-white rounded-2xl border border-slate-100 p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Quantity */}
                <div>
                  <label
                    htmlFor="quantity"
                    className="block text-[13px] font-semibold text-slate-700 mb-2"
                  >
                    Ish soni
                  </label>
                  <input
                    ref={quantityRef}
                    id="quantity"
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="0"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70
                              text-sm text-slate-800 placeholder:text-slate-400
                              focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300
                              transition-all"
                  />
                </div>

                {/* Date */}
                <div>
                  <label
                    htmlFor="workDate"
                    className="block text-[13px] font-semibold text-slate-700 mb-2"
                  >
                    Sana
                  </label>
                  <input
                    id="workDate"
                    type="date"
                    value={workDate}
                    onChange={(e) => setWorkDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70
                              text-sm text-slate-800
                              focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300
                              transition-all"
                  />
                </div>
              </div>

              {/* Note */}
              <div className="mt-4">
                <label
                  htmlFor="note"
                  className="block text-[13px] font-semibold text-slate-700 mb-2"
                >
                  Izoh <span className="text-slate-400 font-normal">(ixtiyoriy)</span>
                </label>
                <input
                  id="note"
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Qo'shimcha ma'lumot..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70
                            text-sm text-slate-800 placeholder:text-slate-400
                            focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300
                            transition-all"
                />
              </div>

              {/* Summary */}
              {quantity && parseInt(quantity, 10) > 0 && (
                <div className="mt-4 px-4 py-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex justify-between items-center">
                    <span className="text-[12px] text-slate-500">Jami summa:</span>
                    <span className="text-base font-bold text-indigo-600">
                      {(
                        parseInt(quantity, 10) * parseFloat(selectedWorkType.price)
                      ).toLocaleString()}{" "}
                      <span className="text-[12px] text-slate-400 font-normal">
                        so&apos;m
                      </span>
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-[11px] text-slate-400">
                      {quantity} × {parseFloat(selectedWorkType.price).toLocaleString()} so&apos;m
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Submit ── */}
          {selectedWorkType && (
            <button
              type="submit"
              disabled={!canSubmit}
              className={`
                w-full py-3 rounded-xl text-sm font-semibold transition-all duration-200
                ${
                  canSubmit
                    ? "bg-indigo-500 text-white hover:bg-indigo-600 shadow-md shadow-indigo-200 active:scale-[0.98]"
                    : "bg-slate-100 text-slate-400 cursor-not-allowed"
                }
              `}
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  Saqlanmoqda...
                </span>
              ) : (
                "Saqlash"
              )}
            </button>
          )}
        </form>
      </div>
    </CRMLayout>
  );
}

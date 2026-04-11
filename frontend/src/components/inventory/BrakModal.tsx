"use client";

import { useState } from "react";
import { X, AlertTriangle, Loader2, CheckCircle2 } from "lucide-react";
import { inventoryApi } from "@/lib/api";

interface BrakModalProps {
  fabrics: any[];
  onClose: () => void;
  onSaved: () => void;
}

const BRAK_TYPES = [
  { value: "tovuvchi",  label: "To'quvchi braki" },
  { value: "bichuvchi", label: "Bichuvchi braki" },
  { value: "aralash",   label: "Ikkalasi (aralash)" },
];

export default function BrakModal({ fabrics, onClose, onSaved }: BrakModalProps) {
  const [selectedFabric, setSelectedFabric] = useState<any>(null);
  const [kg, setKg] = useState("");
  const [brakType, setBrakType] = useState("tovuvchi");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSave = async () => {
    if (!selectedFabric) { setError("Partiya tanlang."); return; }
    const kgNum = parseInt(kg, 10);
    if (!kgNum || kgNum <= 0) { setError("Brak kg ni to'g'ri kiriting."); return; }

    setError(null);
    setSaving(true);
    try {
      await inventoryApi.brakCreate({
        fabric: selectedFabric.id,
        kg: kgNum,
        brak_type: brakType,
        note,
      });
      setSuccess(true);
      setTimeout(() => {
        onSaved();
        onClose();
      }, 800);
    } catch (e: any) {
      const msg =
        e.data?.error ||
        (typeof e.data === "object" ? JSON.stringify(e.data) : null) ||
        e.message ||
        "Xatolik yuz berdi";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-500" />
            <h2 className="text-lg font-bold text-slate-800">Brak kiritish</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">

          {/* Step 1: Partiya tanlash */}
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-2">
              1. Partiyani tanlang
            </p>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 text-xs border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2 font-medium w-6"></th>
                    <th className="px-3 py-2 font-medium">Partiya</th>
                    <th className="px-3 py-2 font-medium">To'quvchi</th>
                    <th className="px-3 py-2 font-medium text-center">Kg</th>
                    <th className="px-3 py-2 font-medium text-center">Rulon</th>
                    <th className="px-3 py-2 font-medium text-center">Qoldiq</th>
                  </tr>
                </thead>
                <tbody>
                  {fabrics.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-3 py-4 text-center text-slate-400">
                        Ma'lumot topilmadi
                      </td>
                    </tr>
                  )}
                  {fabrics.map((f) => {
                    const isSelected = selectedFabric?.id === f.id;
                    return (
                      <tr
                        key={f.id}
                        onClick={() => setSelectedFabric(f)}
                        className={`cursor-pointer border-t border-slate-100 transition-colors ${
                          isSelected
                            ? "bg-amber-50 border-l-2 border-l-amber-400"
                            : "hover:bg-slate-50"
                        }`}
                      >
                        <td className="px-3 py-2.5">
                          <div
                            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                              isSelected
                                ? "border-amber-500 bg-amber-500"
                                : "border-slate-300"
                            }`}
                          >
                            {isSelected && (
                              <div className="w-1.5 h-1.5 rounded-full bg-white" />
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 font-semibold text-indigo-600">
                          {f.batch_number}
                        </td>
                        <td className="px-3 py-2.5 text-slate-600">
                          {f.supplier_weaver || "—"}
                        </td>
                        <td className="px-3 py-2.5 text-center font-medium">
                          {Math.floor(f.total_kg)}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {f.roll_count}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                              f.available_kg > 0
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {Math.floor(f.available_kg)} kg
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Step 2: Brak ma'lumotlari */}
          {selectedFabric && (
            <div className="space-y-3 p-4 bg-amber-50/60 rounded-xl border border-amber-200">
              <p className="text-sm font-semibold text-slate-700">
                2. Brak ma'lumotlarini kiriting
              </p>

              {/* Partiya info (readonly) */}
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-white rounded-lg px-3 py-2 border border-slate-200">
                  <span className="text-slate-400">Partiya: </span>
                  <span className="font-bold text-indigo-600">{selectedFabric.batch_number}</span>
                </div>
                <div className="bg-white rounded-lg px-3 py-2 border border-slate-200">
                  <span className="text-slate-400">Mavjud: </span>
                  <span className="font-bold text-emerald-600">
                    {Math.floor(selectedFabric.available_kg)} kg
                  </span>
                </div>
                <div className="bg-white rounded-lg px-3 py-2 border border-slate-200">
                  <span className="text-slate-400">Rulon: </span>
                  <span className="font-bold">{selectedFabric.roll_count}</span>
                </div>
              </div>

              {/* Brak kg */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Brak kg <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max={Math.floor(selectedFabric.available_kg)}
                  value={kg}
                  onChange={(e) => setKg(e.target.value)}
                  placeholder={`Maks: ${Math.floor(selectedFabric.available_kg)} kg`}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
                />
              </div>

              {/* Brak turi */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Brak turi <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {BRAK_TYPES.map((bt) => (
                    <button
                      key={bt.value}
                      onClick={() => setBrakType(bt.value)}
                      className={`py-2 px-3 rounded-lg border text-sm font-medium transition-all ${
                        brakType === bt.value
                          ? "bg-amber-500 border-amber-500 text-white"
                          : "bg-white border-slate-300 text-slate-600 hover:border-amber-300 hover:bg-amber-50"
                      }`}
                    >
                      {bt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Izoh */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Izoh (ixtiyoriy)
                </label>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Qo'shimcha izoh..."
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
                />
              </div>
            </div>
          )}

          {/* Error / Success */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              <X size={15} className="flex-shrink-0" /> {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm">
              <CheckCircle2 size={15} className="flex-shrink-0" /> Muvaffaqiyatli saqlandi!
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 font-semibold text-sm transition"
          >
            Bekor qilish
          </button>
          <button
            disabled={saving || !selectedFabric || !kg || success}
            onClick={handleSave}
            className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            {saving ? (
              <><Loader2 size={16} className="animate-spin" /> Saqlanmoqda...</>
            ) : (
              "Brakni saqlash"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

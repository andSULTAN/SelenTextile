"use client";

import { useEffect, useState, useCallback } from "react";
import CRMLayout from "@/components/layout/CRMLayout";
import { inventoryApi } from "@/lib/api";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Package,
  Layers,
  ChevronUp,
  ChevronDown,
  Plus,
  Save,
  X,
  Loader2,
  Scissors,
  Hash,
  Weight,
  Trash2,
  Search,
  Eye,
} from "lucide-react";

/* ─── Types ─── */
interface PendingKirimItem {
  fabric: number;
  batch_number: string;
  product_model: number;
  model_name: string;
  weight_kg: number;
  roll_count: number;
}

type TabType = "kirim" | "chiqim";

export default function BichuvPage() {
  const [activeTab, setActiveTab] = useState<TabType>("kirim");

  /* ── Global data ── */
  const [fabrics, setFabrics] = useState<any[]>([]);
  const [kirimList, setKirimList] = useState<any[]>([]);
  const [chiqimList, setChiqimList] = useState<any[]>([]);
  const [availableForChiqim, setAvailableForChiqim] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const [fabricRes, kirimRes, chiqimRes, chiqimAvail] = await Promise.all([
        inventoryApi.fabricList(),
        inventoryApi.bichuvKirimList(),
        inventoryApi.bichuvChiqimList(),
        inventoryApi.bichuvKirimAvailableForChiqim(),
      ]);
      setFabrics(fabricRes.results ?? []);
      setKirimList(kirimRes.results ?? []);
      setChiqimList(chiqimRes.results ?? []);
      setAvailableForChiqim(chiqimAvail ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  /* ── KIRIM state ── */
  const [selectedFabricId, setSelectedFabricId] = useState<number | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<number | null>(null);
  const [fabricModels, setFabricModels] = useState<any[]>([]);
  const [kirimKg, setKirimKg] = useState("");
  const [kirimRollCount, setKirimRollCount] = useState(1);
  const [pendingItems, setPendingItems] = useState<PendingKirimItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [searchKirim, setSearchKirim] = useState("");

  const selectedFabric = fabrics.find((f) => f.id === selectedFabricId);

  // Load models when fabric selected
  useEffect(() => {
    if (selectedFabricId) {
      inventoryApi.fabricModels(selectedFabricId).then(setFabricModels).catch(() => setFabricModels([]));
    } else {
      setFabricModels([]);
    }
    setSelectedModelId(null);
  }, [selectedFabricId]);

  const handleAddKirimItem = () => {
    if (!selectedFabricId || !selectedModelId || !kirimKg) {
      alert("Partiya, Model va Kg kiritish majburiy!");
      return;
    }
    const model = fabricModels.find((m: any) => m.id === selectedModelId);
    const fabric = fabrics.find((f) => f.id === selectedFabricId);
    const item: PendingKirimItem = {
      fabric: selectedFabricId,
      batch_number: fabric?.batch_number ?? "",
      product_model: selectedModelId,
      model_name: model?.name ?? "",
      weight_kg: parseInt(kirimKg, 10) || 0,
      roll_count: kirimRollCount,
    };
    setPendingItems((prev) => [...prev, item]);
    setKirimKg("");
    setKirimRollCount(1);
  };

  const handleRemovePendingItem = (index: number) => {
    setPendingItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveKirim = async () => {
    if (pendingItems.length === 0) {
      alert("Hech narsa qo'shilmagan!");
      return;
    }
    try {
      setSaving(true);
      await inventoryApi.bichuvKirimBatchCreate(
        pendingItems.map((item) => ({
          fabric: item.fabric,
          product_model: item.product_model,
          weight_kg: item.weight_kg,
          roll_count: item.roll_count,
        }))
      );
      setPendingItems([]);
      setSelectedFabricId(null);
      setSelectedModelId(null);
      setKirimKg("");
      setKirimRollCount(1);
      await fetchAll();
    } catch (e: any) {
      const msg = e.data ? JSON.stringify(e.data) : e.message || "Xatolik";
      alert("Saqlashda xatolik: " + msg);
    } finally {
      setSaving(false);
    }
  };

  /* ── CHIQIM state ── */
  const [chiqimFabricId, setChiqimFabricId] = useState<number | null>(null);
  const [chiqimModelId, setChiqimModelId] = useState<number | null>(null);
  const [chiqimIshSoni, setChiqimIshSoni] = useState("");
  const [chiqimBekaKg, setChiqimBekaKg] = useState("");
  const [nextKesim, setNextKesim] = useState<number>(1);
  const [savingChiqim, setSavingChiqim] = useState(false);
  const [searchChiqim, setSearchChiqim] = useState("");

  // Tanlangan partiyaning kirimdan kelgan modellari
  const selectedChiqimEntry = availableForChiqim.find((e) => e.fabric_id === chiqimFabricId);
  const chiqimModels = selectedChiqimEntry?.models ?? [];

  useEffect(() => {
    setChiqimModelId(null);
    setNextKesim(1);
  }, [chiqimFabricId]);

  // Get next kesim when model selected
  useEffect(() => {
    if (chiqimFabricId && chiqimModelId) {
      inventoryApi
        .bichuvChiqimNextKesim(chiqimFabricId, chiqimModelId)
        .then((res) => setNextKesim(res.next_kesim))
        .catch(() => setNextKesim(1));
    }
  }, [chiqimFabricId, chiqimModelId]);

  const handleSaveChiqim = async () => {
    if (!chiqimFabricId || !chiqimModelId || !chiqimIshSoni) {
      alert("Partiya, Model va Ish soni majburiy!");
      return;
    }
    try {
      setSavingChiqim(true);
      await inventoryApi.bichuvChiqimCreate({
        fabric: chiqimFabricId,
        product_model: chiqimModelId,
        ish_soni: parseInt(chiqimIshSoni, 10) || 0,
        beka_kg: parseInt(chiqimBekaKg, 10) || 0,
      });
      setChiqimIshSoni("");
      setChiqimBekaKg("");
      await fetchAll();
      // Refresh kesim number
      if (chiqimFabricId && chiqimModelId) {
        const res = await inventoryApi.bichuvChiqimNextKesim(chiqimFabricId, chiqimModelId);
        setNextKesim(res.next_kesim);
      }
    } catch (e: any) {
      const msg = e.data ? JSON.stringify(e.data) : e.message || "Xatolik";
      alert("Saqlashda xatolik: " + msg);
    } finally {
      setSavingChiqim(false);
    }
  };

  const filteredKirimList = kirimList.filter((k) =>
    k.batch_number?.toLowerCase().includes(searchKirim.toLowerCase()) ||
    k.product_model_detail?.name?.toLowerCase().includes(searchKirim.toLowerCase())
  );

  const filteredChiqimList = chiqimList.filter((c) =>
    c.batch_number?.toLowerCase().includes(searchChiqim.toLowerCase()) ||
    c.product_model_detail?.name?.toLowerCase().includes(searchChiqim.toLowerCase())
  );

  return (
    <CRMLayout pageTitle="Bichuv bo'limi">
      <div className="p-4 lg:p-6 max-w-7xl mx-auto">

        {/* ── Tab Header ── */}
        <div className="flex items-center gap-1 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 mb-6 w-fit">
          <button
            onClick={() => setActiveTab("kirim")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
              activeTab === "kirim"
                ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-200"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            }`}
          >
            <ArrowDownToLine size={16} /> Bichuvga Kirim
          </button>
          <button
            onClick={() => setActiveTab("chiqim")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
              activeTab === "chiqim"
                ? "bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-lg shadow-orange-200"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            }`}
          >
            <ArrowUpFromLine size={16} /> Bichuvdan Chiqim
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <Loader2 className="animate-spin mr-2" /> Yuklanmoqda...
          </div>
        ) : activeTab === "kirim" ? (
          /* ═══════════════════════════════════════════
             KIRIM TAB
             ═══════════════════════════════════════════ */
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">

            {/* ── Left: Kirim Form ── */}
            <div className="xl:col-span-2">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-4">
                  <h2 className="text-white font-bold text-lg flex items-center gap-2">
                    <ArrowDownToLine size={20} /> Bichuvga Kirim
                  </h2>
                  <p className="text-emerald-100 text-xs mt-0.5">Skladdan bichuvga mahsulot qabul qilish</p>
                </div>

                <div className="p-5 space-y-4">
                  {/* Partiya tanlash */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      <Package size={14} className="inline mr-1 text-slate-400" />
                      Partiya raqami <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedFabricId ?? ""}
                      onChange={(e) =>
                        setSelectedFabricId(e.target.value ? Number(e.target.value) : null)
                      }
                      className="w-full p-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition"
                    >
                      <option value="">-- Partiya tanlang --</option>
                      {fabrics.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.batch_number} ({f.total_kg} kg, {f.roll_count} rulon)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Partiya tafsilotlari */}
                  {selectedFabric && (
                    <div className="bg-gradient-to-br from-slate-50 to-emerald-50/30 border border-slate-200 rounded-xl p-4 space-y-2">
                      <h3 className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                        <Eye size={14} className="text-emerald-500" />
                        Partiya tafsilotlari
                      </h3>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-white rounded-lg p-2.5 border border-slate-100">
                          <span className="text-slate-400 block">Partiya</span>
                          <span className="font-bold text-slate-700">{selectedFabric.batch_number}</span>
                        </div>
                        <div className="bg-white rounded-lg p-2.5 border border-slate-100">
                          <span className="text-slate-400 block">Jami kg</span>
                          <span className="font-bold text-emerald-600">{selectedFabric.total_kg} kg</span>
                        </div>
                        <div className="bg-white rounded-lg p-2.5 border border-slate-100">
                          <span className="text-slate-400 block">Rulonlar</span>
                          <span className="font-bold text-slate-700">{selectedFabric.roll_count} ta</span>
                        </div>
                        <div className="bg-white rounded-lg p-2.5 border border-slate-100">
                          <span className="text-slate-400 block">Qoldiq</span>
                          <span className="font-bold text-blue-600">{Math.floor(selectedFabric.available_kg)} kg</span>
                        </div>
                        {selectedFabric.supplier_weaver && (
                          <div className="bg-white rounded-lg p-2.5 border border-slate-100 col-span-2">
                            <span className="text-slate-400 block">To'quvchi</span>
                            <span className="font-bold text-slate-700">{selectedFabric.supplier_weaver}</span>
                          </div>
                        )}
                      </div>
                      {/* Biriktirilgan modellar */}
                      {selectedFabric.assigned_models_detail?.length > 0 && (
                        <div className="mt-2">
                          <span className="text-xs text-slate-400 block mb-1">Modellar:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedFabric.assigned_models_detail.map((m: any) => (
                              <span key={m.id} className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-md text-xs font-medium">
                                {m.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Model tanlash */}
                  {selectedFabricId && (
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                        <Layers size={14} className="inline mr-1 text-slate-400" />
                        Model nomi <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={selectedModelId ?? ""}
                        onChange={(e) =>
                          setSelectedModelId(e.target.value ? Number(e.target.value) : null)
                        }
                        className="w-full p-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition"
                      >
                        <option value="">-- Model tanlang --</option>
                        {fabricModels.map((m: any) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Kg va Rulon */}
                  {selectedModelId && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                          <Weight size={14} className="inline mr-1 text-slate-400" />
                          Kg <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={kirimKg}
                          onChange={(e) => setKirimKg(e.target.value)}
                          placeholder="Kg kiriting"
                          className="w-full p-2.5 border border-slate-300 rounded-xl text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                          <Hash size={14} className="inline mr-1 text-slate-400" />
                          Rulon soni
                        </label>
                        <div className="flex items-center gap-0">
                          <input
                            type="number"
                            min="1"
                            value={kirimRollCount}
                            onChange={(e) => setKirimRollCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                            className="flex-1 p-2.5 border border-slate-300 rounded-l-xl text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition text-center font-bold"
                          />
                          <div className="flex flex-col border border-l-0 border-slate-300 rounded-r-xl overflow-hidden">
                            <button
                              onClick={() => setKirimRollCount((p) => p + 1)}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition border-b border-slate-200"
                            >
                              <ChevronUp size={14} />
                            </button>
                            <button
                              onClick={() => setKirimRollCount((p) => Math.max(1, p - 1))}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition"
                            >
                              <ChevronDown size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Buttons: Qo'shish + Saqlash */}
                  {selectedModelId && (
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={handleAddKirimItem}
                        className="flex-1 flex items-center justify-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 py-2.5 rounded-xl font-bold text-sm transition active:scale-95"
                      >
                        <Plus size={16} /> Qo'shish
                      </button>
                      <button
                        onClick={handleSaveKirim}
                        disabled={saving || pendingItems.length === 0}
                        className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white py-2.5 rounded-xl font-bold text-sm transition shadow-lg shadow-emerald-200 disabled:opacity-50 active:scale-95"
                      >
                        {saving ? (
                          <><Loader2 size={16} className="animate-spin" /> Saqlanmoqda...</>
                        ) : (
                          <><Save size={16} /> Saqlash ({pendingItems.length})</>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* Pending items */}
                {pendingItems.length > 0 && (
                  <div className="border-t border-slate-100 px-5 py-4">
                    <h3 className="text-sm font-bold text-slate-600 mb-3 flex items-center gap-1.5">
                      <Layers size={14} className="text-emerald-500" />
                      Qo'shilganlar ({pendingItems.length})
                    </h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {pendingItems.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between bg-gradient-to-r from-emerald-50/60 to-teal-50/40 border border-emerald-100 rounded-xl px-3 py-2.5"
                        >
                          <div className="text-sm">
                            <span className="font-bold text-slate-700">{item.batch_number}</span>
                            <span className="text-slate-400 mx-1.5">→</span>
                            <span className="font-semibold text-emerald-700">{item.model_name}</span>
                            <span className="text-slate-400 mx-1.5">|</span>
                            <span className="text-slate-600">{item.weight_kg} kg</span>
                            <span className="text-slate-400 mx-1">·</span>
                            <span className="text-slate-600">{item.roll_count} rulon</span>
                          </div>
                          <button
                            onClick={() => handleRemovePendingItem(idx)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Right: Kirim List ── */}
            <div className="xl:col-span-3">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h2 className="font-bold text-slate-800 flex items-center gap-2">
                    <ArrowDownToLine size={18} className="text-emerald-500" />
                    Bichuvga kirim bo'lgan mahsulotlar
                  </h2>
                  <div className="relative w-56">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input
                      value={searchKirim}
                      onChange={(e) => setSearchKirim(e.target.value)}
                      placeholder="Qidirish..."
                      className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 text-xs focus:border-emerald-400 focus:ring-1 focus:ring-emerald-200"
                    />
                  </div>
                </div>

                {filteredKirimList.length === 0 ? (
                  <div className="flex items-center justify-center py-16 text-slate-400 text-sm">
                    Hali kirim yo'q
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">#</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Partiya</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Model</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Kg</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Rulon</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Sana</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredKirimList.map((item, idx) => (
                          <tr
                            key={item.id}
                            className="border-b border-slate-50 hover:bg-emerald-50/30 transition-colors"
                          >
                            <td className="px-4 py-3 text-slate-400 font-mono text-xs">{idx + 1}</td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold">
                                <Package size={12} />
                                {item.batch_number}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-semibold text-slate-700">
                              {item.product_model_detail?.name ?? "—"}
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-emerald-600">{item.weight_kg} kg</td>
                            <td className="px-4 py-3 text-right text-slate-600">{item.roll_count}</td>
                            <td className="px-4 py-3 text-right text-slate-400 text-xs">
                              {item.created_at ? new Date(item.created_at).toLocaleDateString("uz-UZ") : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* ═══════════════════════════════════════════
             CHIQIM TAB
             ═══════════════════════════════════════════ */
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">

            {/* ── Left: Chiqim Form ── */}
            <div className="xl:col-span-2">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-gradient-to-r from-orange-500 to-rose-500 px-5 py-4">
                  <h2 className="text-white font-bold text-lg flex items-center gap-2">
                    <ArrowUpFromLine size={20} /> Bichuvdan Chiqim
                  </h2>
                  <p className="text-orange-100 text-xs mt-0.5">Bichilgan mahsulot tikuvga chiqariladi</p>
                </div>

                <div className="p-5 space-y-4">
                  {/* Partiya tanlash */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      <Package size={14} className="inline mr-1 text-slate-400" />
                      Partiya raqami <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={chiqimFabricId ?? ""}
                      onChange={(e) =>
                        setChiqimFabricId(e.target.value ? Number(e.target.value) : null)
                      }
                      className="w-full p-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition"
                    >
                      <option value="">-- Bichuvga kirgan partiyalar --</option>
                      {availableForChiqim.map((entry) => (
                        <option key={entry.fabric_id} value={entry.fabric_id}>
                          {entry.batch_number} ({entry.total_kg} kg, {entry.total_rolls} rulon)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Model tanlash (faqat kirimda bor modellar) */}
                  {chiqimFabricId && chiqimModels.length > 0 && (
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                        <Layers size={14} className="inline mr-1 text-slate-400" />
                        Model nomi <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={chiqimModelId ?? ""}
                        onChange={(e) =>
                          setChiqimModelId(e.target.value ? Number(e.target.value) : null)
                        }
                        className="w-full p-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition"
                      >
                        <option value="">-- Model tanlang --</option>
                        {chiqimModels.map((m: any) => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.kirim_kg} kg, {m.kirim_rolls} rulon)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Kesim label */}
                  {chiqimModelId && (
                    <div className="bg-gradient-to-r from-orange-50 to-rose-50 border border-orange-200 rounded-xl px-4 py-3 flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                        <Scissors size={20} className="text-orange-600" />
                      </div>
                      <div>
                        <p className="text-xs text-orange-400 font-medium">Ushbu kesim:</p>
                        <p className="text-lg font-black text-orange-600">
                          {nextKesim}-kesim
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Ish soni va Beka */}
                  {chiqimModelId && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                          Ish soni <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={chiqimIshSoni}
                          onChange={(e) => setChiqimIshSoni(e.target.value)}
                          placeholder="Dona"
                          className="w-full p-2.5 border border-slate-300 rounded-xl text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                          Beka (kg)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={chiqimBekaKg}
                          onChange={(e) => setChiqimBekaKg(e.target.value)}
                          placeholder="Kg"
                          className="w-full p-2.5 border border-slate-300 rounded-xl text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition"
                        />
                      </div>
                    </div>
                  )}

                  {/* Save Button */}
                  {chiqimModelId && (
                    <button
                      onClick={handleSaveChiqim}
                      disabled={savingChiqim}
                      className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white py-3 rounded-xl font-bold text-sm transition shadow-lg shadow-orange-200 disabled:opacity-50 active:scale-95"
                    >
                      {savingChiqim ? (
                        <><Loader2 size={16} className="animate-spin" /> Saqlanmoqda...</>
                      ) : (
                        <><Save size={16} /> Saqlash</>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* ── Right: Chiqim List ── */}
            <div className="xl:col-span-3">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h2 className="font-bold text-slate-800 flex items-center gap-2">
                    <ArrowUpFromLine size={18} className="text-orange-500" />
                    Bichuvdan chiqim bo'lgan mahsulotlar
                  </h2>
                  <div className="relative w-56">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input
                      value={searchChiqim}
                      onChange={(e) => setSearchChiqim(e.target.value)}
                      placeholder="Qidirish..."
                      className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 text-xs focus:border-orange-400 focus:ring-1 focus:ring-orange-200"
                    />
                  </div>
                </div>

                {filteredChiqimList.length === 0 ? (
                  <div className="flex items-center justify-center py-16 text-slate-400 text-sm">
                    Hali chiqim yo'q
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">#</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Partiya</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Model</th>
                          <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Kesim</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Ish soni</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Beka (kg)</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Sana</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredChiqimList.map((item, idx) => (
                          <tr
                            key={item.id}
                            className="border-b border-slate-50 hover:bg-orange-50/30 transition-colors"
                          >
                            <td className="px-4 py-3 text-slate-400 font-mono text-xs">{idx + 1}</td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold">
                                <Package size={12} />
                                {item.batch_number}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-semibold text-slate-700">
                              {item.product_model_detail?.name ?? "—"}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange-100 text-orange-700 rounded-lg text-xs font-bold">
                                <Scissors size={12} />
                                {item.kesim_label ?? `${item.kesim_number}-kesim`}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-slate-700">{item.ish_soni}</td>
                            <td className="px-4 py-3 text-right font-bold text-amber-600">{item.beka_kg} kg</td>
                            <td className="px-4 py-3 text-right text-slate-400 text-xs">
                              {item.created_at ? new Date(item.created_at).toLocaleDateString("uz-UZ") : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </CRMLayout>
  );
}

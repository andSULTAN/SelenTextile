"use client";

import { useEffect, useState } from "react";
import CRMLayout from "@/components/layout/CRMLayout";
import { inventoryApi } from "@/lib/api";
import SkladSummary from "@/components/inventory/SkladSummary";
import SkladCard from "@/components/inventory/SkladCard";
import BrakModal from "@/components/inventory/BrakModal";
import {
  Plus, Search, Loader2, X,
  Image as ImageIcon, ChevronLeft, ChevronRight, Layers, Trash2,
  AlertTriangle,
} from "lucide-react";

interface ModelEntry {
  name: string;
  images: File[];
  previews: string[];
}
const emptyModel = (): ModelEntry => ({ name: "", images: [], previews: [] });

export default function FabricInventoryPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // modals
  const [kirimOpen, setKirimOpen] = useState(false);
  const [brakOpen, setBrakOpen] = useState(false);
  const [historyModal, setHistoryModal] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<any>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [sliderImages, setSliderImages] = useState<any[] | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  // kirim form
  const [form, setForm] = useState({
    supplier_weaver: "", supplier_dyer: "", batch_number: "",
    total_kg: "", roll_count: "", waste_kg: "0", waste_type: "",
  });
  const [models, setModels] = useState<ModelEntry[]>([emptyModel()]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);

  // ── fetch ──────────────────────────────────────
  const fetchFabric = async () => {
    try {
      const res = await inventoryApi.fabricList();
      setData(res.results ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFabric(); }, []);

  // ── summary ────────────────────────────────────
  const totalBatches = data.length;
  const totalKg = data.reduce((s, d) => s + (d.total_kg ?? 0), 0);
  const totalRolls = data.reduce((s, d) => s + (d.roll_count ?? 0), 0);
  const totalBrakKg = data.reduce((s, d) => s + Math.floor(d.total_brak_kg ?? d.waste_kg ?? 0), 0);

  // ── model helpers ──────────────────────────────
  const addModel = () => setModels(p => [...p, emptyModel()]);
  const removeModel = (mi: number) =>
    setModels(p => { p[mi].previews.forEach(URL.revokeObjectURL); return p.filter((_, i) => i !== mi); });
  const updateModelName = (mi: number, name: string) =>
    setModels(p => p.map((m, i) => i === mi ? { ...m, name } : m));
  const addModelImages = (mi: number, files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files);
    const newPreviews = newFiles.map(f => URL.createObjectURL(f));
    setModels(p => p.map((m, i) =>
      i === mi ? { ...m, images: [...m.images, ...newFiles], previews: [...m.previews, ...newPreviews] } : m
    ));
  };
  const removeModelImage = (mi: number, pi: number) =>
    setModels(p => p.map((m, i) => {
      if (i !== mi) return m;
      URL.revokeObjectURL(m.previews[pi]);
      return { ...m, images: m.images.filter((_, j) => j !== pi), previews: m.previews.filter((_, j) => j !== pi) };
    }));

  const resetForm = () => {
    setForm({ supplier_weaver: "", supplier_dyer: "", batch_number: "", total_kg: "", roll_count: "", waste_kg: "0", waste_type: "" });
    models.forEach(m => m.previews.forEach(URL.revokeObjectURL));
    setModels([emptyModel()]);
    setImageFile(null);
  };

  // ── create kirim ───────────────────────────────
  const handleCreate = async () => {
    if (!form.batch_number || !form.total_kg || !form.roll_count) {
      alert("Partiya raqami, kg va rulon soni majburiy!"); return;
    }
    try {
      setCreating(true);
      const fd = new FormData();
      fd.append("supplier_weaver", form.supplier_weaver);
      fd.append("supplier_dyer", form.supplier_dyer);
      fd.append("batch_number", form.batch_number);
      fd.append("total_kg", String(parseInt(form.total_kg, 10) || 0));
      fd.append("roll_count", String(parseInt(form.roll_count, 10) || 0));
      fd.append("waste_kg", String(parseInt(form.waste_kg, 10) || 0));
      if (form.waste_type) fd.append("waste_type", form.waste_type);
      if (imageFile) fd.append("fabric_image", imageFile);
      models.filter(m => m.name.trim()).forEach((m, i) => {
        fd.append("model_names", m.name.trim());
        m.images.forEach(f => fd.append(`model_images_${i}`, f));
      });
      await inventoryApi.fabricCreate(fd);
      setKirimOpen(false);
      resetForm();
      await fetchFabric();
    } catch (e: any) {
      const msg = e.data ? JSON.stringify(e.data) : (e.message || "Xatolik yuz berdi");
      alert("Saqlashda xatolik: " + msg);
    } finally {
      setCreating(false);
    }
  };

  // ── history ────────────────────────────────────
  const openHistory = async (batch: string) => {
    setHistoryModal(batch);
    setHistoryData(null);
    try { setHistoryData(await inventoryApi.fabricHistory(batch)); }
    catch { alert("Tarixni olib bo'lmadi"); }
  };

  const openSlider = (images: any[]) => { setSliderImages(images); setCurrentSlide(0); };

  const filtered = data.filter(d =>
    d.batch_number?.toLowerCase().includes(search.toLowerCase()) ||
    d.supplier_weaver?.toLowerCase().includes(search.toLowerCase())
  );

  // ── render ─────────────────────────────────────
  return (
    <CRMLayout>
      <div className="p-6">
        {/* Page title */}
        <h1 className="text-2xl font-bold text-slate-800 mb-5">Sklad — Gazlama Ombori</h1>

        {/* Summary cards */}
        {!loading && (
          <SkladSummary
            totalBatches={totalBatches}
            totalKg={totalKg}
            totalRolls={totalRolls}
            totalBrakKg={totalBrakKg}
          />
        )}

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Partiya raqami yoki to'quvchi..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-sm bg-white"
            />
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => setBrakOpen(true)}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition"
            >
              <AlertTriangle size={16} /> + Brak
            </button>
            <button
              onClick={() => setKirimOpen(true)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition"
            >
              <Plus size={16} /> Yangi Kirim
            </button>
          </div>
        </div>

        {/* Cards grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <Loader2 className="animate-spin mr-2" /> Yuklanmoqda...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center py-20 text-slate-400 text-sm">
            Ma'lumot topilmadi
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filtered.map(item => (
              <SkladCard
                key={item.id}
                item={item}
                onHistory={openHistory}
                onModelSlider={openSlider}
                onImagePreview={setPreviewImage}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Brak Modal ── */}
      {brakOpen && (
        <BrakModal
          fabrics={data}
          onClose={() => setBrakOpen(false)}
          onSaved={fetchFabric}
        />
      )}

      {/* ── Yangi Kirim Modal ── */}
      {kirimOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[92vh] flex flex-col">
            <div className="flex justify-between items-center px-6 pt-5 pb-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">Yangi gazlama kirimi</h2>
              <button onClick={() => { setKirimOpen(false); resetForm(); }} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto px-6 py-4 space-y-4 flex-1">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Partiya raqami <span className="text-red-500">*</span></label>
                <input value={form.batch_number} onChange={e => setForm({ ...form, batch_number: e.target.value })} placeholder="Masalan: P-2026-001" className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">To'quvchi</label>
                  <input value={form.supplier_weaver} onChange={e => setForm({ ...form, supplier_weaver: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Bo'yoqchi</label>
                  <input value={form.supplier_dyer} onChange={e => setForm({ ...form, supplier_dyer: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Jami (kg) <span className="text-red-500">*</span></label>
                  <input type="number" step="1" value={form.total_kg} onChange={e => setForm({ ...form, total_kg: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Rulon soni <span className="text-red-500">*</span></label>
                  <input type="number" step="1" value={form.roll_count} onChange={e => setForm({ ...form, roll_count: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mato rasmi</label>
                <label className="flex items-center gap-3 p-2.5 border border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition">
                  {imageFile
                    ? <img src={URL.createObjectURL(imageFile)} className="w-10 h-10 object-cover rounded-md border" />
                    : <div className="w-10 h-10 rounded-md bg-slate-100 flex items-center justify-center text-slate-400"><ImageIcon size={18} /></div>
                  }
                  <span className="text-sm text-slate-500">{imageFile ? imageFile.name : "Rasm tanlash..."}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={e => setImageFile(e.target.files?.[0] ?? null)} />
                </label>
              </div>

              {/* Modellar */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-slate-700">Modellar (bichuv uchun)</label>
                  <span className="text-xs text-slate-400">{models.filter(m => m.name.trim()).length} ta</span>
                </div>
                <div className="space-y-3">
                  {models.map((model, mi) => (
                    <div key={mi} className="border border-slate-200 rounded-xl p-3 bg-slate-50/60">
                      <div className="flex gap-2 items-center mb-2">
                        <div className="flex-1 relative">
                          <Layers size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            value={model.name}
                            onChange={e => updateModelName(mi, e.target.value)}
                            placeholder={`Model nomi (masalan: Futbolka ${mi + 1})`}
                            className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 bg-white"
                          />
                        </div>
                        {models.length > 1 && (
                          <button onClick={() => removeModel(mi)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 items-center">
                        {model.previews.map((prev, pi) => (
                          <div key={pi} className="relative group">
                            <img src={prev} className="w-14 h-14 object-cover rounded-lg border border-slate-200" />
                            <button onClick={() => removeModelImage(mi, pi)} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow">
                              <X size={10} />
                            </button>
                          </div>
                        ))}
                        <label className="w-14 h-14 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition text-slate-400">
                          <Plus size={16} />
                          <span className="text-[10px] mt-0.5">Rasm</span>
                          <input type="file" accept="image/*" multiple className="hidden" onChange={e => addModelImages(mi, e.target.files)} />
                        </label>
                      </div>
                      {model.images.length > 0 && <p className="text-xs text-indigo-500 mt-1.5">{model.images.length} ta rasm</p>}
                    </div>
                  ))}
                </div>
                <button onClick={addModel} className="mt-2 w-full py-2.5 border-2 border-dashed border-slate-300 rounded-xl text-sm text-slate-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/40 transition flex items-center justify-center gap-1.5 font-medium">
                  <Plus size={15} /> Model qo'shish
                </button>
              </div>
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
              <button onClick={() => { setKirimOpen(false); resetForm(); }} className="flex-1 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 font-semibold text-sm transition">
                Bekor qilish
              </button>
              <button disabled={creating} onClick={handleCreate} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-semibold text-sm flex justify-center items-center gap-2 transition disabled:opacity-60">
                {creating ? <><Loader2 size={16} className="animate-spin" /> Saqlanmoqda...</> : "Saqlash"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Tarix Modal ── */}
      {historyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Tarix: {historyModal}</h2>
              <button onClick={() => setHistoryModal(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            {!historyData ? (
              <div className="flex items-center justify-center py-8 text-slate-400">
                <Loader2 className="animate-spin mr-2" size={18} /> Yuklanmoqda...
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Jami kelgan", value: `${historyData.total_kg} kg`, color: "text-slate-800" },
                    { label: "Qoldiq", value: `${Math.floor(historyData.available_kg)} kg`, color: "text-emerald-600" },
                    { label: "Isrof/Brak", value: `${historyData.waste_kg} kg`, color: "text-red-500" },
                  ].map(s => (
                    <div key={s.label} className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                      <p className="text-xs text-slate-500 mb-1">{s.label}</p>
                      <p className={`font-bold text-lg ${s.color}`}>{s.value}</p>
                    </div>
                  ))}
                </div>
                <div>
                  <h3 className="font-semibold mb-2 text-sm">Bichuv tarixi</h3>
                  {historyData.history.length === 0 ? (
                    <p className="text-slate-400 text-sm">Hali bichuvga berilmagan.</p>
                  ) : (
                    <table className="w-full text-sm text-left border rounded-lg overflow-hidden">
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="p-2 font-medium">Sana</th>
                          <th className="p-2 font-medium">Olingan kg</th>
                          <th className="p-2 font-medium">Model</th>
                        </tr>
                      </thead>
                      <tbody>
                        {historyData.history.map((h: any, i: number) => (
                          <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                            <td className="p-2 text-slate-500">{new Date(h.date).toLocaleDateString("uz-UZ")}</td>
                            <td className="p-2 font-bold text-indigo-600">−{h.kg} kg</td>
                            <td className="p-2">{h.model || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Image preview ── */}
      {previewImage && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm" onClick={() => setPreviewImage(null)}>
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl">
            <button onClick={e => { e.stopPropagation(); setPreviewImage(null); }} className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition">
              <X size={20} />
            </button>
            <img src={previewImage} alt="Mato rasmi" className="w-full h-auto object-contain max-h-[85vh]" onClick={e => e.stopPropagation()} />
          </div>
        </div>
      )}

      {/* ── Model Slider ── */}
      {sliderImages && sliderImages.length > 0 && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md" onClick={() => setSliderImages(null)}>
          <div className="relative max-w-4xl w-full h-[85vh] flex flex-col items-center justify-center">
            <button onClick={e => { e.stopPropagation(); setSliderImages(null); }} className="absolute top-4 right-4 z-10 p-2 bg-black/50 text-white rounded-full hover:bg-black/70">
              <X size={20} />
            </button>
            <img src={sliderImages[currentSlide].image} className="w-auto max-h-full object-contain rounded-lg shadow-2xl" onClick={e => e.stopPropagation()} />
            {sliderImages.length > 1 && (
              <>
                <button onClick={e => { e.stopPropagation(); setCurrentSlide(p => p === 0 ? sliderImages.length - 1 : p - 1); }} className="absolute left-4 p-3 bg-black/50 text-white rounded-full hover:bg-black/70 hover:scale-110 transition">
                  <ChevronLeft size={24} />
                </button>
                <button onClick={e => { e.stopPropagation(); setCurrentSlide(p => p === sliderImages.length - 1 ? 0 : p + 1); }} className="absolute right-4 p-3 bg-black/50 text-white rounded-full hover:bg-black/70 hover:scale-110 transition">
                  <ChevronRight size={24} />
                </button>
                <div className="absolute bottom-4 flex gap-2">
                  {sliderImages.map((_, i) => (
                    <button key={i} onClick={e => { e.stopPropagation(); setCurrentSlide(i); }}
                      className={`rounded-full transition-all duration-200 ${i === currentSlide ? "w-4 h-2 bg-white" : "w-2 h-2 bg-white/40 hover:bg-white/60"}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </CRMLayout>
  );
}

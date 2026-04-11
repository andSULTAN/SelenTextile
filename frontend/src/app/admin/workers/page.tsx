"use client";

import { useEffect, useState, useCallback } from "react";
import CRMLayout from "@/components/layout/CRMLayout";
import { workersApi, type Worker, ApiError } from "@/lib/api";
import {
  Search, UserPlus, Pencil, X, Check,
  Loader2, Users, ChevronDown, Trash2,
  AlertTriangle,
} from "lucide-react";

/* ── Rollar ro'yxati ── */
const ROLES = [
  { value: "", label: "Barcha lavozimlar" },
  { value: "tikuvchi",  label: "Tikuvchi" },
  { value: "bichuvchi", label: "Bichuvchi" },
  { value: "qadoqchi",  label: "Qadoqchi" },
  { value: "dazmolchi", label: "Dazmolchi" },
  { value: "boshqa",    label: "Boshqa" },
];

/* ── Holatlar ── */
const STATUSES = [
  { value: "",       label: "Barcha holatlar" },
  { value: "active",   label: "Faol" },
  { value: "inactive", label: "Nofaol" },
  { value: "on_leave", label: "Ta'tilda" },
];

/* ── Bo'sh forma ── */
const emptyForm = {
  code: "",
  first_name: "",
  last_name: "",
  phone: "",
  role: "boshqa",
  status: "active",
};

type FormData = typeof emptyForm;

/* ──────────────────────────────────────────────────── */

export default function WorkersAdminPage() {
  const [workers, setWorkers]       = useState<Worker[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);

  /* Filtrlar */
  const [search, setSearch]         = useState("");
  const [filterActive, setFilterActive] = useState<"" | "true" | "false">("");
  const [filterRole, setFilterRole] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  /* Toggle loading per-row */
  const [togglingId, setTogglingId] = useState<number | null>(null);

  /* Modal */
  const [modalOpen, setModalOpen]   = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [form, setForm]             = useState<FormData>(emptyForm);
  const [saving, setSaving]         = useState(false);
  const [formError, setFormError]   = useState<string | null>(null);
  const [codeExists, setCodeExists] = useState(false);
  const [checkingCode, setCheckingCode] = useState(false);

  /* Delete Confirmation */
  const [deletingWorker, setDeletingWorker] = useState<Worker | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  /* ── Fetch ── */
  const fetchWorkers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (search)        params.search    = search;
      if (filterActive)  params.is_active = filterActive;
      if (filterRole)    params.role      = filterRole;
      if (filterStatus)  params.status    = filterStatus;
      const res = await workersApi.list(Object.keys(params).length ? params : undefined);
      setWorkers(res.results);
    } catch {
      setError("Ishchilarni yuklashda xatolik yuz berdi.");
    } finally {
      setLoading(false);
    }
  }, [search, filterActive, filterRole, filterStatus]);

  useEffect(() => {
    const t = setTimeout(fetchWorkers, search ? 350 : 0);
    return () => clearTimeout(t);
  }, [fetchWorkers]);

  /* ── Toggle is_active ── */
  const handleToggle = async (worker: Worker) => {
    setTogglingId(worker.id);
    try {
      const res = await workersApi.toggleActive(worker.id);
      setWorkers(prev =>
        [...prev]
          .map(w => w.id === worker.id ? { ...w, is_active: res.is_active } : w)
          .sort((a, b) => {
            if (a.is_active === b.is_active) {
              return a.last_name.localeCompare(b.last_name);
            }
            return a.is_active ? -1 : 1;
          })
      );
    } catch {
      /* silent — foydalanuvchi ko'radi */
    } finally {
      setTogglingId(null);
    }
  };

  /* ── Modal ochish ── */
  const openCreate = () => {
    setEditingWorker(null);
    setForm(emptyForm);
    setFormError(null);
    setCodeExists(false);
    setModalOpen(true);
  };

  const openEdit = (worker: Worker) => {
    setEditingWorker(worker);
    setForm({
      code:        worker.code,
      first_name:  worker.first_name,
      last_name:   worker.last_name,
      phone:       worker.phone,
      role:        worker.role,
      status:      worker.status,
    });
    setFormError(null);
    setModalOpen(true);
  };

  /* ── Code Check ── */
  useEffect(() => {
    if (!modalOpen || !form.code || checkingCode) return;
    
    // Tahrir qilinayotgan ishchining o'z kodi bo'lsa tekshirmaymiz
    if (editingWorker && form.code === editingWorker.code) {
      setCodeExists(false);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingCode(true);
      try {
        const res = await workersApi.list({ search: form.code });
        // Agar qidiruvda aynan shu kodli ishchi topilsa
        const exists = res.results.some(w => w.code.toLowerCase() === form.code.toLowerCase());
        setCodeExists(exists);
      } catch (err) {
        console.error("Code check error:", err);
      } finally {
        setCheckingCode(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [form.code, modalOpen, editingWorker]);

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
  };

  /* ── Saqlash ── */
  const handleSave = async () => {
    if (!form.code.trim() || !form.first_name.trim() || !form.last_name.trim()) {
      setFormError("Kod, ism va familiya kiritilishi shart.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      if (editingWorker) {
        const updated = await workersApi.update(editingWorker.id, form);
        setWorkers(prev => prev.map(w => w.id === updated.id ? updated : w));
      } else {
        const created = await workersApi.create(form);
        setWorkers(prev => [created, ...prev]);
      }
      setModalOpen(false);
    } catch (err) {
      if (err instanceof ApiError) {
        const msg = Object.values(err.data).flat().join(" ");
        setFormError(msg || "Xatolik yuz berdi.");
      } else {
        setFormError("Serverga ulanishda xatolik.");
      }
    } finally {
      setSaving(false);
    }
  };

  /* ── O'chirish ── */
  const openDelete = (worker: Worker) => {
    setDeletingWorker(worker);
    setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingWorker) return;
    setDeleting(true);
    try {
      await workersApi.delete(deletingWorker.id);
      setWorkers(prev => prev.filter(w => w.id !== deletingWorker.id));
      setDeleteModalOpen(false);
    } catch {
      alert("Xatolik: Ishchini o'chira olmadik (ehtimol uning ish loglari mavjud).");
    } finally {
      setDeleting(false);
    }
  };

  /* ── Statistika ── */
  const activeCount   = workers.filter(w => w.is_active).length;
  const inactiveCount = workers.length - activeCount;

  /* ──────────────────────────────────────── */
  return (
    <CRMLayout pageTitle="Ishchilar">

      {/* ── STAT CARDS ── */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Jami ishchilar",  value: workers.length, color: "bg-indigo-50 text-indigo-600 border-indigo-100" },
          { label: "Faol",            value: activeCount,    color: "bg-emerald-50 text-emerald-600 border-emerald-100" },
          { label: "Nofaol / Ta'til", value: inactiveCount,  color: "bg-amber-50 text-amber-600 border-amber-100" },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border px-5 py-4 flex items-center gap-4 ${s.color}`}>
            <Users size={20} className="opacity-70 shrink-0" />
            <div>
              <p className="text-2xl font-black leading-none">{s.value}</p>
              <p className="text-xs font-semibold opacity-70 mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── TOOLBAR ── */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm px-4 py-3 mb-4 flex flex-wrap items-center gap-3">

        {/* Qidiruv */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 flex-1 min-w-[180px]">
          <Search size={16} className="text-slate-400 shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Ism, familiya yoki kod..."
            className="bg-transparent text-sm text-slate-700 placeholder-slate-400 outline-none w-full"
          />
          {search && (
            <button onClick={() => setSearch("")} className="text-slate-400 hover:text-slate-600">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Faollik filtri */}
        <div className="relative flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 cursor-pointer">
          <select
            value={filterActive}
            onChange={e => setFilterActive(e.target.value as "" | "true" | "false")}
            className="bg-transparent text-sm font-medium text-slate-700 outline-none appearance-none pr-5 cursor-pointer"
          >
            <option value="">Barcha</option>
            <option value="true">Faol</option>
            <option value="false">Nofaol</option>
          </select>
          <ChevronDown size={14} className="text-slate-400 absolute right-2 pointer-events-none" />
        </div>

        {/* Lavozim filtri */}
        <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
          <select
            value={filterRole}
            onChange={e => setFilterRole(e.target.value)}
            className="bg-transparent text-sm font-medium text-slate-700 outline-none appearance-none pr-5 cursor-pointer"
          >
            {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          <ChevronDown size={14} className="text-slate-400 absolute right-2 pointer-events-none" />
        </div>

        {/* Holat filtri */}
        <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="bg-transparent text-sm font-medium text-slate-700 outline-none appearance-none pr-5 cursor-pointer"
          >
            {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <ChevronDown size={14} className="text-slate-400 absolute right-2 pointer-events-none" />
        </div>

        {/* Yangi ishchi */}
        <button
          onClick={openCreate}
          className="ml-auto flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-4 py-2 rounded-lg shadow-sm transition-colors"
        >
          <UserPlus size={16} /> Yangi ishchi
        </button>
      </div>

      {/* ── JADVAL ── */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="px-5 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Kod</th>
                <th className="px-5 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">F.I.SH.</th>
                <th className="px-5 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Lavozim</th>
                <th className="px-5 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Telefon</th>
                <th className="px-5 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Ish holati</th>
                <th className="px-5 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Faollik</th>
                <th className="px-5 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    <Loader2 size={24} className="animate-spin inline-block mr-2" />
                    Yuklanmoqda...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-red-500 font-medium">{error}</td>
                </tr>
              ) : workers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    <Users size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="font-medium">Ishchi topilmadi</p>
                  </td>
                </tr>
              ) : (
                workers.map(worker => (
                  <tr
                    key={worker.id}
                    className={`transition-colors hover:bg-slate-50/70 ${!worker.is_active ? "opacity-55" : ""}`}
                  >
                    {/* Kod */}
                    <td className="px-5 py-4">
                      <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md">
                        {worker.code}
                      </span>
                    </td>

                    {/* FISH */}
                    <td className="px-5 py-4">
                      <button
                        onClick={() => openEdit(worker)}
                        className="flex items-center gap-3 group text-left"
                      >
                        {/* Avatar */}
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 overflow-hidden group-hover:ring-2 group-hover:ring-indigo-300 transition-all">
                          {worker.photo ? (
                            <img src={worker.photo} alt={worker.full_name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-indigo-600 text-xs font-bold">
                              {worker.last_name[0]}{worker.first_name[0]}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors uppercase decoration-indigo-300 decoration-dotted underline-offset-4 hover:underline">
                            {worker.full_name}
                          </p>
                        </div>
                      </button>
                    </td>

                    {/* Lavozim */}
                    <td className="px-5 py-4">
                      <span className="text-sm text-slate-600 capitalize">{worker.role_display || worker.role}</span>
                    </td>

                    {/* Telefon */}
                    <td className="px-5 py-4">
                      <span className="text-sm text-slate-500">{worker.phone || "—"}</span>
                    </td>

                    {/* Ish holati */}
                    <td className="px-5 py-4 text-center">
                      <StatusBadge status={worker.status} label={worker.status_display} />
                    </td>

                    {/* Faollik toggle */}
                    <td className="px-5 py-4 text-center">
                      <button
                        onClick={() => handleToggle(worker)}
                        disabled={togglingId === worker.id}
                        className="relative inline-flex items-center"
                        title={worker.is_active ? "Nofaol qilish" : "Faollashtirish"}
                      >
                        {togglingId === worker.id ? (
                          <Loader2 size={18} className="animate-spin text-slate-400" />
                        ) : (
                          <ToggleSwitch active={worker.is_active} />
                        )}
                      </button>
                    </td>

                    {/* Amallar */}
                    <td className="px-5 py-4 text-center">
                      <button
                        onClick={() => openDelete(worker)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:text-white hover:bg-red-500 px-3 py-1.5 rounded-lg border border-red-100 hover:border-red-500 transition-all opacity-0 group-hover:opacity-100"
                        title="Ishchini o'chirish"
                      >
                        <Trash2 size={13} /> O'chirish
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        {!loading && workers.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50">
            <p className="text-xs text-slate-400 font-medium">
              Jami <span className="text-slate-600 font-bold">{workers.length}</span> ta ishchi ko'rsatilmoqda
            </p>
          </div>
        )}
      </div>

      {/* ── MODAL ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={closeModal}
          />

          {/* Panel */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-800">
                {editingWorker ? "Ishchini tahrirlash" : "Yangi ishchi qo'shish"}
              </h2>
              <button
                onClick={closeModal}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4">

              <div className="space-y-1">
                <FormField
                  label="Ishchi kodi *"
                  value={form.code}
                  placeholder="Masalan: W-001"
                  onChange={v => setForm(f => ({ ...f, code: v }))}
                />
                {checkingCode && <p className="text-[10px] text-slate-400">Tekshirilmoqda...</p>}
                {codeExists && !checkingCode && (
                  <p className="text-[10px] text-amber-600 font-medium">⚠️ Bu kod bazada allaqachon mavjud!</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="Familiya *" value={form.last_name}
                  onChange={v => setForm(f => ({ ...f, last_name: v }))} />
                <FormField label="Ism *" value={form.first_name}
                  onChange={v => setForm(f => ({ ...f, first_name: v }))} />
              </div>

              <FormField label="Telefon" value={form.phone} placeholder="+998 90 123 45 67"
                onChange={v => setForm(f => ({ ...f, phone: v }))} />

              <div className="grid grid-cols-2 gap-3">
                <SelectField
                  label="Lavozim"
                  value={form.role}
                  onChange={v => setForm(f => ({ ...f, role: v }))}
                  options={ROLES.filter(r => r.value)}
                />
                <SelectField
                  label="Ish holati"
                  value={form.status}
                  onChange={v => setForm(f => ({ ...f, status: v }))}
                  options={STATUSES.filter(s => s.value)}
                />
              </div>

              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2.5 rounded-lg">
                  {formError}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
              <button
                onClick={closeModal}
                disabled={saving}
                className="flex-1 py-2.5 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Bekor qilish
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                {saving
                  ? <><Loader2 size={16} className="animate-spin" /> Saqlanmoqda...</>
                  : <><Check size={16} /> Saqlash</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE MODAL ── */}
      {deleteModalOpen && deletingWorker && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !deleting && setDeleteModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="text-red-500" size={32} />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Ishchini o'chirish?</h3>
              <p className="text-sm text-slate-500 mb-6">
                <span className="font-bold text-slate-700">{deletingWorker.full_name}</span> ma'lumotlarini arxivga o'tkazmoqchimisiz? 
                Uning kirim-chiqim tarixi saqlab qolinadi.
              </p>
              
              <div className="flex gap-3">
                <button
                  disabled={deleting}
                  onClick={() => setDeleteModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Bekor qilish
                </button>
                <button
                  disabled={deleting}
                  onClick={handleDelete}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold shadow-sm transition-colors flex items-center justify-center gap-2"
                >
                  {deleting ? <Loader2 size={16} className="animate-spin" /> : "Ha, o'chirish"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </CRMLayout>
  );
}

/* ── Kichik komponentlar ── */

function ToggleSwitch({ active }: { active: boolean }) {
  return (
    <div className={`w-10 h-5.5 rounded-full flex items-center px-0.5 transition-all duration-200 ${active ? "bg-emerald-500" : "bg-slate-300"}`}>
      <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${active ? "translate-x-[18px]" : "translate-x-0"}`} />
    </div>
  );
}

function StatusBadge({ status, label }: { status: string; label?: string }) {
  const map: Record<string, string> = {
    active:   "bg-emerald-50 text-emerald-600 border-emerald-200",
    inactive: "bg-slate-100 text-slate-500 border-slate-200",
    on_leave: "bg-amber-50 text-amber-600 border-amber-200",
  };
  const cls = map[status] ?? "bg-slate-100 text-slate-500 border-slate-200";
  return (
    <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full border ${cls}`}>
      {label || status}
    </span>
  );
}

function FormField({
  label, value, onChange, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 mb-1.5">{label}</label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
      />
    </div>
  );
}

function SelectField({
  label, value, onChange, options,
}: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 mb-1.5">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import CRMLayout from "@/components/layout/CRMLayout";
import { workersApi, usersApi, type Worker, type SystemUser, ApiError } from "@/lib/api";
import {
  Search, UserPlus, X, Check,
  Loader2, Users, ChevronDown, Trash2,
  AlertTriangle, Eye, EyeOff, RefreshCw, Shield, Pencil,
} from "lucide-react";

// ── Constants ──────────────────────────────────────────────────────────────
const ROLES = [
  { value: "",         label: "Barcha lavozimlar" },
  { value: "tikuvchi",  label: "Tikuvchi" },
  { value: "bichuvchi", label: "Bichuvchi" },
  { value: "qadoqchi",  label: "Qadoqchi" },
  { value: "dazmolchi", label: "Dazmolchi" },
  { value: "boshqa",    label: "Boshqa" },
];

const STATUSES = [
  { value: "",         label: "Barcha holatlar" },
  { value: "active",   label: "Faol" },
  { value: "inactive", label: "Nofaol" },
  { value: "on_leave", label: "Ta'tilda" },
];

const SYS_ROLES = [
  { value: "manager", label: "Menejer" },
  { value: "cutter",  label: "Bichuvchi" },
  { value: "packer",  label: "Qadoqchi" },
  { value: "admin",   label: "Admin" },
  { value: "tv",      label: "TV Monitor" },
];

const PERMISSION_GROUPS = [
  {
    label: "Dashboard",
    perms: [{ code: "view_dashboard", label: "Dashboard ko'rish" }],
  },
  {
    label: "Ish va Sklad",
    perms: [
      { code: "add_worklog",  label: "Ish kiritish" },
      { code: "edit_worklog", label: "Ish tahrirlash (30 daqiqa)" },
      { code: "view_sklad",    label: "Sklad ko'rish" },
      { code: "add_sklad",     label: "Sklad kirim" },
      { code: "add_brak",      label: "Brak qo'shish" },
      { code: "view_bichuv",   label: "Bichuv ko'rish" },
      { code: "add_bichuv",    label: "Bichuvga kirim/chiqim" },
      { code: "view_upakovka", label: "Upakovka ko'rish" },
      { code: "add_upakovka",  label: "Upakovka kiritish" },
    ]
  },
  {
    label: "Tizim va Xodimlar",
    perms: [
      { code: "view_workers",  label: "Ishchilar ro'yxati" },
      { code: "add_worker",    label: "Ishchi qo'shish" },
      { code: "edit_worker",   label: "Ishchi tahrirlash" },
      { code: "delete_worker", label: "Ishchi o'chirish" },
      { code: "view_payroll",  label: "Oyliklarni ko'rish" },
      { code: "manage_payroll",label: "Oylik boshqarish" },
      { code: "add_avans",     label: "Avans berish" },
    ]
  },
  {
    label: "Hisobotlar",
    perms: [
      { code: "view_reports",   label: "Hisobotlar ko'rish" },
      { code: "export_reports", label: "Excel/PDF export" },
    ]
  }
];

const ALL_PERMS = PERMISSION_GROUPS.flatMap(g => g.perms.map(p => p.code));

const DEFAULT_ROLE_PERMS: Record<string, string[]> = {
  admin:   ALL_PERMS,
  manager: [
    "view_dashboard", "view_workers", "add_worklog", "edit_worklog",
    "view_sklad", "view_bichuv", "view_upakovka", "add_avans", "view_reports",
  ],
  cutter:  ["view_bichuv", "add_bichuv"],
  packer:  ["view_upakovka", "add_upakovka"],
  tv:      ["view_dashboard"],
};

const emptyWorkerForm = {
  code: "", first_name: "", last_name: "", middle_name: "", phone: "", role: "boshqa", status: "active",
};

const emptyUserForm = {
  first_name: "", last_name: "", middle_name: "", phone: "",
  role: "manager", username: "", password: "", confirmPassword: "",
  pin: "",
  permissions: [] as string[],
};

// ── Uzbek → Latin transliteration for username suggest ────────────────────
function toLatinSlug(s: string) {
  const map: Record<string, string> = {
    а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"yo",ж:"j",з:"z",и:"i",й:"y",к:"k",
    л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",х:"kh",ц:"ts",
    ч:"ch",ш:"sh",щ:"sh",ъ:"",ы:"i",ь:"",э:"e",ю:"yu",я:"ya",
    ă:"a",ŏ:"o",ğ:"g",ş:"sh",ç:"ch",
  };
  return s.toLowerCase().split("").map(c => map[c] ?? c).join("").replace(/[^a-z0-9]/g, "");
}

function suggestUsername(firstName: string, lastName: string) {
  const ln = toLatinSlug(lastName);
  const fn = toLatinSlug(firstName);
  if (!ln && !fn) return "";
  return `${ln}${fn ? "_" + fn[0] : ""}`;
}

// ──────────────────────────────────────────────────────────────────────────

export default function WorkersAdminPage() {
  // ── Tab ──────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"workers" | "users">("workers");

  // ════════════════════════════════
  // WORKERS TAB state
  // ════════════════════════════════
  const [workers, setWorkers]     = useState<Worker[]>([]);
  const [wLoading, setWLoading]   = useState(true);
  const [wError, setWError]       = useState<string | null>(null);
  const [search, setSearch]       = useState("");
  const [filterActive, setFilterActive] = useState<"" | "true" | "false">("");
  const [filterRole, setFilterRole]     = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [togglingId, setTogglingId]     = useState<number | null>(null);
  const [wModalOpen, setWModalOpen]     = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [wForm, setWForm]         = useState(emptyWorkerForm);
  const [wSaving, setWSaving]     = useState(false);
  const [wFormErr, setWFormErr]   = useState<string | null>(null);
  const [codeExists, setCodeExists]       = useState(false);
  const [checkingCode, setCheckingCode]   = useState(false);
  const [deletingWorker, setDeletingWorker] = useState<Worker | null>(null);
  const [wDeleteOpen, setWDeleteOpen]     = useState(false);
  const [wDeleting, setWDeleting]         = useState(false);

  // ════════════════════════════════
  // USERS TAB state
  // ════════════════════════════════
  const [sysUsers, setSysUsers]   = useState<SystemUser[]>([]);
  const [uLoading, setULoading]   = useState(false);
  const [uModalOpen, setUModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [uForm, setUForm]         = useState(emptyUserForm);
  const [uSaving, setUSaving]     = useState(false);
  const [uFormErr, setUFormErr]   = useState<string | null>(null);
  const [showPass, setShowPass]   = useState(false);
  const [uModalStep, setUModalStep] = useState(1); // 1 | 2 | 3
  const [uDeletingId, setUDeletingId] = useState<number | null>(null);

  // ── Workers fetch ────────────────────────────────────────────────────────
  const fetchWorkers = useCallback(async () => {
    setWLoading(true); setWError(null);
    try {
      const params: Record<string, string> = {};
      if (search)       params.search    = search;
      if (filterActive) params.is_active = filterActive;
      if (filterRole)   params.role      = filterRole;
      if (filterStatus) params.status    = filterStatus;
      const res = await workersApi.list(Object.keys(params).length ? params : undefined);
      setWorkers(res.results);
    } catch { setWError("Ishchilarni yuklashda xatolik."); }
    finally { setWLoading(false); }
  }, [search, filterActive, filterRole, filterStatus]);

  useEffect(() => {
    const t = setTimeout(fetchWorkers, search ? 350 : 0);
    return () => clearTimeout(t);
  }, [fetchWorkers]);

  // ── System users fetch ───────────────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    setULoading(true);
    try {
      const res = await usersApi.list();
      setSysUsers(res.results);
    } catch { /* silent */ }
    finally { setULoading(false); }
  }, []);

  useEffect(() => {
    if (activeTab === "users") fetchUsers();
  }, [activeTab, fetchUsers]);

  // ── Worker toggle ────────────────────────────────────────────────────────
  const handleToggle = async (worker: Worker) => {
    setTogglingId(worker.id);
    try {
      const res = await workersApi.toggleActive(worker.id);
      setWorkers(prev =>
        [...prev]
          .map(w => w.id === worker.id ? { ...w, is_active: res.is_active } : w)
          .sort((a, b) => {
            if (a.is_active === b.is_active) return a.last_name.localeCompare(b.last_name);
            return a.is_active ? -1 : 1;
          })
      );
    } catch { /* silent */ }
    finally { setTogglingId(null); }
  };

  // ── Worker modal ─────────────────────────────────────────────────────────
  const openWorkerCreate = () => {
    setEditingWorker(null); setWForm(emptyWorkerForm);
    setWFormErr(null); setCodeExists(false); setWModalOpen(true);
  };
  const openWorkerEdit = (w: Worker) => {
    setEditingWorker(w);
    setWForm({ code: w.code, first_name: w.first_name, last_name: w.last_name,
               middle_name: w.middle_name ?? "", phone: w.phone, role: w.role, status: w.status });
    setWFormErr(null); setWModalOpen(true);
  };

  useEffect(() => {
    if (!wModalOpen || !wForm.code) return;
    if (editingWorker && wForm.code === editingWorker.code) { setCodeExists(false); return; }
    const t = setTimeout(async () => {
      setCheckingCode(true);
      try {
        const res = await workersApi.list({ search: wForm.code });
        setCodeExists(res.results.some(w => w.code.toLowerCase() === wForm.code.toLowerCase()));
      } catch { /* silent */ }
      finally { setCheckingCode(false); }
    }, 500);
    return () => clearTimeout(t);
  }, [wForm.code, wModalOpen, editingWorker]);

  const handleWorkerSave = async () => {
    if (!wForm.code.trim() || !wForm.first_name.trim() || !wForm.last_name.trim()) {
      setWFormErr("Kod, ism va familiya kiritilishi shart."); return;
    }
    setWSaving(true); setWFormErr(null);
    try {
      if (editingWorker) {
        const u = await workersApi.update(editingWorker.id, wForm);
        setWorkers(prev => prev.map(w => w.id === u.id ? u : w));
      } else {
        const c = await workersApi.create(wForm);
        setWorkers(prev => [c, ...prev]);
      }
      setWModalOpen(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setWFormErr(Object.values(err.data).flat().join(" ") || "Xatolik yuz berdi.");
      } else { setWFormErr("Serverga ulanishda xatolik."); }
    } finally { setWSaving(false); }
  };

  const handleWorkerDelete = async () => {
    if (!deletingWorker) return;
    setWDeleting(true);
    try {
      await workersApi.delete(deletingWorker.id);
      setWorkers(prev => prev.filter(w => w.id !== deletingWorker.id));
      setWDeleteOpen(false);
    } catch { alert("Xatolik: Ishchini o'chira olmadik."); }
    finally { setWDeleting(false); }
  };

  // ── User modal ───────────────────────────────────────────────────────────
  const openUserCreate = () => {
    setEditingUser(null);
    setUForm({ ...emptyUserForm, permissions: DEFAULT_ROLE_PERMS["manager"] || [] });
    setUFormErr(null); setUModalStep(1); setShowPass(false);
    setUModalOpen(true);
  };

  const openUserEdit = (u: SystemUser, initialStep = 1) => {
    setEditingUser(u);
    setUForm({
      first_name: u.first_name, last_name: u.last_name, middle_name: "",
      phone: u.phone, role: u.role, username: u.username,
      password: "", confirmPassword: "", pin: "", permissions: u.permissions_list,
    });
    setUFormErr(null); setUModalStep(initialStep); setUModalOpen(true);
  };

  const handleRoleChange = (role: string) => {
    setUForm(f => ({ ...f, role, permissions: DEFAULT_ROLE_PERMS[role] ?? [] }));
  };

  const togglePerm = (code: string) => {
    setUForm(f => ({
      ...f,
      permissions: f.permissions.includes(code)
        ? f.permissions.filter(p => p !== code)
        : [...f.permissions, code],
    }));
  };

  const handleUserSave = async () => {
    if (!uForm.username.trim() || !uForm.first_name.trim() || !uForm.last_name.trim()) {
      setUFormErr("Familiya, ism va username kiritilishi shart."); return;
    }
    const isAdmin = uForm.role === "admin";
    if (!editingUser) {
      if (isAdmin && !uForm.password) {
        setUFormErr("Admin uchun parol kiritilishi shart."); return;
      }
      if (!isAdmin && !uForm.pin && !uForm.password) {
        setUFormErr("PIN yoki parol kiritilishi shart."); return;
      }
      if (!isAdmin && uForm.pin && uForm.pin.length !== 4) {
        setUFormErr("PIN 4 ta raqamdan iborat bo'lishi kerak."); return;
      }
      if (uForm.password && uForm.password !== uForm.confirmPassword) {
        setUFormErr("Parollar mos kelmaydi."); return;
      }
    }
    setUSaving(true); setUFormErr(null);
    try {
      if (editingUser) {
        const patch: Record<string, unknown> = {
          first_name: uForm.first_name, last_name: uForm.last_name,
          phone: uForm.phone, role: uForm.role,
          permissions_list: uForm.permissions, is_active: editingUser.is_active,
        };
        if (uForm.pin && uForm.pin.length === 4) patch.pin = uForm.pin;
        const updated = await usersApi.update(editingUser.id, patch);
        setSysUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
      } else {
        const payload: Record<string, unknown> = {
          username: uForm.username,
          first_name: uForm.first_name, last_name: uForm.last_name,
          phone: uForm.phone, role: uForm.role,
          permissions_list: uForm.permissions,
        };
        if (uForm.password)    { payload.password = uForm.password; payload.confirm_password = uForm.confirmPassword; }
        if (uForm.pin)         payload.pin = uForm.pin;
        if (uForm.middle_name) payload.middle_name = uForm.middle_name;
        const created = await usersApi.create(payload);
        setSysUsers(prev => [created, ...prev]);
      }
      setUModalOpen(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setUFormErr(Object.values(err.data).flat().join(" ") || "Xatolik yuz berdi.");
      } else { setUFormErr("Serverga ulanishda xatolik."); }
    } finally { setUSaving(false); }
  };

  const handleUserDelete = async (id: number) => {
    if (!confirm("Bu foydalanuvchini o'chirishni tasdiqlaysizmi?")) return;
    setUDeletingId(id);
    try {
      await usersApi.delete(id);
      setSysUsers(prev => prev.filter(u => u.id !== id));
    } catch { alert("Xatolik: O'chira olmadik."); }
    finally { setUDeletingId(null); }
  };

  const handleUserToggle = async (id: number) => {
    try {
      const res = await usersApi.toggleActive(id);
      setSysUsers(prev => prev.map(u => u.id === id ? { ...u, is_active: res.is_active } : u));
    } catch { /* silent */ }
  };

  const activeCount   = workers.filter(w => w.is_active).length;
  const inactiveCount = workers.length - activeCount;

  // ── RENDER ─────────────────────────────────────────────────────────────
  return (
    <CRMLayout pageTitle="Ishchilar & Foydalanuvchilar">

      {/* ── TABS ── */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-6 w-fit">
        {([
          { key: "workers", label: "Ishlab Chiqarish Ishchilari" },
          { key: "users",   label: "Tizim Foydalanuvchilari" },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === tab.key
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════
          WORKERS TAB
          ════════════════════════════════════ */}
      {activeTab === "workers" && (
        <>
          {/* Stat cards */}
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

          {/* Toolbar */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm px-4 py-3 mb-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 flex-1 min-w-[180px]">
              <Search size={16} className="text-slate-400 shrink-0" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Ism, familiya yoki kod..."
                className="bg-transparent text-sm text-slate-700 placeholder-slate-400 outline-none w-full" />
              {search && <button onClick={() => setSearch("")} className="text-slate-400 hover:text-slate-600"><X size={14} /></button>}
            </div>
            <FilterSelect value={filterActive} onChange={v => setFilterActive(v as any)}
              options={[{value:"",label:"Barcha"},{value:"true",label:"Faol"},{value:"false",label:"Nofaol"}]} />
            <FilterSelect value={filterRole} onChange={setFilterRole} options={ROLES} />
            <FilterSelect value={filterStatus} onChange={setFilterStatus} options={STATUSES} />
            <button onClick={openWorkerCreate}
              className="ml-auto flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-4 py-2 rounded-lg shadow-sm transition-colors">
              <UserPlus size={16} /> Yangi ishchi
            </button>
          </div>

          {/* Workers table */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {["Kod","F.I.SH.","Lavozim","Telefon","Ish holati","Faollik","Amallar"].map(h => (
                      <th key={h} className="px-5 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {wLoading ? (
                    <tr><td colSpan={7} className="py-16 text-center text-slate-400">
                      <Loader2 size={24} className="animate-spin inline-block mr-2" /> Yuklanmoqda...
                    </td></tr>
                  ) : wError ? (
                    <tr><td colSpan={7} className="py-16 text-center text-red-500 font-medium">{wError}</td></tr>
                  ) : workers.length === 0 ? (
                    <tr><td colSpan={7} className="py-16 text-center text-slate-400">
                      <Users size={32} className="mx-auto mb-2 opacity-30" />
                      <p className="font-medium">Ishchi topilmadi</p>
                    </td></tr>
                  ) : workers.map(worker => (
                    <tr key={worker.id}
                      className={`transition-colors hover:bg-slate-50/70 group ${!worker.is_active ? "opacity-55" : ""}`}>
                      <td className="px-5 py-4">
                        <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md">{worker.code}</span>
                      </td>
                      <td className="px-5 py-4">
                        <button onClick={() => openWorkerEdit(worker)} className="flex items-center gap-3 group text-left">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 group-hover:ring-2 group-hover:ring-indigo-300 transition-all">
                            {worker.photo ? (
                              <img src={worker.photo} alt={worker.full_name} className="w-full h-full object-cover rounded-full" />
                            ) : (
                              <span className="text-indigo-600 text-xs font-bold">{worker.last_name[0]}{worker.first_name[0]}</span>
                            )}
                          </div>
                          <p className="text-sm font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors">
                            {worker.full_name}
                          </p>
                        </button>
                      </td>
                      <td className="px-5 py-4"><span className="text-sm text-slate-600 capitalize">{worker.role_display || worker.role}</span></td>
                      <td className="px-5 py-4"><span className="text-sm text-slate-500">{worker.phone || "—"}</span></td>
                      <td className="px-5 py-4 text-center"><StatusBadge status={worker.status} label={worker.status_display} /></td>
                      <td className="px-5 py-4 text-center">
                        <button onClick={() => handleToggle(worker)} disabled={togglingId === worker.id}>
                          {togglingId === worker.id
                            ? <Loader2 size={18} className="animate-spin text-slate-400" />
                            : <ToggleSwitch active={worker.is_active} />}
                        </button>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openWorkerEdit(worker)}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 px-2.5 py-1.5 rounded-lg border border-indigo-100 transition-colors">
                            <Pencil size={12} /> Tahrir
                          </button>
                          <button onClick={() => { setDeletingWorker(worker); setWDeleteOpen(true); }}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg border border-red-100 transition-colors">
                            <Trash2 size={12} /> O'chirish
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!wLoading && workers.length > 0 && (
              <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50">
                <p className="text-xs text-slate-400 font-medium">
                  Jami <span className="text-slate-600 font-bold">{workers.length}</span> ta ishchi
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {/* ════════════════════════════════════════
          SYSTEM USERS TAB
          ════════════════════════════════════ */}
      {activeTab === "users" && (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-slate-500">ERP tizimiga kira oladigan xodimlar</p>
            <button onClick={openUserCreate}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-4 py-2 rounded-lg shadow-sm transition-colors">
              <UserPlus size={16} /> Yangi xodim
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {["Foydalanuvchi","Rol","Telefon","Huquqlar","Faol","Amallar"].map(h => (
                    <th key={h} className="px-5 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {uLoading ? (
                  <tr><td colSpan={6} className="py-16 text-center text-slate-400">
                    <Loader2 size={24} className="animate-spin inline-block mr-2" /> Yuklanmoqda...
                  </td></tr>
                ) : sysUsers.length === 0 ? (
                  <tr><td colSpan={6} className="py-16 text-center text-slate-400 font-medium">Foydalanuvchi topilmadi</td></tr>
                ) : sysUsers.map(u => (
                  <tr key={u.id} className={`hover:bg-slate-50/70 transition-colors group ${!u.is_active ? "opacity-55" : ""}`}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-bold shrink-0">
                          {(u.last_name[0] || u.username[0] || "?").toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{u.full_name}</p>
                          <p className="text-xs text-slate-400 font-mono">@{u.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4"><RoleBadge role={u.role} label={u.role_display} /></td>
                    <td className="px-5 py-4 text-sm text-slate-500">{u.phone || "—"}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1">
                        <Shield size={14} className="text-slate-400" />
                        <span className="text-sm font-semibold text-slate-600">{u.permissions_list.length}</span>
                        <span className="text-xs text-slate-400">ta</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <button onClick={() => handleUserToggle(u.id)}>
                        <ToggleSwitch active={u.is_active} />
                      </button>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openUserEdit(u)}
                          className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 px-2.5 py-1.5 rounded-lg border border-indigo-100 transition-colors">
                          <Pencil size={12} /> Tahrir
                        </button>
                        <button
                          onClick={() => openUserEdit(u, 3)}
                          className="flex items-center gap-1 text-xs font-semibold text-violet-600 hover:bg-violet-50 px-2.5 py-1.5 rounded-lg border border-violet-100 transition-colors">
                          <Shield size={12} /> Huquqlar
                        </button>
                        <button onClick={() => handleUserDelete(u.id)}
                          disabled={uDeletingId === u.id}
                          className="flex items-center gap-1 text-xs font-semibold text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg border border-red-100 transition-colors">
                          {uDeletingId === u.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} O'chirish
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ════════════════════════════════════════
          WORKER MODAL
          ════════════════════════════════════ */}
      {wModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => !wSaving && setWModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-800">
                {editingWorker ? "Ishchini tahrirlash" : "Yangi ishchi qo'shish"}
              </h2>
              <button onClick={() => setWModalOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="space-y-1">
                <FormField label="Ishchi kodi *" value={wForm.code} placeholder="Masalan: W-001"
                  onChange={v => setWForm(f => ({ ...f, code: v }))} />
                {checkingCode && <p className="text-[10px] text-slate-400">Tekshirilmoqda...</p>}
                {codeExists && !checkingCode && (
                  <p className="text-[10px] text-amber-600 font-medium">⚠️ Bu kod allaqachon mavjud!</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Familiya *" value={wForm.last_name} onChange={v => setWForm(f => ({ ...f, last_name: v }))} />
                <FormField label="Ism *" value={wForm.first_name} onChange={v => setWForm(f => ({ ...f, first_name: v }))} />
              </div>
              <FormField label="Otasining ismi" value={wForm.middle_name ?? ""}
                onChange={v => setWForm(f => ({ ...f, middle_name: v }))} />
              <FormField label="Telefon" value={wForm.phone} placeholder="+998 90 123 45 67"
                onChange={v => setWForm(f => ({ ...f, phone: v }))} />
              <div className="grid grid-cols-2 gap-3">
                <SelectField label="Lavozim" value={wForm.role} onChange={v => setWForm(f => ({ ...f, role: v }))}
                  options={ROLES.filter(r => r.value)} />
                <SelectField label="Ish holati" value={wForm.status} onChange={v => setWForm(f => ({ ...f, status: v }))}
                  options={STATUSES.filter(s => s.value)} />
              </div>
              {wFormErr && <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2.5 rounded-lg">{wFormErr}</div>}
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
              <button onClick={() => setWModalOpen(false)} disabled={wSaving}
                className="flex-1 py-2.5 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors">
                Bekor qilish
              </button>
              <button onClick={handleWorkerSave} disabled={wSaving}
                className="flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2">
                {wSaving ? <><Loader2 size={16} className="animate-spin" /> Saqlanmoqda...</> : <><Check size={16} /> Saqlash</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════
          WORKER DELETE CONFIRM
          ════════════════════════════════════ */}
      {wDeleteOpen && deletingWorker && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !wDeleting && setWDeleteOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="text-red-500" size={32} />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Ishchini o'chirish?</h3>
              <p className="text-sm text-slate-500 mb-6">
                <span className="font-bold text-slate-700">{deletingWorker.full_name}</span> arxivga o'tkaziladi.
                Tarixi saqlanib qoladi.
              </p>
              <div className="flex gap-3">
                <button disabled={wDeleting} onClick={() => setWDeleteOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                  Bekor qilish
                </button>
                <button disabled={wDeleting} onClick={handleWorkerDelete}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold shadow-sm transition-colors flex items-center justify-center gap-2">
                  {wDeleting ? <Loader2 size={16} className="animate-spin" /> : "Ha, o'chirish"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════
          SYSTEM USER MODAL (3 bo'lim)
          ════════════════════════════════════ */}
      {uModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => !uSaving && setUModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl flex flex-col max-h-[90vh]">

            {/* Header + step indicator */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
              <div>
                <h2 className="text-base font-bold text-slate-800">
                  {editingUser ? "Xodimni tahrirlash" : "Yangi tizim xodimi"}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {uModalStep === 1 && "Bo'lim 1/3 — Shaxsiy ma'lumotlar"}
                  {uModalStep === 2 && "Bo'lim 2/3 — Login ma'lumotlari"}
                  {uModalStep === 3 && "Bo'lim 3/3 — Huquqlar"}
                </p>
              </div>
              <button onClick={() => setUModalOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                <X size={18} />
              </button>
            </div>

            {/* Step dots */}
            <div className="flex gap-2 px-6 pt-4 shrink-0">
              {[1,2,3].map(s => (
                <button key={s} onClick={() => setUModalStep(s)}
                  className={`h-1.5 flex-1 rounded-full transition-all ${
                    s === uModalStep ? "bg-indigo-600" : s < uModalStep ? "bg-indigo-200" : "bg-slate-200"
                  }`} />
              ))}
            </div>

            {/* Body (scrollable) */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

              {/* BO'LIM 1 */}
              {uModalStep === 1 && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Familiya *" value={uForm.last_name}
                      onChange={v => {
                        const ln = v;
                        setUForm(f => ({
                          ...f, last_name: ln,
                          username: f.username || suggestUsername(f.first_name, ln),
                        }));
                      }} />
                    <FormField label="Ism *" value={uForm.first_name}
                      onChange={v => {
                        setUForm(f => ({
                          ...f, first_name: v,
                          username: f.username || suggestUsername(v, f.last_name),
                        }));
                      }} />
                  </div>
                  <FormField label="Otasining ismi" value={uForm.middle_name}
                    onChange={v => setUForm(f => ({ ...f, middle_name: v }))} />
                  <FormField label="Telefon (+998XXXXXXXXX)" value={uForm.phone} placeholder="+998901234567"
                    onChange={v => setUForm(f => ({ ...f, phone: v }))} />
                  <SelectField label="Lavozim / Rol *" value={uForm.role}
                    onChange={handleRoleChange} options={SYS_ROLES} />
                </>
              )}

              {/* BO'LIM 2 */}
              {uModalStep === 2 && (
                <>
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">Username *</label>
                    <div className="flex gap-2">
                      <input value={uForm.username} onChange={e => setUForm(f => ({ ...f, username: e.target.value }))}
                        placeholder="masalan: karimov_a"
                        className="flex-1 px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500" />
                      <button type="button"
                        onClick={() => setUForm(f => ({ ...f, username: suggestUsername(f.first_name, f.last_name) }))}
                        className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                        title="Auto-generate">
                        <RefreshCw size={13} /> Auto
                      </button>
                    </div>
                  </div>

                  {/* PIN — admin bo'lmagan rollar uchun */}
                  {uForm.role !== "admin" && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                        4 xonali PIN {!editingUser && "*"}
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={4}
                        value={uForm.pin}
                        onChange={e => {
                          const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                          setUForm(f => ({ ...f, pin: v }));
                        }}
                        placeholder="Masalan: 1234"
                        className={`w-full px-3 py-2.5 border rounded-lg text-lg font-mono tracking-[0.4em] text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 ${
                          uForm.pin && uForm.pin.length < 4
                            ? "border-amber-300 bg-amber-50"
                            : "border-slate-200"
                        }`}
                      />
                      {uForm.pin.length > 0 && uForm.pin.length < 4 && (
                        <p className="text-[10px] text-amber-600 mt-1">PIN 4 ta raqam bo'lishi kerak</p>
                      )}
                      {editingUser && !uForm.pin && (
                        <p className="text-[10px] text-slate-400 mt-1">Bo'sh qoldirsa PIN o'zgartirilmaydi</p>
                      )}
                    </div>
                  )}

                  {/* Parol — admin uchun yoki ixtiyoriy */}
                  {(uForm.role === "admin" || !editingUser) && (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                          Parol {uForm.role === "admin" && !editingUser ? "*" : "(ixtiyoriy)"}
                        </label>
                        <div className="relative">
                          <input type={showPass ? "text" : "password"} value={uForm.password}
                            onChange={e => setUForm(f => ({ ...f, password: e.target.value }))}
                            placeholder={uForm.role === "admin" ? "Kamida 6 ta belgi" : "Qo'shimcha parol (ixtiyoriy)"}
                            className="w-full pr-10 px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500" />
                          <button type="button" onClick={() => setShowPass(v => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                            {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>
                      {uForm.password && (
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1.5">Parol tasdiqlash *</label>
                          <input type="password" value={uForm.confirmPassword}
                            onChange={e => setUForm(f => ({ ...f, confirmPassword: e.target.value }))}
                            placeholder="Parolni qaytaring"
                            className={`w-full px-3 py-2.5 border rounded-lg text-sm text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 ${
                              uForm.confirmPassword && uForm.password !== uForm.confirmPassword
                                ? "border-red-300 bg-red-50" : "border-slate-200"
                            }`} />
                          {uForm.confirmPassword && uForm.password !== uForm.confirmPassword && (
                            <p className="text-[10px] text-red-500 mt-1">Parollar mos kelmaydi</p>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </>
              )}

              {/* BO'LIM 3 — Huquqlar */}
              {uModalStep === 3 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-slate-500">
                      <strong>{uForm.permissions.length}</strong> ta huquq tanlangan
                    </p>
                    <div className="flex gap-2">
                      <button onClick={() => setUForm(f => ({ ...f, permissions: ALL_PERMS }))}
                        className="text-xs text-indigo-600 hover:underline font-medium">Hammasini belgi</button>
                      <span className="text-slate-300">|</span>
                      <button onClick={() => setUForm(f => ({ ...f, permissions: [] }))}
                        className="text-xs text-slate-500 hover:underline font-medium">Tozalash</button>
                    </div>
                  </div>
                  {PERMISSION_GROUPS.map(group => (
                    <div key={group.label} className="border border-slate-200 rounded-xl overflow-hidden">
                      <div className="px-4 py-2 bg-slate-50 border-b border-slate-100">
                        <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">{group.label}</span>
                      </div>
                      <div className="px-4 py-2 space-y-2">
                        {group.perms.map(p => (
                          <label key={p.code} className="flex items-center gap-3 cursor-pointer py-0.5 group/item">
                            <input type="checkbox" checked={uForm.permissions.includes(p.code)}
                              onChange={() => togglePerm(p.code)}
                              className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500" />
                            <span className="text-sm text-slate-700 group-hover/item:text-slate-900">{p.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {uFormErr && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2.5 rounded-lg">{uFormErr}</div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl shrink-0">
              {uModalStep > 1 && (
                <button onClick={() => setUModalStep(s => s - 1)}
                  className="px-5 py-2.5 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors">
                  Orqaga
                </button>
              )}
              <button onClick={() => setUModalOpen(false)} disabled={uSaving}
                className="px-5 py-2.5 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors">
                Bekor
              </button>
              {uModalStep < 3 ? (
                <button onClick={() => setUModalStep(s => s + 1)}
                  className="ml-auto flex-1 max-w-[160px] py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition-colors">
                  Keyingisi →
                </button>
              ) : (
                <button onClick={handleUserSave} disabled={uSaving}
                  className="ml-auto flex-1 max-w-[160px] py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2">
                  {uSaving ? <><Loader2 size={16} className="animate-spin" /> Saqlanmoqda...</> : <><Check size={16} /> Saqlash</>}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </CRMLayout>
  );
}

// ── Small reusable components ──────────────────────────────────────────────

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
  return (
    <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full border ${map[status] ?? "bg-slate-100 text-slate-500 border-slate-200"}`}>
      {label || status}
    </span>
  );
}

function RoleBadge({ role, label }: { role: string; label?: string }) {
  const map: Record<string, string> = {
    admin:   "bg-red-50 text-red-600 border-red-200",
    manager: "bg-indigo-50 text-indigo-600 border-indigo-200",
    cutter:  "bg-sky-50 text-sky-600 border-sky-200",
    packer:  "bg-purple-50 text-purple-600 border-purple-200",
    tv:      "bg-slate-100 text-slate-500 border-slate-200",
  };
  return (
    <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full border ${map[role] ?? "bg-slate-100 text-slate-500 border-slate-200"}`}>
      {label || role}
    </span>
  );
}

function FormField({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 mb-1.5">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all" />
    </div>
  );
}

function SelectField({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 mb-1.5">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function FilterSelect({ value, onChange, options }: {
  value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
      <select value={value} onChange={e => onChange(e.target.value)}
        className="bg-transparent text-sm font-medium text-slate-700 outline-none appearance-none pr-5 cursor-pointer">
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown size={14} className="text-slate-400 absolute right-2 pointer-events-none" />
    </div>
  );
}

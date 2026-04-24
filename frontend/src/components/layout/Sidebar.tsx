"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  PenLine,
  Warehouse,
  Scissors,
  Package,
  Users,
  BarChart3,
  TrendingUp,
  Settings,
  LogOut,
  ChevronLeft,
  X,
} from "lucide-react";

// ── Nav structure ──────────────────────────────────────────────────────────
const TOP_ITEMS = [
  { label: "Dashboard",    href: "/",          icon: LayoutDashboard, perm: null },
  { label: "Ish kiritish", href: "/work-log",  icon: PenLine,         perm: "add_worklog" },
];

const OMBOR_ITEMS = [
  { label: "Sklad",    href: "/inventory/sklad",  icon: Warehouse, perm: "view_sklad",    badge: undefined, disabled: false },
  { label: "Bichuv",   href: "/inventory/bichuv", icon: Scissors,  perm: "view_bichuv",   badge: undefined, disabled: false },
  // /inventory/upakovka sahifasi hali mavjud emas; /touch/pack faqat CUTTER/PACKER uchun
  { label: "Upakovka", href: "#",                  icon: Package,   perm: "view_upakovka", badge: undefined, disabled: true  },
];

const XODIM_ITEMS = [
  { label: "Ishchilar", href: "/admin/workers",  icon: Users,    perm: "view_workers" },
  { label: "Oyliklar",  href: "/admin/payroll",  icon: BarChart3, perm: "view_payroll" },
];

const REPORT_ITEMS = [
  { label: "Hisobotlar", href: "/admin/reports", icon: TrendingUp, perm: "view_reports" },
];

// ── Shared link renderer ───────────────────────────────────────────────────
function NavLink({
  item,
  active,
  collapsed,
  isMobile,
  onClose,
}: {
  item: { label: string; href: string; icon: React.ElementType; badge?: string; disabled?: boolean };
  active: boolean;
  collapsed: boolean;
  isMobile: boolean;
  onClose: () => void;
}) {
  const Icon = item.icon;

  if (item.disabled) {
    return (
      <span
        title={collapsed && !isMobile ? `${item.label} (tez kunda)` : undefined}
        className={`
          flex items-center gap-3 rounded-xl px-3 py-2.5
          text-[13px] font-medium opacity-35 cursor-not-allowed select-none
          text-slate-500
          ${collapsed && !isMobile ? "justify-center px-0" : ""}
        `}
      >
        <Icon size={19} strokeWidth={1.8} className="shrink-0 text-slate-400" />
        {(!collapsed || isMobile) && (
          <>
            <span className="flex-1">{item.label}</span>
            <span className="text-[10px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded ml-auto">tez kunda</span>
          </>
        )}
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={isMobile ? onClose : undefined}
      title={collapsed && !isMobile ? item.label : undefined}
      className={`
        group flex items-center gap-3 rounded-xl px-3 py-2.5
        text-[13px] font-medium transition-all duration-150
        ${active
          ? "bg-indigo-50 text-indigo-800"
          : "text-slate-500 hover:bg-gray-50 hover:text-slate-700"}
        ${collapsed && !isMobile ? "justify-center px-0" : ""}
      `}
    >
      <Icon
        size={19}
        strokeWidth={active ? 2.2 : 1.8}
        className={`shrink-0 transition-colors ${
          active ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-500"
        }`}
      />
      {(!collapsed || isMobile) && (
        <>
          <span className="flex-1">{item.label}</span>
          {item.badge && (
            <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded ml-auto">
              {item.badge}
            </span>
          )}
          {active && !item.badge && (
            <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400" />
          )}
        </>
      )}
    </Link>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1 px-3">
      {label}
    </p>
  );
}

function Divider() {
  return <hr className="border-slate-100 my-2" />;
}

// ── Props ──────────────────────────────────────────────────────────────────
interface SidebarProps {
  isOpen: boolean;
  isMobile: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export default function Sidebar({
  isOpen,
  isMobile,
  onClose,
  collapsed,
  onToggleCollapse,
}: SidebarProps) {
  const pathname = usePathname();
  const [perms] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    const raw = document.cookie.split("; ").find(r => r.startsWith("userPerms="));
    if (!raw) return [];
    try { return JSON.parse(decodeURIComponent(raw.split("=")[1])); } catch { return []; }
  });
  const [role] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    const raw = document.cookie.split("; ").find(r => r.startsWith("userRole="));
    return raw ? raw.split("=")[1] : "";
  });

  const isAdmin = role === "ADMIN";
  const hasPerm = (perm: string | null) => !perm || isAdmin || perms.includes(perm);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const linkProps = (item: { label: string; href: string; icon: React.ElementType; perm?: string | null; badge?: string }) => ({
    item: { label: item.label, href: item.href, icon: item.icon, badge: item.badge },
    active: isActive(item.href),
    collapsed,
    isMobile,
    onClose,
  });

  const sidebarContent = (
    <aside
      className={`
        flex flex-col h-full bg-white
        ${isMobile ? "w-[280px] sidebar-enter" : collapsed ? "w-[72px]" : "w-[260px]"}
        border-r border-slate-200/80 transition-sidebar
      `}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-slate-100">
        {(!collapsed || isMobile) && (
          <Link href="/" className="flex items-center gap-2.5 group" onClick={isMobile ? onClose : undefined}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-sm shadow-indigo-200">
              <span className="text-white font-bold text-sm">ST</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-slate-800 leading-tight">Selen Textile</span>
              <span className="text-[10px] text-slate-400 leading-tight">ERP / CRM</span>
            </div>
          </Link>
        )}

        {isMobile ? (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Yopish"
          >
            <X size={20} />
          </button>
        ) : (
          <button
            onClick={onToggleCollapse}
            className={`p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all duration-200 ${
              collapsed ? "rotate-180 mx-auto" : ""
            }`}
            aria-label={collapsed ? "Kengaytirish" : "Qisqartirish"}
          >
            <ChevronLeft size={18} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {/* Top items */}
        <ul className="space-y-0.5 mb-2">
          {TOP_ITEMS.filter(i => hasPerm(i.perm)).map((item) => (
            <li key={item.href}><NavLink {...linkProps(item)} /></li>
          ))}
        </ul>

        {OMBOR_ITEMS.some(i => hasPerm(i.perm)) && (
          <>
            <Divider />
            {(!collapsed || isMobile) && <SectionLabel label="Ombor zanjiri" />}
            <ul className="space-y-0.5 mb-2">
              {OMBOR_ITEMS.filter(i => hasPerm(i.perm)).map((item) => (
                <li key={item.href}><NavLink {...linkProps(item)} /></li>
              ))}
            </ul>
          </>
        )}

        {XODIM_ITEMS.some(i => hasPerm(i.perm)) && (
          <>
            <Divider />
            {(!collapsed || isMobile) && <SectionLabel label="Xodimlar" />}
            <ul className="space-y-0.5 mb-2">
              {XODIM_ITEMS.filter(i => hasPerm(i.perm)).map((item) => (
                <li key={item.href}><NavLink {...linkProps(item)} /></li>
              ))}
            </ul>
          </>
        )}

        {REPORT_ITEMS.some(i => hasPerm(i.perm)) && (
          <>
            <Divider />
            <ul className="space-y-0.5">
              {REPORT_ITEMS.filter(i => hasPerm(i.perm)).map((item) => (
                <li key={item.href}><NavLink {...linkProps(item)} /></li>
              ))}
            </ul>
          </>
        )}
      </nav>

      {/* Bottom */}
      <div className="border-t border-slate-100 p-3 space-y-0.5">
        <Link
          href="/settings"
          className={`
            group flex items-center gap-3 rounded-xl px-3 py-2.5
            text-[13px] font-medium text-slate-500
            hover:bg-gray-50 hover:text-slate-700 transition-all
            ${collapsed && !isMobile ? "justify-center px-0" : ""}
          `}
        >
          <Settings size={19} strokeWidth={1.8} className="shrink-0 text-slate-400 group-hover:text-slate-500" />
          {(!collapsed || isMobile) && <span>Sozlamalar</span>}
        </Link>
        <button
          className={`
            group flex items-center gap-3 rounded-xl px-3 py-2.5 w-full
            text-[13px] font-medium text-slate-500
            hover:bg-red-50 hover:text-red-600 transition-all
            ${collapsed && !isMobile ? "justify-center px-0" : ""}
          `}
        >
          <LogOut size={19} strokeWidth={1.8} className="shrink-0 text-slate-400 group-hover:text-red-400" />
          {(!collapsed || isMobile) && <span>Chiqish</span>}
        </button>
      </div>
    </aside>
  );

  if (isMobile) {
    if (!isOpen) return null;
    return (
      <div className="fixed inset-0 z-50 flex">
        <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm overlay-enter" onClick={onClose} />
        <div className="relative z-10 shadow-2xl">{sidebarContent}</div>
      </div>
    );
  }

  return sidebarContent;
}

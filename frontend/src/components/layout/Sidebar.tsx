"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Scissors,
  Package,
  ClipboardList,
  Warehouse,
  BarChart3,
  PenLine,
  Settings,
  LogOut,
  ChevronLeft,
  X,
} from "lucide-react";
import InventoryMenu from "./InventoryMenu";

/* ── Navigation items ── */
const NAV_SECTIONS = [
  {
    title: "Asosiy",
    items: [
      { label: "Dashboard", href: "/", icon: LayoutDashboard },
      { label: "Ishchilar", href: "/admin/workers", icon: Users },
    ],
  },
  {
    title: "Ishlab chiqarish",
    items: [
      { label: "Modellar", href: "/models", icon: Scissors },
      { label: "Ish turlari", href: "/work-types", icon: ClipboardList },
      { label: "Ish kiritish", href: "/work-log", icon: PenLine },
      { label: "Ish jurnali", href: "/work-log/history", icon: BarChart3 },
    ],
  },
  {
    title: "Ombor",
    items: [
      { label: "Sklad", href: "/inventory/sklad", icon: Warehouse, customComponent: "InventoryMenu" },
    ],
  },
];

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

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const sidebarWidth = collapsed ? "w-[72px]" : "w-[260px]";

  const sidebarContent = (
    <aside
      className={`
        flex flex-col h-full bg-white
        ${isMobile ? "w-[280px] sidebar-enter" : sidebarWidth}
        border-r border-slate-200/80
        transition-sidebar
      `}
    >
      {/* ── Logo Area ── */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-slate-100">
        {(!collapsed || isMobile) && (
          <Link href="/" className="flex items-center gap-2.5 group" onClick={isMobile ? onClose : undefined}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-sm shadow-indigo-200">
              <span className="text-white font-bold text-sm">ST</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-slate-800 leading-tight">
                Selen Textile
              </span>
              <span className="text-[10px] text-slate-400 leading-tight">
                ERP / CRM
              </span>
            </div>
          </Link>
        )}

        {/* Mobile close / Desktop collapse */}
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
            className={`
              p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600
              transition-all duration-200
              ${collapsed ? "rotate-180 mx-auto" : ""}
            `}
            aria-label={collapsed ? "Kengaytirish" : "Qisqartirish"}
          >
            <ChevronLeft size={18} />
          </button>
        )}
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title}>
            {(!collapsed || isMobile) && (
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2 px-3">
                {section.title}
              </p>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                if ((item as any).customComponent === "InventoryMenu") {
                  return (
                    <li key="inventory-menu">
                      <InventoryMenu collapsed={collapsed} isMobile={isMobile} onClose={onClose} />
                    </li>
                  );
                }

                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={isMobile ? onClose : undefined}
                      title={collapsed && !isMobile ? item.label : undefined}
                      className={`
                        group flex items-center gap-3 rounded-xl px-3 py-2.5
                        text-[13px] font-medium transition-all duration-150
                        ${
                          active
                            ? "bg-indigo-50 text-indigo-600 shadow-sm shadow-indigo-100/50"
                            : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                        }
                        ${collapsed && !isMobile ? "justify-center px-0" : ""}
                      `}
                    >
                      <Icon
                        size={19}
                        strokeWidth={active ? 2.2 : 1.8}
                        className={`shrink-0 transition-colors ${
                          active
                            ? "text-indigo-500"
                            : "text-slate-400 group-hover:text-slate-500"
                        }`}
                      />
                      {(!collapsed || isMobile) && (
                        <span>{item.label}</span>
                      )}
                      {active && (!collapsed || isMobile) && (
                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* ── Bottom Section ── */}
      <div className="border-t border-slate-100 p-3 space-y-0.5">
        <Link
          href="/settings"
          className={`
            group flex items-center gap-3 rounded-xl px-3 py-2.5
            text-[13px] font-medium text-slate-500
            hover:bg-slate-50 hover:text-slate-700 transition-all
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

  /* ── Mobile: overlay + drawer ── */
  if (isMobile) {
    if (!isOpen) return null;
    return (
      <div className="fixed inset-0 z-50 flex">
        {/* Overlay */}
        <div
          className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm overlay-enter"
          onClick={onClose}
        />
        {/* Drawer */}
        <div className="relative z-10 shadow-2xl">
          {sidebarContent}
        </div>
      </div>
    );
  }

  /* ── Desktop: static sidebar ── */
  return sidebarContent;
}

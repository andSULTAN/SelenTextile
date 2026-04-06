"use client";

import {
  Menu,
  Bell,
  Search,
  ChevronDown,
  User,
} from "lucide-react";
import { useState } from "react";

interface HeaderProps {
  pageTitle: string;
  onMenuToggle: () => void;
  isMobile: boolean;
}

export default function Header({ pageTitle, onMenuToggle, isMobile }: HeaderProps) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/80 backdrop-blur-md border-b border-slate-200/60">
      <div className="flex items-center justify-between h-full px-4 lg:px-6">
        {/* ── Left: Menu + Title ── */}
        <div className="flex items-center gap-3">
          {isMobile && (
            <button
              onClick={onMenuToggle}
              className="p-2 -ml-2 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
              aria-label="Menyuni ochish"
            >
              <Menu size={22} />
            </button>
          )}

          <div>
            <h1 className="text-base font-semibold text-slate-800 leading-tight">
              {pageTitle}
            </h1>
            <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
              Selen Textile ERP
            </p>
          </div>
        </div>

        {/* ── Right: Search + Notifications + Profile ── */}
        <div className="flex items-center gap-1.5">
          {/* Search */}
          <div className="relative">
            {showSearch && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-lg shadow-slate-200/50 border border-slate-200 p-2 animate-in fade-in slide-in-from-top-1">
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg">
                  <Search size={16} className="text-slate-400" />
                  <input
                    type="text"
                    placeholder="Qidirish..."
                    autoFocus
                    className="bg-transparent text-sm text-slate-700 placeholder:text-slate-400 outline-none w-full"
                    onBlur={() => setTimeout(() => setShowSearch(false), 200)}
                  />
                </div>
              </div>
            )}
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="p-2.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              aria-label="Qidirish"
            >
              <Search size={19} />
            </button>
          </div>

          {/* Notifications */}
          <button
            className="relative p-2.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Bildirishnomalar"
          >
            <Bell size={19} />
            {/* Badge */}
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-500 rounded-full ring-2 ring-white" />
          </button>

          {/* Divider */}
          <div className="w-px h-8 bg-slate-200 mx-1.5 hidden sm:block" />

          {/* Profile */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2.5 p-1.5 pr-3 rounded-xl hover:bg-slate-50 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center shadow-sm">
                <User size={16} className="text-white" />
              </div>
              <div className="hidden sm:flex flex-col items-start">
                <span className="text-[13px] font-medium text-slate-700 leading-tight">
                  Admin User
                </span>
                <span className="text-[10px] text-slate-400 leading-tight">
                  Administrator
                </span>
              </div>
              <ChevronDown
                size={14}
                className={`hidden sm:block text-slate-400 transition-transform duration-200 ${
                  showProfileMenu ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Profile Dropdown */}
            {showProfileMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowProfileMenu(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg shadow-slate-200/50 border border-slate-200 py-1.5 z-50">
                  <div className="px-4 py-2.5 border-b border-slate-100">
                    <p className="text-sm font-medium text-slate-800">Admin User</p>
                    <p className="text-xs text-slate-400 mt-0.5">admin@selentextile.uz</p>
                  </div>
                  <div className="py-1">
                    <button className="w-full text-left px-4 py-2 text-[13px] text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors">
                      Profil sozlamalari
                    </button>
                    <button className="w-full text-left px-4 py-2 text-[13px] text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors">
                      Bildirishnomalar
                    </button>
                  </div>
                  <div className="border-t border-slate-100 py-1">
                    <button className="w-full text-left px-4 py-2 text-[13px] text-red-500 hover:bg-red-50 transition-colors">
                      Tizimdan chiqish
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

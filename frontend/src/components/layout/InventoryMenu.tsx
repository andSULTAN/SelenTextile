"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Package, 
  ChevronRight, 
  LayoutDashboard, 
  BellRing, 
  Truck, 
  BarChart3,
  Warehouse,
  Scissors
} from "lucide-react";

interface InventoryMenuProps {
  collapsed: boolean;
  isMobile: boolean;
  onClose?: () => void;
}

export default function InventoryMenu({ collapsed, isMobile, onClose }: InventoryMenuProps) {
  const pathname = usePathname();
  const router = useRouter();
  
  // Consider active if URL contains "/inventory/"
  const isParentActive = pathname.startsWith("/inventory");
  const [isOpen, setIsOpen] = useState(isParentActive);

  const handleParentClick = () => {
    // Toggle open state
    setIsOpen(!isOpen);
    // Navigate directly to Sklad page
    router.push("/inventory/sklad");
    if (isMobile && onClose) {
      onClose();
    }
  };

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + "/");

  const subItems = [
    { label: "Sklad", href: "/inventory/sklad", icon: Warehouse },
    { label: "Bichuv", href: "/inventory/bichuv", icon: Scissors },
    { label: "Inventory Dashboard", href: "/inventory/dashboard", icon: LayoutDashboard },
    { label: "Zaxira Ogohlantirish", href: "/inventory/alerts", icon: BellRing },
    { label: "Yetkazib beruvchilar", href: "/inventory/suppliers", icon: Truck },
    { label: "Isrof Tahlili", href: "/inventory/waste-analysis", icon: BarChart3 },
  ];

  return (
    <div className="flex flex-col mb-1 w-full">
      <button
        onClick={handleParentClick}
        className={`
          group flex items-center justify-between w-full rounded-xl px-3 py-2.5
          text-[13px] font-medium transition-all duration-150
          ${
            isParentActive
              ? "bg-indigo-50/70 border border-indigo-100/50 text-indigo-700 shadow-sm backdrop-blur-md"
              : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
          }
          ${collapsed && !isMobile ? "justify-center px-0" : ""}
        `}
        title={collapsed && !isMobile ? "Sklad (Inventory)" : undefined}
      >
        <div className="flex items-center gap-3">
          <Package 
            size={19} 
            strokeWidth={isParentActive ? 2.2 : 1.8} 
            className={`shrink-0 transition-colors ${
              isParentActive ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-500"
            }`}
          />
          {(!collapsed || isMobile) && <span>Sklad (Inventory)</span>}
        </div>
        
        {(!collapsed || isMobile) && (
          <motion.div
            animate={{ rotate: isOpen ? 90 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronRight size={16} className={isParentActive ? "text-indigo-500" : "text-slate-400"} />
          </motion.div>
        )}
      </button>

      {/* Sub menu using Framer Motion */}
      <AnimatePresence>
        {isOpen && (!collapsed || isMobile) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <ul className="flex flex-col gap-1 mt-1 pl-9 pr-2">
              {subItems.map((item) => {
                const ItemIcon = item.icon;
                const active = isActive(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={isMobile ? onClose : undefined}
                      className={`
                        flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors
                        ${active 
                          ? "bg-indigo-600 text-white shadow-sm shadow-indigo-200" 
                          : "text-slate-500 hover:bg-indigo-50/50 hover:text-indigo-700 backdrop-blur-sm"
                        }
                      `}
                    >
                      <ItemIcon 
                        size={15} 
                        className={active ? "text-white" : "text-slate-400"} 
                      />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

"use client";
import Link from "next/link";
import { ShieldOff } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-6">
          <ShieldOff size={40} className="text-red-500" />
        </div>
        <h1 className="text-2xl font-black text-slate-800 mb-2">Ruxsat yo'q</h1>
        <p className="text-slate-500 mb-8">Bu sahifaga kirish huquqingiz yo'q.</p>
        <Link href="/" className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-colors">
          Bosh sahifaga qaytish
        </Link>
      </div>
    </div>
  );
}

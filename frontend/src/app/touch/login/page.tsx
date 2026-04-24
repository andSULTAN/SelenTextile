"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authApi, ApiError } from "@/lib/api";
import { Delete } from "lucide-react";

function PinDots({ len, shake }: { len: number; shake: boolean }) {
  return (
    <div className={`flex items-center justify-center gap-5 my-8 ${shake ? "animate-[shake_0.4s_ease]" : ""}`}>
      {[0,1,2,3].map(i => (
        <div key={i} className={`w-5 h-5 rounded-full transition-all duration-150 ${
          i < len ? "bg-indigo-400 scale-110 shadow-lg shadow-indigo-500/40" : "bg-white/20"
        }`} />
      ))}
    </div>
  );
}

const PAD = ["1","2","3","4","5","6","7","8","9","clear","0","del"];

export default function TouchLoginPage() {
  const router = useRouter();
  const [pin, setPin]     = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);

  // Auto-submit when 4 digits
  useEffect(() => {
    if (pin.length === 4) submit(pin);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  const press = (key: string) => {
    if (loading) return;
    if (key === "del")   { setPin(p => p.slice(0,-1)); setError(""); return; }
    if (key === "clear") { setPin(""); setError(""); return; }
    if (pin.length < 4)  setPin(p => p + key);
  };

  const submit = async (p: string) => {
    setLoading(true); setError("");
    try {
      const user = await authApi.pinLogin(p);
      document.cookie = `userRole=${user.role}; path=/; SameSite=Lax`;
      document.cookie = `userId=${user.id}; path=/; SameSite=Lax`;
      document.cookie = `userPerms=${JSON.stringify(user.permissions ?? [])}; path=/; SameSite=Lax`;
      document.cookie = `touchName=${encodeURIComponent(user.name)}; path=/; SameSite=Lax`;

      const role = user.role.toUpperCase();
      if (role === "CUTTER")       router.push("/touch/cut");
      else if (role === "PACKER")  router.push("/touch/pack");
      else if (role === "MANAGER") router.push("/touch/menu");
      else                         router.push("/touch/menu");
    } catch (err) {
      setLoading(false);
      setPin("");
      setShake(true);
      setTimeout(() => setShake(false), 450);
      if (err instanceof ApiError && err.status === 401) {
        setError("Noto'g'ri PIN. Qayta urinib ko'ring.");
      } else {
        setError("Serverga ulanishda xatolik.");
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 select-none">
      <div className="w-full max-w-xs">

        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-2xl shadow-indigo-500/30 mb-5">
            <span className="text-white font-black text-3xl">ST</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Selen Textile</h1>
          <p className="text-slate-400 text-sm mt-1 font-medium">PIN kodingizni kiriting</p>
        </div>

        {/* PIN dots */}
        <PinDots len={pin.length} shake={shake} />

        {/* Error */}
        {error && (
          <p className="text-center text-red-400 text-sm font-semibold mb-4">{error}</p>
        )}

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-3">
          {PAD.map(key => {
            const isAction = key === "del" || key === "clear";
            return (
              <button
                key={key}
                onPointerDown={() => press(key)}
                disabled={loading}
                className={`
                  h-[72px] rounded-2xl text-2xl font-bold transition-all duration-100
                  active:scale-90 touch-manipulation
                  ${key === "del"
                    ? "bg-red-500/20 text-red-400 border border-red-500/20"
                    : key === "clear"
                    ? "bg-white/10 text-slate-400 border border-white/10"
                    : "bg-white/10 text-white border border-white/10 hover:bg-white/20"
                  }
                  ${loading ? "opacity-40" : ""}
                `}
              >
                {key === "del" ? <Delete size={22} className="mx-auto" /> : key === "clear" ? "C" : key}
              </button>
            );
          })}
        </div>

        {loading && (
          <p className="text-center text-indigo-400 text-sm font-semibold mt-6 animate-pulse">
            Tekshirilmoqda...
          </p>
        )}
      </div>

      <style>{`
        @keyframes shake {
          0%,100%{transform:translateX(0)}
          20%{transform:translateX(-10px)}
          40%{transform:translateX(10px)}
          60%{transform:translateX(-8px)}
          80%{transform:translateX(8px)}
        }
      `}</style>
    </div>
  );
}

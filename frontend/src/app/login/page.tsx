"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authApi, ApiError } from "@/lib/api";
import { Lock, User, Loader2, Delete } from "lucide-react";

// ── PIN dots indicator ─────────────────────────────────────────────────────
function PinDots({ length, shake }: { length: number; shake: boolean }) {
  return (
    <div className={`flex items-center justify-center gap-5 my-7 ${shake ? "animate-[shake_0.4s_ease]" : ""}`}>
      {[0, 1, 2, 3].map(i => (
        <div
          key={i}
          className={`w-4 h-4 rounded-full transition-all duration-150 ${
            i < length ? "bg-indigo-600 scale-110 shadow-md shadow-indigo-300" : "bg-slate-200"
          }`}
        />
      ))}
    </div>
  );
}

const PAD_KEYS = ["1","2","3","4","5","6","7","8","9","clear","0","backspace"];

// ──────────────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const router = useRouter();

  // "pin" — xodimlar (faqat 4 raqam, username yo'q)
  // "password" — admin (username + parol)
  const [mode, setMode]         = useState<"pin" | "password">("pin");
  const [pin, setPin]           = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [shake, setShake]       = useState(false);

  // Auto-submit when 4 digits entered (PIN mode)
  useEffect(() => {
    if (mode === "pin" && pin.length === 4) submitPin(pin);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  const handleNumpad = (key: string) => {
    if (loading) return;
    if (key === "backspace") { setPin(p => p.slice(0, -1)); setError(null); }
    else if (key === "clear") { setPin(""); setError(null); }
    else if (pin.length < 4) setPin(p => p + key);
  };

  // ── PIN LOGIN (faqat pin, username yo'q) ───────────────────────────────
  const submitPin = async (p: string) => {
    setLoading(true); setError(null);
    try {
      const user = await authApi.pinLogin(p);
      setCookies(user);
      redirect(user.role);
    } catch (err) {
      setPin("");
      setShake(true);
      setTimeout(() => setShake(false), 450);
      if (err instanceof ApiError && err.status === 401) {
        setError("Noto'g'ri PIN. Qayta urinib ko'ring.");
      } else {
        setError("Serverga ulanishda xatolik.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ── PASSWORD LOGIN (admin, username + parol) ───────────────────────────
  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setLoading(true); setError(null);
    try {
      const user = await authApi.login(username.trim(), password, "password");
      setCookies(user);
      redirect(user.role);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError("Noto'g'ri login yoki parol.");
      } else {
        setError("Serverga ulanishda xatolik.");
      }
    } finally {
      setLoading(false);
    }
  };

  const setCookies = (user: { id: number; role: string; permissions?: string[]; name?: string; full_name?: string }) => {
    document.cookie = `userRole=${user.role}; path=/; SameSite=Lax`;
    document.cookie = `userId=${user.id}; path=/; SameSite=Lax`;
    document.cookie = `userPerms=${JSON.stringify(user.permissions ?? [])}; path=/; SameSite=Lax`;
    const displayName = user.name || user.full_name || "";
    if (displayName) document.cookie = `touchName=${encodeURIComponent(displayName)}; path=/; SameSite=Lax`;
  };

  const redirect = (role: string) => {
    const r = role.toUpperCase();
    if (r === "CUTTER")  router.push("/touch/cut");
    else if (r === "PACKER")  router.push("/touch/pack");
    else if (r === "MANAGER") router.push("/touch/menu");
    else                      router.push("/"); // ADMIN va boshqalar
  };

  const switchMode = (m: "pin" | "password") => {
    setMode(m); setError(null); setPin(""); setPassword(""); setUsername("");
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl shadow-lg mb-4">
            <Lock size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Selen Textile</h1>
          <p className="text-slate-500 font-medium mt-1">ERP tizimiga kirish</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">

          {/* Mode tabs */}
          <div className="flex border-b border-slate-100">
            <button
              onClick={() => switchMode("pin")}
              className={`flex-1 py-3 text-sm font-bold transition-colors ${
                mode === "pin" ? "text-indigo-600 border-b-2 border-indigo-600" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              PIN bilan kirish
            </button>
            <button
              onClick={() => switchMode("password")}
              className={`flex-1 py-3 text-sm font-bold transition-colors ${
                mode === "password" ? "text-indigo-600 border-b-2 border-indigo-600" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              Admin (parol)
            </button>
          </div>

          <div className="p-6">

            {/* ── PIN MODE — username yo'q, faqat numpad ── */}
            {mode === "pin" && (
              <>
                <p className="text-center text-sm text-slate-400 font-medium mb-1">
                  PIN kodingizni kiriting
                </p>
                <PinDots length={pin.length} shake={shake} />

                <div className="grid grid-cols-3 gap-2.5">
                  {PAD_KEYS.map(key => (
                    <button
                      key={key}
                      onClick={() => handleNumpad(key)}
                      disabled={loading}
                      className={`
                        h-14 rounded-xl text-xl font-bold transition-all active:scale-95
                        ${key === "backspace"
                          ? "bg-red-50 text-red-500 hover:bg-red-100 border border-red-100"
                          : key === "clear"
                          ? "bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200"
                          : "bg-slate-50 text-slate-800 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200"
                        }
                        ${loading ? "opacity-40 cursor-not-allowed" : ""}
                      `}
                    >
                      {key === "backspace"
                        ? <Delete size={20} className="mx-auto" />
                        : key === "clear" ? "C" : key}
                    </button>
                  ))}
                </div>

                {loading && (
                  <p className="text-center text-indigo-500 text-sm font-semibold mt-4 flex items-center justify-center gap-2">
                    <Loader2 size={16} className="animate-spin" /> Tekshirilmoqda...
                  </p>
                )}
              </>
            )}

            {/* ── PASSWORD MODE — admin uchun (username + parol) ── */}
            {mode === "password" && (
              <form onSubmit={submitPassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Login</label>
                  <div className="relative">
                    <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      placeholder="admin"
                      autoComplete="username"
                      required
                      className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Parol</label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      required
                      className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  {loading ? <><Loader2 size={20} className="animate-spin" /> Kirilmoqda...</> : "Kirish"}
                </button>
              </form>
            )}

            {/* Error */}
            {error && (
              <div className="mt-3 bg-red-50 border border-red-200 text-red-600 text-sm font-medium px-4 py-3 rounded-xl">
                {error}
              </div>
            )}
          </div>
        </div>
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

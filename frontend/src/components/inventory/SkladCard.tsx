import { Image as ImageIcon, Layers, ChevronRight } from "lucide-react";

interface SkladCardProps {
  item: any;
  onHistory: (batch: string) => void;
  onModelSlider: (images: any[]) => void;
  onImagePreview: (url: string) => void;
}

export default function SkladCard({
  item,
  onHistory,
  onModelSlider,
  onImagePreview,
}: SkladCardProps) {
  const date = new Date(item.created_at).toLocaleDateString("uz-UZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const availableKg = Math.floor(item.available_kg ?? 0);
  const totalBrakKg = Math.floor(item.total_brak_kg ?? item.waste_kg ?? 0);
  const stockOk = availableKg > 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      {/* ── Top row ── */}
      <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-3 border-b border-slate-100">
        <div className="flex-1 min-w-0">
          {/* Batch + date */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => onHistory(item.batch_number)}
              className="font-bold text-indigo-600 hover:text-indigo-800 hover:underline text-sm"
            >
              #{item.batch_number}
            </button>
            <span className="text-xs text-slate-400">{date}</span>
          </div>

          {/* Model items with full images */}
          {item.assigned_models_detail?.length > 0 && (
            <div className="flex flex-col gap-2 mt-2">
              {item.assigned_models_detail.map((m: any) => (
                <div key={m.id} className="flex items-center gap-2 flex-wrap">
                  {/* Name side */}
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-indigo-50/50 border border-indigo-100 text-indigo-800 text-xs font-semibold whitespace-nowrap">
                    <Layers size={13} className="text-indigo-500" />
                    {m.name}
                  </div>
                  
                  {/* Images side */}
                  {m.images?.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      {m.images.map((img: any, idx: number) => (
                        <button
                          key={idx}
                          onClick={() => onModelSlider(m.images)}
                          className="hover:ring-2 hover:ring-indigo-300 rounded transition-all"
                          title="Rasmlarni kattalashtirib ko'rish"
                        >
                          <img
                            src={img.image}
                            alt={`${m.name} rasm ${idx + 1}`}
                            className="w-8 h-8 rounded object-cover border border-slate-200 shadow-sm"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Fabric image thumbnail */}
        <div className="flex-shrink-0">
          {item.fabric_image ? (
            <button onClick={() => onImagePreview(item.fabric_image)}>
              <img
                src={item.fabric_image}
                alt="Mato"
                className="w-14 h-14 object-cover rounded-xl border border-slate-200 hover:border-indigo-400 transition"
              />
            </button>
          ) : (
            <div className="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-300">
              <ImageIcon size={20} />
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom stats row ── */}
      <div className="grid grid-cols-6 divide-x divide-slate-100 px-1 py-2">
        {/* To'quvchi */}
        <div className="px-3 py-1">
          <p className="text-[10px] text-slate-400 uppercase tracking-wide">To'quvchi</p>
          <p className="text-sm font-semibold text-slate-700 truncate">
            {item.supplier_weaver || "—"}
          </p>
        </div>

        {/* Bo'yoqchi */}
        <div className="px-3 py-1">
          <p className="text-[10px] text-slate-400 uppercase tracking-wide">Bo'yoqchi</p>
          <p className="text-sm font-medium text-slate-600 truncate">
            {item.supplier_dyer || "—"}
          </p>
        </div>

        {/* Kg */}
        <div className="px-3 py-1">
          <p className="text-[10px] text-slate-400 uppercase tracking-wide">Jami kg</p>
          <p className="text-sm font-bold text-slate-800">
            {Math.floor(item.total_kg)}
          </p>
        </div>

        {/* Rulon */}
        <div className="px-3 py-1">
          <p className="text-[10px] text-slate-400 uppercase tracking-wide">Rulon</p>
          <p className="text-sm font-bold text-slate-800">{item.roll_count}</p>
        </div>

        {/* Qoldiq */}
        <div className="px-3 py-1">
          <p className="text-[10px] text-slate-400 uppercase tracking-wide">Qoldiq</p>
          <span
            className={`text-xs font-bold px-1.5 py-0.5 rounded-md w-fit ${
              stockOk
                ? "bg-emerald-100 text-emerald-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {availableKg} kg
          </span>
        </div>

        {/* Brak */}
        <div className="px-3 py-1">
          <p className="text-[10px] text-slate-400 uppercase tracking-wide">Brak</p>
          {totalBrakKg > 0 ? (
            <span className="text-xs font-bold px-1.5 py-0.5 rounded-md w-fit bg-amber-100 text-amber-700">
              {totalBrakKg} kg
            </span>
          ) : (
            <span className="text-xs text-slate-300">—</span>
          )}
        </div>
      </div>

      {/* Tarix tugmasi */}
      <button
        onClick={() => onHistory(item.batch_number)}
        className="w-full flex items-center justify-center gap-1 py-2 text-xs text-slate-400 hover:text-indigo-600 hover:bg-indigo-50/50 transition border-t border-slate-100"
      >
        Tarixni ko'rish <ChevronRight size={13} />
      </button>
    </div>
  );
}

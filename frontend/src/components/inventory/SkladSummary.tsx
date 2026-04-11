import { Package, Weight, Layers, AlertTriangle } from "lucide-react";

interface SummaryProps {
  totalBatches: number;
  totalKg: number;
  totalRolls: number;
  totalBrakKg: number;
}

export default function SkladSummary({
  totalBatches,
  totalKg,
  totalRolls,
  totalBrakKg,
}: SummaryProps) {
  const cards = [
    {
      label: "Jami partiyalar",
      value: totalBatches,
      unit: "ta",
      icon: Package,
      bg: "bg-indigo-50",
      iconColor: "text-indigo-600",
      valueColor: "text-indigo-700",
    },
    {
      label: "Jami kg",
      value: totalKg.toLocaleString(),
      unit: "kg",
      icon: Weight,
      bg: "bg-emerald-50",
      iconColor: "text-emerald-600",
      valueColor: "text-emerald-700",
    },
    {
      label: "Jami rulon",
      value: totalRolls.toLocaleString(),
      unit: "ta",
      icon: Layers,
      bg: "bg-sky-50",
      iconColor: "text-sky-600",
      valueColor: "text-sky-700",
    },
    {
      label: "Brak jami",
      value: totalBrakKg.toLocaleString(),
      unit: "kg",
      icon: AlertTriangle,
      bg: "bg-red-50",
      iconColor: "text-red-500",
      valueColor: "text-red-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((c) => (
        <div
          key={c.label}
          className={`${c.bg} rounded-2xl p-4 flex items-center gap-3 border border-white shadow-sm`}
        >
          <div className={`p-2.5 rounded-xl bg-white/70 ${c.iconColor}`}>
            <c.icon size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">{c.label}</p>
            <p className={`text-xl font-bold ${c.valueColor}`}>
              {c.value}
              <span className="text-sm font-normal ml-1">{c.unit}</span>
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

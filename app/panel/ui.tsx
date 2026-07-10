// Wspólne małe komponenty prezentacyjne panelu.

const STATUS_STYLE: Record<string, string> = {
  booked: "bg-emerald-50 text-emerald-700",
  done: "bg-slate-100 text-slate-600",
  cancelled: "bg-red-50 text-red-700",
  no_show: "bg-amber-50 text-amber-700",
};

const STATUS_LABEL: Record<string, string> = {
  booked: "Zarezerwowana",
  done: "Zrealizowana",
  cancelled: "Odwołana",
  no_show: "Nie przyszedł",
};

export function StatusBadge({ status, source }: { status: string; source?: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={`badge ${STATUS_STYLE[status] ?? "bg-slate-100 text-slate-600"}`}>
        {STATUS_LABEL[status] ?? status}
      </span>
      {source === "online" && (
        <span className="badge bg-brand-50 text-brand-700">online</span>
      )}
    </span>
  );
}

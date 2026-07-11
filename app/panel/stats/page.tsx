import Link from "next/link";
import { requireProvider } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fmtPrice } from "@/lib/format";
import { addDays, fmtDate } from "@/lib/time";

// Statystyki (roadmapa v2, PLAN.md sekcja 8): przychody, no-show rate, najpopularniejsze usługi.
// Przychód liczony ze snapshotu ceny zapisanego przy rezerwacji (Appointment.priceGrosze);
// dla starszych wizyt bez snapshotu — fallback na bieżącą cenę usługi.

const PERIODS = [
  { days: 30, label: "30 dni" },
  { days: 90, label: "90 dni" },
  { days: 365, label: "Rok" },
];

const MONTH_PL = ["sty", "lut", "mar", "kwi", "maj", "cze", "lip", "sie", "wrz", "paź", "lis", "gru"];
const MONTH_CHART_COUNT = 6;

function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return `${MONTH_PL[m - 1]} ${y}`;
}

// Klucze "yyyy-MM" ostatnich `count` miesięcy (czas warszawski), od najstarszego.
function lastMonthKeys(now: Date, count: number): string[] {
  let [y, m] = fmtDate(now).slice(0, 7).split("-").map(Number);
  const keys: string[] = [];
  for (let i = 0; i < count; i++) {
    keys.unshift(`${y}-${String(m).padStart(2, "0")}`);
    m--;
    if (m === 0) {
      m = 12;
      y--;
    }
  }
  return keys;
}

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ okres?: string }>;
}) {
  const { okres } = await searchParams;
  const provider = await requireProvider();
  const days = PERIODS.some((p) => p.days === Number(okres)) ? Number(okres) : 30;
  const now = new Date();
  const since = addDays(now, -days);

  const [inPeriod, doneForMonths] = await Promise.all([
    // Wizyty rozpoczęte w wybranym okresie (przyszłe nie wchodzą do statystyk).
    prisma.appointment.findMany({
      where: { providerId: provider.id, startAt: { gte: since, lte: now } },
      select: {
        status: true,
        source: true,
        serviceId: true,
        priceGrosze: true,
        service: { select: { name: true, priceGrosze: true } },
      },
    }),
    // Zrealizowane wizyty do wykresu miesięcznego (zapas dni > MONTH_CHART_COUNT miesięcy).
    prisma.appointment.findMany({
      where: {
        providerId: provider.id,
        status: "done",
        startAt: { gte: addDays(now, -(MONTH_CHART_COUNT + 1) * 31), lte: now },
      },
      select: { startAt: true, priceGrosze: true, service: { select: { priceGrosze: true } } },
    }),
  ]);

  const done = inPeriod.filter((a) => a.status === "done");
  const noShow = inPeriod.filter((a) => a.status === "no_show");
  const cancelled = inPeriod.filter((a) => a.status === "cancelled");
  const revenue = done.reduce((sum, a) => sum + (a.priceGrosze ?? a.service?.priceGrosze ?? 0), 0);
  const finished = done.length + noShow.length;
  const noShowRate = finished > 0 ? noShow.length / finished : null;
  const online = inPeriod.filter((a) => a.source === "online").length;
  const onlineRate = inPeriod.length > 0 ? online / inPeriod.length : null;

  // Top usługi: popularność wśród wizyt nieodwołanych, przychód ze zrealizowanych.
  const byService = new Map<string, { name: string; count: number; revenue: number }>();
  for (const a of inPeriod) {
    if (a.status === "cancelled" || !a.serviceId || !a.service) continue;
    const entry = byService.get(a.serviceId) ?? { name: a.service.name, count: 0, revenue: 0 };
    entry.count++;
    if (a.status === "done") entry.revenue += a.priceGrosze ?? a.service.priceGrosze;
    byService.set(a.serviceId, entry);
  }
  const topServices = [...byService.entries()]
    .map(([id, s]) => ({ id, ...s }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const maxServiceCount = topServices[0]?.count ?? 0;

  // Przychód miesięcznie.
  const monthKeys = lastMonthKeys(now, MONTH_CHART_COUNT);
  const byMonth = new Map(monthKeys.map((k) => [k, 0]));
  for (const a of doneForMonths) {
    const key = fmtDate(a.startAt).slice(0, 7);
    if (byMonth.has(key)) {
      byMonth.set(key, (byMonth.get(key) ?? 0) + (a.priceGrosze ?? a.service?.priceGrosze ?? 0));
    }
  }
  const maxMonthRevenue = Math.max(...byMonth.values(), 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Statystyki</h1>
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <Link
              key={p.days}
              href={`/panel/stats?okres=${p.days}`}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                days === p.days
                  ? "bg-brand-50 text-brand-700"
                  : "text-ink-500 hover:bg-ink-100 hover:text-ink-800"
              }`}
            >
              {p.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Stat label="Przychód (zrealizowane)" value={fmtPrice(revenue)} />
        <Stat label="Zrealizowane wizyty" value={String(done.length)} />
        <Stat
          label="No-show rate"
          value={noShowRate === null ? "—" : `${Math.round(noShowRate * 100)}%`}
          hint={finished > 0 ? `${noShow.length} z ${finished} zakończonych` : "brak zakończonych wizyt"}
        />
        <Stat label="Odwołane wizyty" value={String(cancelled.length)} />
        <Stat
          label="Rezerwacje online"
          value={onlineRate === null ? "—" : `${Math.round(onlineRate * 100)}%`}
          hint={inPeriod.length > 0 ? `${online} z ${inPeriod.length} wizyt` : undefined}
        />
        <Stat
          label="Średnia wartość wizyty"
          value={done.length > 0 ? fmtPrice(Math.round(revenue / done.length)) : "—"}
        />
      </div>

      <div className="card">
        <h2 className="mb-4 text-lg font-semibold">Najpopularniejsze usługi</h2>
        {topServices.length === 0 ? (
          <p className="text-sm text-slate-500">Brak wizyt w wybranym okresie.</p>
        ) : (
          <ul className="space-y-3">
            {topServices.map((s) => (
              <li key={s.id}>
                <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                  <span className="font-medium">{s.name}</span>
                  <span className="text-slate-500">
                    {s.count} wiz. · {fmtPrice(s.revenue)}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-ink-100">
                  <div
                    className="h-full rounded-full bg-brand-gradient"
                    style={{ width: `${(s.count / maxServiceCount) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-slate-400">
          Liczba wizyt bez odwołanych; przychód tylko ze zrealizowanych.
        </p>
      </div>

      <div className="card">
        <h2 className="mb-4 text-lg font-semibold">Przychód miesięcznie</h2>
        <ul className="space-y-3">
          {monthKeys.map((key) => {
            const value = byMonth.get(key) ?? 0;
            return (
              <li key={key} className="flex items-center gap-3">
                <span className="w-20 shrink-0 text-sm text-slate-500">{monthLabel(key)}</span>
                <div className="h-4 flex-1 overflow-hidden rounded-full bg-ink-100">
                  <div
                    className="h-full rounded-full bg-brand-gradient"
                    style={{ width: `${(value / maxMonthRevenue) * 100}%` }}
                  />
                </div>
                <span className="w-24 shrink-0 text-right text-sm font-medium">
                  {fmtPrice(value)}
                </span>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-xs text-slate-400">
          Zrealizowane wizyty z ostatnich {MONTH_CHART_COUNT} miesięcy, wg cen z momentu rezerwacji.
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card">
      <div className="text-2xl font-bold text-brand-700">{value}</div>
      <div className="mt-1 text-sm text-slate-500">{label}</div>
      {hint && <div className="mt-0.5 text-xs text-slate-400">{hint}</div>}
    </div>
  );
}

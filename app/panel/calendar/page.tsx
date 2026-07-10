import Link from "next/link";
import { requireProvider } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  addDays,
  fmtDate,
  fmtDateHuman,
  fmtTime,
  warsawStartOfDay,
  warsawWeekday,
  weekdayNamePl,
} from "@/lib/time";
import { fmtPrice } from "@/lib/format";
import { StatusBadge } from "../ui";
import { AddForms } from "./add-forms";
import { AppointmentActions } from "./appointment-actions";
import { DeleteBlockButton } from "./delete-block";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const provider = await requireProvider();
  const params = await searchParams;
  const weekOffset = Number(params.week ?? 0) || 0;

  // Poniedziałek bieżącego (± offset) tygodnia, liczony w strefie warszawskiej.
  const now = new Date();
  const todayStart = warsawStartOfDay(now);
  const wd = warsawWeekday(now); // 0=niedziela
  const daysSinceMonday = (wd + 6) % 7;
  const weekStart = warsawStartOfDay(addDays(todayStart, -daysSinceMonday + weekOffset * 7));
  const days = Array.from({ length: 7 }, (_, i) => warsawStartOfDay(addDays(weekStart, i)));
  const weekEnd = warsawStartOfDay(addDays(weekStart, 7));

  const [appointments, blocks] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        providerId: provider.id,
        startAt: { gte: weekStart, lt: weekEnd },
        status: { in: ["booked", "done", "no_show"] },
      },
      include: { service: true, client: true, staff: true },
      orderBy: { startAt: "asc" },
    }),
    prisma.timeBlock.findMany({
      where: { providerId: provider.id, startAt: { gte: weekStart, lt: weekEnd } },
      orderBy: { startAt: "asc" },
    }),
  ]);

  const [services, staff] = await Promise.all([
    prisma.service.findMany({
      where: { providerId: provider.id, active: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.staffMember.findMany({
      where: { providerId: provider.id, active: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  // Grupowanie po dacie (YYYY-MM-DD w TZ).
  const byDay = new Map<string, { appts: typeof appointments; blocks: typeof blocks }>();
  for (const d of days) byDay.set(fmtDate(d), { appts: [], blocks: [] });
  for (const a of appointments) byDay.get(fmtDate(a.startAt))?.appts.push(a);
  for (const b of blocks) byDay.get(fmtDate(b.startAt))?.blocks.push(b);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Kalendarz</h1>
        <div className="flex items-center gap-2">
          <Link href={`/panel/calendar?week=${weekOffset - 1}`} className="btn-secondary px-3 py-1.5">← Poprzedni</Link>
          {weekOffset !== 0 && (
            <Link href="/panel/calendar" className="btn-secondary px-3 py-1.5">Dziś</Link>
          )}
          <Link href={`/panel/calendar?week=${weekOffset + 1}`} className="btn-secondary px-3 py-1.5">Następny →</Link>
        </div>
      </div>

      <p className="text-sm text-slate-500">
        Tydzień: {fmtDateHuman(weekStart)} – {fmtDateHuman(addDays(weekStart, 6))}
      </p>

      {/* Siatka tygodnia */}
      <div className="grid gap-3 md:grid-cols-7">
        {days.map((d) => {
          const key = fmtDate(d);
          const cell = byDay.get(key)!;
          const isToday = key === fmtDate(todayStart);
          return (
            <div
              key={key}
              className={`rounded-lg border p-2 ${isToday ? "border-brand-400 bg-brand-50/40" : "border-slate-200 bg-white"}`}
            >
              <div className="mb-2 border-b border-slate-100 pb-1">
                <div className="text-xs font-medium uppercase text-slate-400">
                  {weekdayNamePl(warsawWeekday(d)).slice(0, 3)}
                </div>
                <div className="text-sm font-semibold">{fmtDateHuman(d).slice(0, 5)}</div>
              </div>

              <div className="space-y-1.5">
                {cell.appts.length === 0 && cell.blocks.length === 0 && (
                  <div className="py-2 text-center text-xs text-slate-300">—</div>
                )}

                {cell.blocks.map((b) => (
                  <div key={b.id} className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-500">
                    <div className="flex items-center justify-between">
                      <span>🚫 {fmtTime(b.startAt)}–{fmtTime(b.endAt)}</span>
                      <DeleteBlockButton id={b.id} />
                    </div>
                    {b.reason && <div className="truncate">{b.reason}</div>}
                  </div>
                ))}

                {cell.appts.map((a) => (
                  <div
                    key={a.id}
                    className={`rounded border-l-2 px-2 py-1 text-xs ${
                      a.status === "booked"
                        ? "border-emerald-400 bg-emerald-50"
                        : a.status === "no_show"
                        ? "border-amber-400 bg-amber-50"
                        : "border-slate-300 bg-slate-50"
                    }`}
                  >
                    <div className="font-semibold">{fmtTime(a.startAt)}–{fmtTime(a.endAt)}</div>
                    <div className="truncate">{a.client?.name ?? "—"}</div>
                    <div className="truncate text-slate-500">
                      {a.service ? `${a.service.name} · ${fmtPrice(a.service.priceGrosze)}` : "—"}
                    </div>
                    {a.staff && (
                      <div className="truncate text-brand-600">→ {a.staff.name}</div>
                    )}
                    <div className="mt-1 flex items-center justify-between">
                      <StatusBadge status={a.status} source={a.source} />
                      <AppointmentActions id={a.id} status={a.status} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Dodawanie */}
      <AddForms
        services={services.map((s) => ({
          id: s.id,
          name: s.name,
          durationMin: s.durationMin,
          priceGrosze: s.priceGrosze,
        }))}
        staff={staff.map((s) => ({ id: s.id, name: s.name, role: s.role }))}
        defaultDate={fmtDate(todayStart)}
      />
    </div>
  );
}

import Link from "next/link";
import { requireProvider } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fmtDateHuman, fmtTime, weekdayNamePl, warsawWeekday } from "@/lib/time";
import { fmtPrice } from "@/lib/format";
import { StatusBadge } from "./ui";
import { AppointmentActions } from "./calendar/appointment-actions";

export default async function DashboardPage() {
  const provider = await requireProvider();
  const now = new Date();

  const upcoming = await prisma.appointment.findMany({
    where: { providerId: provider.id, status: "booked", startAt: { gte: now } },
    orderBy: { startAt: "asc" },
    take: 20,
    include: { service: true, client: true },
  });

  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const [weekCount, clientCount, doneCount] = await Promise.all([
    prisma.appointment.count({
      where: { providerId: provider.id, status: "booked", startAt: { gte: startOfWeek } },
    }),
    prisma.client.count({ where: { providerId: provider.id } }),
    prisma.appointment.count({ where: { providerId: provider.id, status: "done" } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Pulpit</h1>
        <Link href="/panel/calendar" className="btn-primary">
          + Dodaj wizytę
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Stat label="Wizyty w tym tygodniu" value={weekCount} />
        <Stat label="Klienci w bazie" value={clientCount} />
        <Stat label="Zrealizowane wizyty" value={doneCount} />
      </div>

      <div className="card">
        <h2 className="mb-4 text-lg font-semibold">Nadchodzące wizyty</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-slate-500">
            Brak zaplanowanych wizyt. Dodaj wizytę ręcznie lub udostępnij klientom{" "}
            <Link href="/panel/settings" className="text-brand-600 underline">
              stronę rezerwacji
            </Link>
            .
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {upcoming.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <div className="font-medium">
                    {weekdayNamePl(warsawWeekday(a.startAt))}, {fmtDateHuman(a.startAt)} • {fmtTime(a.startAt)}–{fmtTime(a.endAt)}
                  </div>
                  <div className="text-sm text-slate-600">
                    {a.client?.name ?? "—"} · {a.client?.phone ?? ""}
                    {a.service && (
                      <>
                        {" "}· {a.service.name} ({fmtPrice(a.priceGrosze ?? a.service.priceGrosze)})
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={a.status} source={a.source} />
                  <AppointmentActions id={a.id} status={a.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card">
      <div className="text-3xl font-bold text-brand-700">{value}</div>
      <div className="mt-1 text-sm text-slate-500">{label}</div>
    </div>
  );
}

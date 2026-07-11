import Link from "next/link";
import { prisma } from "@/lib/db";
import { getClientPhone } from "@/lib/client-auth";
import { fmtDateHuman, fmtTime, warsawWeekday, weekdayNamePl } from "@/lib/time";
import { fmtPrice } from "@/lib/format";
import { AuthShell } from "../auth-ui";
import { ClientLogin } from "./client-login";
import { CancelButton } from "./cancel-button";
import { logoutClient } from "./actions";
import { StatusBadge } from "../panel/ui";

export default async function ClientPanelPage() {
  const phone = await getClientPhone();

  // Niezalogowany → logowanie kodem SMS.
  if (!phone) {
    return (
      <AuthShell
        title="Panel klienta"
        subtitle="Zobacz i zarządzaj swoimi wizytami — zaloguj się numerem telefonu."
        footer={
          <Link href="/" className="font-medium text-brand-600 hover:underline">
            ← Wróć na stronę główną
          </Link>
        }
      >
        <ClientLogin />
      </AuthShell>
    );
  }

  const now = new Date();
  const appts = await prisma.appointment.findMany({
    where: { client: { phone }, status: { in: ["booked", "done", "no_show", "cancelled"] } },
    include: { service: true, staff: true, provider: { select: { name: true, slug: true } } },
    orderBy: { startAt: "desc" },
    take: 100,
  });

  const upcoming = appts
    .filter((a) => a.status === "booked" && a.startAt >= now)
    .sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
  const past = appts.filter((a) => !(a.status === "booked" && a.startAt >= now));

  return (
    <main className="min-h-screen bg-ink-50">
      <header className="sticky top-0 z-30 border-b border-ink-100 bg-white/80 backdrop-blur-md safe-t">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-gradient text-sm font-bold text-white">
              B
            </span>
            <span className="text-lg font-bold tracking-tight">Moje wizyty</span>
          </div>
          <form action={logoutClient}>
            <button className="text-sm text-ink-500 hover:text-ink-900">Wyloguj</button>
          </form>
        </div>
      </header>

      <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 safe-b">
        <section>
          <h2 className="mb-3 text-lg font-semibold">Nadchodzące</h2>
          {upcoming.length === 0 ? (
            <div className="card text-sm text-ink-500">
              Brak zaplanowanych wizyt. Zarezerwuj termin u swojego usługodawcy.
            </div>
          ) : (
            <ul className="space-y-3">
              {upcoming.map((a) => (
                <li key={a.id} className="card flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wide text-brand-600">
                      {a.provider.name}
                    </div>
                    <div className="mt-0.5 font-semibold">
                      {weekdayNamePl(warsawWeekday(a.startAt))}, {fmtDateHuman(a.startAt)} • {fmtTime(a.startAt)}
                    </div>
                    <div className="text-sm text-ink-600">
                      {a.service ? `${a.service.name} · ${fmtPrice(a.priceGrosze ?? a.service.priceGrosze)}` : "Wizyta"}
                      {a.staff && <> · {a.staff.name}</>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={`/cancel/${a.cancelToken}`}
                      className="btn-ghost px-3 py-1.5 text-xs"
                    >
                      Zmień termin
                    </a>
                    <CancelButton id={a.id} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {past.length > 0 && (
          <section>
            <h2 className="mb-3 text-lg font-semibold">Historia</h2>
            <ul className="space-y-2">
              {past.map((a) => (
                <li key={a.id} className="card flex flex-wrap items-center justify-between gap-2 py-3">
                  <div className={a.status === "cancelled" ? "opacity-60" : ""}>
                    <div className="text-sm font-medium">
                      {fmtDateHuman(a.startAt)} • {fmtTime(a.startAt)} — {a.provider.name}
                    </div>
                    <div className="text-sm text-ink-500">
                      {a.service ? a.service.name : "Wizyta"}
                      {a.staff && <> · {a.staff.name}</>}
                    </div>
                  </div>
                  <StatusBadge status={a.status} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}

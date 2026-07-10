import { prisma } from "@/lib/db";
import { fmtDateTime } from "@/lib/time";
import { fmtPrice } from "@/lib/format";
import { bookingUrl } from "@/lib/tokens";
import { CancelButton } from "./cancel-button";

export default async function CancelPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const appt = await prisma.appointment.findUnique({
    where: { cancelToken: token },
    include: { service: true, provider: true },
  });

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        {!appt ? (
          <div className="card text-center">
            <h1 className="text-lg font-semibold">Nie znaleziono rezerwacji</h1>
            <p className="mt-2 text-sm text-slate-500">Link jest nieprawidłowy lub wygasł.</p>
          </div>
        ) : (
          <div className="card">
            <h1 className="text-xl font-semibold">Twoja wizyta</h1>
            <div className="mt-3 space-y-1 text-slate-700">
              <p><span className="text-slate-400">Usługodawca:</span> {appt.provider.name}</p>
              <p><span className="text-slate-400">Usługa:</span> {appt.service?.name ?? "—"}</p>
              <p><span className="text-slate-400">Termin:</span> {fmtDateTime(appt.startAt)}</p>
              {appt.service && (
                <p><span className="text-slate-400">Cena:</span> {fmtPrice(appt.service.priceGrosze)}</p>
              )}
            </div>

            <div className="mt-5">
              {appt.status === "booked" && appt.startAt.getTime() > Date.now() ? (
                <CancelButton token={token} rebookUrl={bookingUrl(appt.provider.slug)} />
              ) : (
                <div className="rounded-lg bg-slate-100 p-3 text-center text-sm text-slate-600">
                  {appt.status === "cancelled"
                    ? "Ta wizyta została odwołana."
                    : appt.status === "done"
                    ? "Ta wizyta została zrealizowana."
                    : appt.startAt.getTime() <= Date.now()
                    ? "Termin tej wizyty już minął."
                    : "Ta wizyta nie jest aktywna."}
                  <div className="mt-3">
                    <a href={bookingUrl(appt.provider.slug)} className="btn-primary inline-block">
                      Zarezerwuj nową wizytę
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

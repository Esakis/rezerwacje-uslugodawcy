import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { parseWorkingHours } from "@/lib/workingHours";
import { fmtDate } from "@/lib/time";
import { getClientIdentity, clientMatch } from "@/lib/client-auth";
import { BookingFlow } from "./booking-flow";

export default async function PublicBookingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const provider = await prisma.provider.findUnique({
    where: { slug },
    include: {
      services: { where: { active: true }, orderBy: { sortOrder: "asc" } },
      staff: { where: { active: true }, orderBy: { sortOrder: "asc" } },
    },
  });

  if (!provider) notFound();

  // Zalogowany klient (kod SMS lub e-mail) — rezerwacja bez ponownego logowania.
  const identity = await getClientIdentity();
  const knownClient = identity
    ? await prisma.client.findFirst({
        where: clientMatch(identity),
        orderBy: { createdAt: "desc" },
        select: { name: true, phone: true },
      })
    : null;

  const wh = parseWorkingHours(provider.workingHours);
  const openWeekdays = Object.entries(wh)
    .filter(([, intervals]) => intervals.length > 0)
    .map(([d]) => Number(d));

  const initials = provider.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <main className="min-h-screen bg-ink-50">
      {/* Nagłówek z gradientem marki */}
      <div className="bg-brand-gradient">
        <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-10 text-center safe-t">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 text-2xl font-bold text-white ring-1 ring-white/30 backdrop-blur">
            {initials}
          </div>
          <h1 className="mt-4 text-2xl font-bold text-white">{provider.name}</h1>
          {(provider.address || provider.city) && (
            <p className="mt-1 text-sm text-white/90">
              📍 {[provider.address, provider.city].filter(Boolean).join(", ")}
            </p>
          )}
          <p className="mt-1 text-sm text-white/80">Zarezerwuj wizytę online — zajmie mniej niż minutę</p>
        </div>
      </div>

      <div className="mx-auto -mt-6 max-w-2xl px-4 pb-16">
        {provider.services.length === 0 ? (
          <div className="card text-center text-ink-500">
            Ten usługodawca nie skonfigurował jeszcze usług.
          </div>
        ) : (
          <BookingFlow
            slug={provider.slug}
            providerName={provider.name}
            services={provider.services.map((s) => ({
              id: s.id,
              name: s.name,
              durationMin: s.durationMin,
              priceGrosze: s.priceGrosze,
            }))}
            staff={provider.staff.map((s) => ({
              id: s.id,
              name: s.name,
              role: s.role,
            }))}
            openWeekdays={openWeekdays}
            todayDate={fmtDate(new Date())}
            clientPhone={identity?.phone ?? null}
            clientEmail={identity?.email ?? null}
            clientName={knownClient?.name ?? ""}
            suggestedPhone={knownClient?.phone ?? ""}
          />
        )}

        <p className="mt-8 text-center text-xs text-ink-400">
          Twoje wizyty w jednym miejscu?{" "}
          <Link href="/moje" className="font-medium text-brand-600 hover:underline">
            Panel klienta
          </Link>
          {" · "}
          Powered by BookEasy
        </p>
      </div>
    </main>
  );
}

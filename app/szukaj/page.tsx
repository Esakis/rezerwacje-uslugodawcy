import Link from "next/link";
import { prisma } from "@/lib/db";
import { CATEGORIES, categoryLabel } from "@/lib/categories";
import { fmtDuration, fmtPrice } from "@/lib/format";
import { SearchMap, type MapMarker } from "./search-map";

export const metadata = {
  title: "Znajdź usługę — BookEasy",
  description: "Wyszukaj fryzjera, barbera, kosmetyczkę i inne usługi. Zarezerwuj online.",
};

const MAX_SERVICES_SHOWN = 4;

// Publiczna wyszukiwarka usług: po nazwie (usługi lub usługodawcy),
// kategorii i mieście. Przeglądanie bez logowania; logowanie dopiero przy rezerwacji.
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; city?: string }>;
}) {
  const params = await searchParams;
  const q = (params.q ?? "").trim().toLowerCase();
  const category = (params.category ?? "").trim();
  const city = (params.city ?? "").trim().toLowerCase();

  const providers = await prisma.provider.findMany({
    where: { services: { some: { active: true } } },
    select: {
      slug: true,
      name: true,
      category: true,
      city: true,
      address: true,
      lat: true,
      lng: true,
      services: {
        where: { active: true },
        orderBy: { sortOrder: "asc" },
        select: { id: true, name: true, durationMin: true, priceGrosze: true },
      },
    },
    orderBy: { name: "asc" },
  });

  // Filtrowanie w JS: SQLite (dev) nie wspiera w Prismie wyszukiwania
  // case-insensitive z polskimi znakami, a skala danych jest mała.
  const results = providers
    .map((p) => {
      if (category && p.category !== category) return null;
      if (city && !(p.city ?? "").toLowerCase().includes(city)) return null;

      const nameMatch = !q || p.name.toLowerCase().includes(q);
      const matchedServices = q
        ? p.services.filter((s) => s.name.toLowerCase().includes(q))
        : [];
      if (q && !nameMatch && matchedServices.length === 0) return null;

      // Przy trafieniu w nazwę usługi pokazujemy dopasowane usługi na początku.
      const rest = p.services.filter((s) => !matchedServices.some((m) => m.id === s.id));
      return { ...p, shownServices: [...matchedServices, ...rest], matched: matchedServices.length };
    })
    .filter((p) => p !== null)
    .sort((a, b) => b.matched - a.matched);

  const markers: MapMarker[] = results
    .filter((p) => p.lat !== null && p.lng !== null)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      address: [p.address, p.city].filter(Boolean).join(", "),
      lat: p.lat!,
      lng: p.lng!,
    }));

  const hasFilters = Boolean(q || category || city);

  return (
    <main className="min-h-screen bg-ink-50">
      <header className="sticky top-0 z-30 border-b border-ink-100 bg-white/80 backdrop-blur-md safe-t">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-gradient text-sm font-bold text-white">
              B
            </span>
            <span className="text-lg font-bold tracking-tight">BookEasy</span>
          </Link>
          <nav className="flex items-center gap-3">
            <Link href="/moje" className="text-sm font-medium text-ink-600 hover:text-ink-900">
              Panel klienta
            </Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 safe-b">
        <h1 className="text-2xl font-bold">Znajdź usługę i zarezerwuj online</h1>
        <p className="mt-1 text-sm text-ink-500">
          Przeglądaj bez logowania — zalogujesz się dopiero przy rezerwacji.
        </p>

        {/* Formularz GET — działa bez JavaScriptu */}
        <form action="/szukaj" method="GET" className="card mt-4 grid gap-3 sm:grid-cols-[1fr,200px,180px,auto]">
          <div>
            <label className="label" htmlFor="q">Czego szukasz?</label>
            <input
              id="q"
              name="q"
              defaultValue={params.q ?? ""}
              className="input"
              placeholder="np. strzyżenie, manicure, masaż…"
            />
          </div>
          <div>
            <label className="label" htmlFor="category">Kategoria</label>
            <select id="category" name="category" defaultValue={category} className="input">
              <option value="">Wszystkie</option>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="city">Miasto</label>
            <input
              id="city"
              name="city"
              defaultValue={params.city ?? ""}
              className="input"
              placeholder="np. Warszawa"
            />
          </div>
          <div className="flex items-end">
            <button className="btn-primary w-full sm:w-auto">Szukaj</button>
          </div>
        </form>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr,420px]">
          {/* Lista wyników */}
          <section>
            <h2 className="mb-3 text-sm font-medium text-ink-500">
              {results.length === 0
                ? hasFilters
                  ? "Brak wyników — zmień kryteria wyszukiwania."
                  : "Nie ma jeszcze żadnych usługodawców do pokazania."
                : `Znaleziono: ${results.length}`}
            </h2>
            <ul className="space-y-4">
              {results.map((p) => (
                <li key={p.slug} className="card">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-ink-900">{p.name}</h3>
                        {categoryLabel(p.category) && (
                          <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                            {categoryLabel(p.category)}
                          </span>
                        )}
                      </div>
                      {(p.address || p.city) && (
                        <p className="mt-0.5 text-sm text-ink-500">
                          📍 {[p.address, p.city].filter(Boolean).join(", ")}
                        </p>
                      )}
                    </div>
                    <a href={`/${p.slug}`} className="btn-primary px-4 py-2 text-sm">
                      Zarezerwuj →
                    </a>
                  </div>
                  <ul className="mt-3 divide-y divide-ink-100 border-t border-ink-100 pt-1">
                    {p.shownServices.slice(0, MAX_SERVICES_SHOWN).map((s) => (
                      <li key={s.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                        <span className="text-ink-700">
                          {s.name}
                          <span className="text-ink-400"> · {fmtDuration(s.durationMin)}</span>
                        </span>
                        <span className="font-medium text-ink-900">{fmtPrice(s.priceGrosze)}</span>
                      </li>
                    ))}
                  </ul>
                  {p.shownServices.length > MAX_SERVICES_SHOWN && (
                    <p className="mt-1 text-xs text-ink-400">
                      + {p.shownServices.length - MAX_SERVICES_SHOWN} innych usług —{" "}
                      <a href={`/${p.slug}`} className="font-medium text-brand-600 hover:underline">
                        zobacz wszystkie
                      </a>
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </section>

          {/* Mapa */}
          <aside className="order-first lg:order-none">
            <div className="card h-72 overflow-hidden p-0 lg:sticky lg:top-20 lg:h-[calc(100vh-6rem)]">
              <SearchMap markers={markers} />
            </div>
            {results.length > markers.length && (
              <p className="mt-2 text-xs text-ink-400">
                Część usługodawców nie podała adresu — są na liście, ale nie na mapie.
              </p>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}

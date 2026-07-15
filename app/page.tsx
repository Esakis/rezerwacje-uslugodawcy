import Link from "next/link";
import { PLANS, PLAN_ORDER, smsLimitLabel, isUnlimited } from "@/lib/plans";
import { InstallAppButton } from "./install-app";
import {
  IconClock,
  IconChat,
  IconCalendar,
  IconUsers,
  IconShield,
  IconPhone,
  IconCheck,
  IconArrowRight,
  IconSparkle,
} from "./icons";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-ink-50">
      {/* Nagłówek */}
      <header className="sticky top-0 z-30 border-b border-ink-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-gradient text-sm font-bold text-white">
              B
            </span>
            <span className="text-xl font-bold tracking-tight">BookEasy</span>
          </div>
          <nav className="flex items-center gap-2 sm:gap-3">
            <Link href="/moje" className="hidden text-sm font-medium text-ink-600 hover:text-ink-900 sm:inline">
              Panel klienta
            </Link>
            <Link href="/login" className="text-sm font-medium text-ink-600 hover:text-ink-900">
              Zaloguj
            </Link>
            <Link href="/register" className="btn-primary">
              Wypróbuj za darmo
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-hero-glow">
        <div className="mx-auto max-w-5xl px-4 pt-10 pb-14 text-center sm:px-6 sm:pt-16 sm:pb-20">
          <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm font-medium text-brand-700 shadow-soft ring-1 ring-ink-100">
            <IconSparkle width={16} height={16} />
            Bez prowizji · 14 dni za darmo
          </div>
          <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-[1.1] tracking-tight text-ink-900 sm:text-6xl">
            Rezerwacje online i{" "}
            <span className="text-gradient">SMS-y</span> przypominające o wizycie
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-ink-600">
            Dla kosmetyczek, barberów, masażystów i całych salonów. Koniec z „no-shows".
            Klient rezerwuje z telefonu w mniej niż minutę — Ty pracujesz spokojnie.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/register" className="btn-primary px-7 py-3.5 text-base">
              Załóż darmowe konto
              <IconArrowRight width={18} height={18} />
            </Link>
            <Link href="/studio-anna" className="btn-secondary px-7 py-3.5 text-base">
              Zobacz przykładową stronę rezerwacji
            </Link>
          </div>
          <p className="mt-4 text-sm text-ink-500">
            Bez karty.{" "}
            <a href="#aplikacja" className="font-medium text-brand-600 underline">
              Dostępne też jako aplikacja na telefon
            </a>
            .
          </p>
        </div>
      </section>

      {/* Korzyści */}
      <section className="mx-auto max-w-6xl px-4 pb-8 sm:px-6">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Feature Icon={IconClock} title="Rezerwacja w < 60 s" desc="Klient wybiera osobę, usługę i wolny termin z telefonu. Bez telefonów i DM-ów w trakcie pracy." />
          <Feature Icon={IconChat} title="Automatyczne SMS-y" desc="Potwierdzenie od razu, przypomnienie 24 h przed. Klient odwoła jednym klikiem zamiast nie przyjść." />
          <Feature Icon={IconUsers} title="Cały zespół" desc="Dodaj pracowników — klient wybiera, do kogo się umawia. Każda osoba ma własny kalendarz." />
          <Feature Icon={IconCalendar} title="Twój kalendarz" desc="Widok tygodnia, ręczne wpisywanie wizyt, blokowanie terminów na urlop czy przerwę." />
          <Feature Icon={IconPhone} title="Aplikacja na telefon" desc="Zainstaluj jako aplikację na Androida i iPhone'a. Działa offline, wygląda jak natywna." />
          <Feature Icon={IconShield} title="Bez prowizji" desc="Płacisz stały abonament, a nie procent od wizyt. Twoi klienci to Twoi klienci." />
        </div>
      </section>

      {/* Cennik */}
      <section id="cennik" className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="mb-3 text-center">
          <h2 className="text-3xl font-bold tracking-tight">Prosty cennik</h2>
          <p className="mt-2 text-ink-600">Miesięczna subskrypcja. Zmień plan lub zrezygnuj w dowolnym momencie.</p>
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PLAN_ORDER.map((id) => {
            const p = PLANS[id];
            const highlight = p.highlight;
            return (
              <div
                key={id}
                className={`relative flex flex-col rounded-2xl bg-white p-6 shadow-card ring-1 ${
                  highlight ? "ring-2 ring-brand-500" : "ring-ink-100"
                }`}
              >
                {highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-gradient px-3 py-1 text-xs font-semibold text-white shadow-glow">
                    Najczęściej wybierany
                  </span>
                )}
                {isUnlimited(p) && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-ink-900 px-3 py-1 text-xs font-semibold text-white">
                    Nielimitowane SMS
                  </span>
                )}
                <div className="text-sm font-semibold text-brand-600">{p.name}</div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-bold">{p.pricePlnMonth === 0 ? "0 zł" : `${p.pricePlnMonth} zł`}</span>
                  <span className="text-sm font-normal text-ink-500">{id === "trial" ? "/ 14 dni" : "/ mies."}</span>
                </div>
                <p className="mt-2 text-sm text-ink-500">{p.tagline}</p>
                <ul className="mt-5 flex-1 space-y-2.5 text-sm text-ink-700">
                  <Li>
                    <strong>{smsLimitLabel(p)}</strong> SMS {id === "trial" ? "" : "/ mies."}
                  </Li>
                  <Li>
                    {p.staffLimit === 1 ? "1 osoba" : `do ${p.staffLimit} osób w zespole`}
                  </Li>
                  <Li>Publiczna strona rezerwacji</Li>
                  <Li>Kalendarz i baza klientów</Li>
                  {p.secondReminder && <Li>Drugie przypomnienie 2 h przed</Li>}
                  {p.customSender && <Li>Własna nazwa nadawcy SMS</Li>}
                </ul>
                <Link
                  href="/register"
                  className={highlight || isUnlimited(p) ? "btn-primary mt-6" : "btn-secondary mt-6"}
                >
                  {id === "trial" ? "Zacznij za darmo" : "Wybierz plan"}
                </Link>
              </div>
            );
          })}
        </div>
        <p className="mt-8 text-center text-sm text-ink-500">
          Jedna uratowana wizyta miesięcznie zwraca abonament kilkukrotnie.
        </p>
      </section>

      {/* Aplikacja na telefon */}
      <section id="aplikacja" className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold tracking-tight">Pobierz aplikację na telefon</h2>
          <p className="mx-auto mt-2 max-w-2xl text-ink-600">
            BookEasy zainstalujesz prosto z przeglądarki — bez sklepu, za darmo, w kilka sekund.
            Działa na Androidzie i iPhonie, także offline.
          </p>
          <div className="mt-5 flex justify-center">
            <InstallAppButton />
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="card">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <IconPhone width={22} height={22} />
            </div>
            <h3 className="mt-4 font-semibold text-ink-900">Android (Chrome)</h3>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-ink-600">
              <li>Otwórz tę stronę w Chrome na telefonie.</li>
              <li>Kliknij menu ⋮ w prawym górnym rogu.</li>
              <li>Wybierz „Zainstaluj aplikację" (lub „Dodaj do ekranu głównego").</li>
            </ol>
          </div>
          <div className="card">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <IconPhone width={22} height={22} />
            </div>
            <h3 className="mt-4 font-semibold text-ink-900">iPhone (Safari)</h3>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-ink-600">
              <li>Otwórz tę stronę w Safari.</li>
              <li>Kliknij przycisk udostępniania (kwadrat ze strzałką).</li>
              <li>Wybierz „Do ekranu początkowego" i potwierdź.</li>
            </ol>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-6 sm:pb-20">
        <div className="overflow-hidden rounded-3xl bg-brand-gradient px-5 py-10 text-center text-white shadow-glow sm:px-8 sm:py-14">
          <h2 className="text-3xl font-bold tracking-tight">Zacznij przyjmować rezerwacje jeszcze dziś</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/85">
            Konfiguracja zajmuje kilka minut. 14 dni za darmo, bez podawania karty.
          </p>
          <Link href="/register" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-base font-semibold text-brand-700 shadow-soft hover:brightness-95">
            Załóż konto
            <IconArrowRight width={18} height={18} />
          </Link>
        </div>
      </section>

      <footer className="border-t border-ink-100 py-8 text-center text-sm text-ink-500">
        BookEasy — narzędzie dla usługodawców. Nie marketplace.
      </footer>
    </main>
  );
}

function Feature({
  Icon,
  title,
  desc,
}: {
  Icon: (p: { width?: number; height?: number }) => React.ReactElement;
  title: string;
  desc: string;
}) {
  return (
    <div className="card-hover">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
        <Icon width={22} height={22} />
      </div>
      <h3 className="mt-4 font-semibold text-ink-900">{title}</h3>
      <p className="mt-1.5 text-sm text-ink-600">{desc}</p>
    </div>
  );
}

function Li({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <IconCheck width={18} height={18} className="mt-0.5 shrink-0 text-emerald-500" />
      <span>{children}</span>
    </li>
  );
}

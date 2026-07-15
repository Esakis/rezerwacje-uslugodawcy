"use client";

import { useEffect, useState } from "react";
import { fmtDuration, fmtPrice } from "@/lib/format";
import { IconCheck } from "@/app/icons";
import { requestBookingCode, verifyBookingCode, bookingEmailAuth } from "./actions";

interface ServiceOpt {
  id: string;
  name: string;
  durationMin: number;
  priceGrosze: number;
}

interface StaffOpt {
  id: string;
  name: string;
  role: string | null;
}

interface SlotOpt {
  start: string; // ISO
  label: string; // HH:mm
}

const WD_SHORT = ["nd", "pon", "wt", "śr", "czw", "pt", "sob"];
const MONTHS = ["sty", "lut", "mar", "kwi", "maj", "cze", "lip", "sie", "wrz", "paź", "lis", "gru"];

function addDaysStr(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + n);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function weekdayOf(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
}

function dateLabel(dateStr: string): { wd: string; day: string } {
  const [y, m, d] = dateStr.split("-").map(Number);
  return { wd: WD_SHORT[weekdayOf(dateStr)], day: `${d} ${MONTHS[m - 1]}` };
}

function initialsOf(name: string): string {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

function StepHead({ n, title }: { n: number; title: string }) {
  return (
    <div className="mb-4 flex items-center gap-2.5">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-gradient text-sm font-bold text-white">
        {n}
      </span>
      <h2 className="font-semibold text-ink-900">{title}</h2>
    </div>
  );
}

export function BookingFlow({
  slug,
  providerName,
  services,
  staff,
  openWeekdays,
  todayDate,
  clientPhone,
  clientEmail,
  clientName,
  suggestedPhone,
}: {
  slug: string;
  providerName: string;
  services: ServiceOpt[];
  staff: StaffOpt[];
  openWeekdays: number[];
  todayDate: string;
  clientPhone: string | null;
  clientEmail: string | null;
  clientName: string;
  suggestedPhone: string;
}) {
  const hasStaff = staff.length > 0;
  const [person, setPerson] = useState<StaffOpt | null>(hasStaff && staff.length === 1 ? staff[0] : null);
  const [service, setService] = useState<ServiceOpt | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<SlotOpt[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slot, setSlot] = useState<SlotOpt | null>(null);
  const [name, setName] = useState(clientName);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ cancelToken: string; smsSent: boolean } | null>(null);

  // Logowanie wymagane dopiero przy potwierdzeniu: kod SMS albo konto e-mail+hasło.
  // Rezerwacja zawsze wymaga zweryfikowanego numeru telefonu — konto e-mailowe
  // bez numeru przechodzi weryfikację SMS w tym samym kroku.
  const [loggedPhone, setLoggedPhone] = useState<string | null>(clientPhone);
  const [loggedEmail, setLoggedEmail] = useState<string | null>(clientEmail);
  const [authMethod, setAuthMethod] = useState<"phone" | "email">("phone");
  const [loginStep, setLoginStep] = useState<"phone" | "code">("phone");
  const [loginPhone, setLoginPhone] = useState(suggestedPhone);
  const [loginCode, setLoginCode] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authIntent, setAuthIntent] = useState<"login" | "register">("login");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginPending, setLoginPending] = useState(false);

  const isLogged = Boolean(loggedPhone || loggedEmail);

  async function sendLoginCode() {
    setLoginPending(true);
    setLoginError(null);
    try {
      const res = await requestBookingCode(loginPhone);
      if (!res.ok) {
        setLoginError(res.error ?? "Nie udało się wysłać kodu.");
      } else {
        setLoginPhone(res.phone ?? loginPhone);
        setLoginStep("code");
        setLoginCode("");
      }
    } catch {
      setLoginError("Błąd połączenia. Spróbuj ponownie.");
    } finally {
      setLoginPending(false);
    }
  }

  async function confirmLoginCode() {
    setLoginPending(true);
    setLoginError(null);
    try {
      const res = await verifyBookingCode(loginPhone, loginCode);
      if (!res.ok) {
        setLoginError(res.error ?? "Nieprawidłowy kod.");
      } else {
        setLoggedPhone(res.phone ?? null);
        if (res.email) setLoggedEmail(res.email);
      }
    } catch {
      setLoginError("Błąd połączenia. Spróbuj ponownie.");
    } finally {
      setLoginPending(false);
    }
  }

  async function emailAuth() {
    setLoginPending(true);
    setLoginError(null);
    try {
      const res = await bookingEmailAuth(authEmail, authPassword, authIntent);
      if (!res.ok) {
        setLoginError(res.error ?? "Nie udało się zalogować.");
      } else {
        setLoggedEmail(res.email ?? null);
        setLoggedPhone(res.phone ?? null);
        setLoginStep("phone");
      }
    } catch {
      setLoginError("Błąd połączenia. Spróbuj ponownie.");
    } finally {
      setLoginPending(false);
    }
  }

  // Numeracja kroków przesuwa się, gdy jest wybór osoby.
  const nPerson = 1;
  const nService = hasStaff ? 2 : 1;
  const nDate = hasStaff ? 3 : 2;
  const nData = hasStaff ? 4 : 3;

  // Najbliższe dni otwarte (max 21 dni w przód).
  const dates: string[] = [];
  for (let i = 0; i < 21 && dates.length < 14; i++) {
    const ds = addDaysStr(todayDate, i);
    if (openWeekdays.includes(weekdayOf(ds))) dates.push(ds);
  }

  // Pobierz sloty po wyborze usługi i dnia (i osoby, jeśli dotyczy).
  useEffect(() => {
    if (!service || !date) return;
    if (hasStaff && !person) return;
    setLoadingSlots(true);
    setSlot(null);
    const q = new URLSearchParams({ serviceId: service.id, date });
    if (person) q.set("staffId", person.id);
    fetch(`/api/public/${slug}/slots?${q.toString()}`)
      .then((r) => r.json())
      .then((data) => setSlots(data.slots ?? []))
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [service, date, slug, person, hasStaff]);

  async function submit() {
    if (!service || !slot) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/public/${slug}/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: service.id,
          staffId: person?.id,
          start: slot.start,
          name,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Nie udało się zarezerwować.");
        // Sesja wygasła w trakcie — wracamy do logowania.
        if (res.status === 401) {
          setLoggedPhone(null);
          setLoggedEmail(null);
          setLoginStep("phone");
        }
        // Numer niezweryfikowany — pokazujemy krok weryfikacji SMS.
        if (res.status === 403) {
          setLoggedPhone(null);
          setLoginStep("phone");
        }
        if (res.status === 409 && date) {
          const q = new URLSearchParams({ serviceId: service.id, date });
          if (person) q.set("staffId", person.id);
          const r = await fetch(`/api/public/${slug}/slots?${q.toString()}`);
          setSlots((await r.json()).slots ?? []);
          setSlot(null);
        }
      } else {
        setDone({ cancelToken: data.cancelToken, smsSent: data.smsSent });
      }
    } catch {
      setError("Błąd połączenia. Spróbuj ponownie.");
    } finally {
      setSubmitting(false);
    }
  }

  // Wspólny blok: podanie numeru + kod SMS. Używany i do logowania telefonem,
  // i do weryfikacji numeru klienta zalogowanego e-mailem.
  const phoneVerifyBlock =
    loginStep === "phone" ? (
      <>
        <div>
          <label className="label">Numer telefonu (przyjdzie na niego kod SMS)</label>
          <input
            className="input"
            value={loginPhone}
            onChange={(e) => setLoginPhone(e.target.value)}
            placeholder="500 600 700"
            inputMode="tel"
          />
          <p className="mt-1.5 text-xs text-ink-400">
            {isLogged
              ? "Na ten numer wyślemy potwierdzenie i przypomnienia SMS — potwierdź go jednorazowym kodem."
              : "Wyślemy jednorazowy kod SMS. Bez hasła."}
          </p>
        </div>
        {loginError && <p className="text-sm text-red-600">{loginError}</p>}
        <button
          onClick={sendLoginCode}
          disabled={loginPending || loginPhone.trim().length < 6}
          className="btn-primary w-full py-3"
        >
          {loginPending ? "Wysyłam…" : "Wyślij kod SMS"}
        </button>
      </>
    ) : (
      <>
        <div>
          <label className="label">Kod z SMS (wysłany na {loginPhone})</label>
          <input
            className="input text-center text-lg tracking-[0.4em]"
            value={loginCode}
            onChange={(e) => setLoginCode(e.target.value)}
            inputMode="numeric"
            maxLength={6}
            placeholder="______"
            autoFocus
          />
        </div>
        {loginError && <p className="text-sm text-red-600">{loginError}</p>}
        <button
          onClick={confirmLoginCode}
          disabled={loginPending || loginCode.trim().length !== 6}
          className="btn-primary w-full py-3"
        >
          {loginPending ? "Sprawdzam…" : isLogged ? "Zweryfikuj numer" : "Zaloguj się"}
        </button>
        <div className="flex justify-between text-sm">
          <button onClick={() => setLoginStep("phone")} className="text-ink-500 hover:text-ink-900">
            ← Zmień numer
          </button>
          <button
            onClick={sendLoginCode}
            disabled={loginPending}
            className="font-medium text-brand-600 hover:underline"
          >
            Wyślij kod ponownie
          </button>
        </div>
      </>
    );

  // Ekran potwierdzenia.
  if (done) {
    return (
      <div className="card animate-fade-up text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <IconCheck width={28} height={28} strokeWidth={2.5} />
        </div>
        <h2 className="text-xl font-bold">Rezerwacja potwierdzona!</h2>
        <p className="mt-2 text-ink-600">
          {service?.name}
          {person ? ` · ${person.name}` : ""} — {date && dateLabel(date).day}, {slot?.label}
        </p>
        <p className="mt-2 text-sm text-ink-500">
          {done.smsSent
            ? "Wysłaliśmy SMS z potwierdzeniem i linkiem do odwołania."
            : "Zapisaliśmy Twoją wizytę."}
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <a href={`/cancel/${done.cancelToken}`} className="btn-secondary">
            Zarządzaj rezerwacją
          </a>
          <a href="/moje" className="btn-ghost">
            Panel klienta →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Krok: osoba */}
      {hasStaff && (
        <div className="card animate-fade-up">
          <StepHead n={nPerson} title="Do kogo się umawiasz?" />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {staff.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setPerson(p);
                  setDate(null);
                  setSlots([]);
                  setSlot(null);
                }}
                className={`pick flex flex-col items-center gap-2 py-4 text-center ${
                  person?.id === p.id ? "pick-active" : "pick-idle"
                }`}
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                  {initialsOf(p.name)}
                </span>
                <span className="text-sm font-medium leading-tight">{p.name}</span>
                {p.role && <span className="text-xs text-ink-400">{p.role}</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Krok: usługa */}
      {(!hasStaff || person) && (
        <div className="card animate-fade-up">
          <StepHead n={nService} title="Wybierz usługę" />
          <div className="space-y-2">
            {services.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setService(s);
                  setDate(null);
                  setSlots([]);
                  setSlot(null);
                }}
                className={`pick flex items-center justify-between ${
                  service?.id === s.id ? "pick-active" : "pick-idle"
                }`}
              >
                <div>
                  <div className="font-medium">{s.name}</div>
                  <div className="text-sm text-ink-500">{fmtDuration(s.durationMin)}</div>
                </div>
                <div className="font-semibold text-ink-900">{fmtPrice(s.priceGrosze)}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Krok: termin */}
      {service && (
        <div className="card animate-fade-up">
          <StepHead n={nDate} title="Wybierz termin" />
          <div className="scroll-x flex gap-2 overflow-x-auto pb-2">
            {dates.map((ds) => {
              const { wd, day } = dateLabel(ds);
              return (
                <button
                  key={ds}
                  onClick={() => setDate(ds)}
                  className={`flex min-w-[72px] shrink-0 flex-col items-center rounded-xl border px-2 py-2.5 text-sm transition ${
                    date === ds ? "pick-active" : "pick-idle"
                  }`}
                >
                  <span className="text-xs text-ink-400">{wd}</span>
                  <span className="font-semibold">{day}</span>
                </button>
              );
            })}
          </div>

          {date && (
            <div className="mt-4">
              {loadingSlots ? (
                <p className="text-sm text-ink-400">Ładowanie terminów…</p>
              ) : slots.length === 0 ? (
                <p className="text-sm text-ink-400">Brak wolnych terminów w tym dniu. Wybierz inny.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                  {slots.map((s) => (
                    <button
                      key={s.start}
                      onClick={() => setSlot(s)}
                      className={`rounded-xl border py-2.5 text-sm font-medium transition ${
                        slot?.start === s.start
                          ? "border-brand-500 bg-brand-gradient text-white shadow-glow"
                          : "border-ink-200 hover:border-brand-300 hover:bg-brand-50"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Krok: dane / logowanie */}
      {service && slot && (
        <div className="card animate-fade-up">
          <StepHead
            n={nData}
            title={
              !isLogged
                ? "Zaloguj się, aby zarezerwować"
                : !loggedPhone
                  ? "Potwierdź numer telefonu"
                  : "Twoje dane"
            }
          />
          <div className="space-y-3">
            <div className="rounded-xl bg-ink-50 p-3.5 text-sm text-ink-600 ring-1 ring-ink-100">
              <strong className="text-ink-900">{service.name}</strong> · {providerName}
              {person && <> · {person.name}</>}
              <br />
              {date && dateLabel(date).day}, godz. {slot.label} · {fmtPrice(service.priceGrosze)}
            </div>

            {!isLogged ? (
              <>
                {/* Wybór metody: jednorazowy kod SMS albo konto e-mail + hasło. */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMethod("phone");
                      setLoginError(null);
                    }}
                    className={`pick py-2 text-sm font-medium ${
                      authMethod === "phone" ? "pick-active" : "pick-idle"
                    }`}
                  >
                    Kod SMS
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMethod("email");
                      setLoginError(null);
                    }}
                    className={`pick py-2 text-sm font-medium ${
                      authMethod === "email" ? "pick-active" : "pick-idle"
                    }`}
                  >
                    E-mail i hasło
                  </button>
                </div>

                {authMethod === "phone" ? (
                  phoneVerifyBlock
                ) : (
                  <>
                    <div>
                      <label className="label">E-mail</label>
                      <input
                        className="input"
                        type="email"
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        placeholder="jan@przyklad.pl"
                      />
                    </div>
                    <div>
                      <label className="label">Hasło</label>
                      <input
                        className="input"
                        type="password"
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        placeholder={authIntent === "register" ? "min. 8 znaków" : "••••••••"}
                      />
                    </div>
                    {loginError && <p className="text-sm text-red-600">{loginError}</p>}
                    <button
                      onClick={emailAuth}
                      disabled={loginPending || !authEmail.includes("@") || authPassword.length < 1}
                      className="btn-primary w-full py-3"
                    >
                      {loginPending
                        ? "Chwila…"
                        : authIntent === "register"
                          ? "Zarejestruj się"
                          : "Zaloguj się"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthIntent(authIntent === "login" ? "register" : "login")}
                      className="btn-ghost w-full"
                    >
                      {authIntent === "login"
                        ? "Nie masz konta? Zarejestruj się"
                        : "Masz już konto? Zaloguj się"}
                    </button>
                  </>
                )}
              </>
            ) : !loggedPhone ? (
              <>
                {/* Konto e-mailowe bez zweryfikowanego numeru — weryfikacja SMS. */}
                <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-700 ring-1 ring-emerald-100">
                  <span>Zalogowano: {loggedEmail}</span>
                  <IconCheck width={16} height={16} strokeWidth={2.5} />
                </div>
                {phoneVerifyBlock}
              </>
            ) : (
              <>
                <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-700 ring-1 ring-emerald-100">
                  <span>Zalogowano: {loggedEmail ?? loggedPhone}</span>
                  <IconCheck width={16} height={16} strokeWidth={2.5} />
                </div>
                <div>
                  <label className="label">Imię i nazwisko</label>
                  <input
                    className="input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jan Kowalski"
                  />
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <button
                  onClick={submit}
                  disabled={submitting || name.trim().length < 2}
                  className="btn-primary w-full py-3"
                >
                  {submitting ? "Rezerwuję…" : "Potwierdź rezerwację"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

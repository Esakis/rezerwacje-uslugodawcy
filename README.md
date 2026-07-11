# BookEasy

Kalendarz online + automatyczne przypomnienia SMS dla jednoosobowych usługodawców
(kosmetyczka, barber, masażysta, trener). Implementacja MVP wg [PLAN.md](./PLAN.md).

> „Twój kalendarz online i SMS-y przypominające klientom o wizycie — bez prowizji i bez zbędnych funkcji."

## Co działa

- ✅ **Publiczna strona rezerwacji** `/twoja-nazwa` — wybór osoby („do kogo"), usługi, wolnego terminu, formularz, potwierdzenie
- ✅ **Zespół (pracownicy)** — `/panel/staff`; gdy dodasz osoby, klient wybiera, do kogo się umawia; sloty i kolizje liczone per-osoba
- ✅ **Kalendarz usługodawcy** — widok tygodnia, ręczne dodawanie wizyt (z osobą), blokady (urlop/przerwa)
- ✅ **Godziny pracy i usługi** — konfiguracja dni/godzin, usług (czas, cena), buforu między wizytami
- ✅ **SMS automatyczne** — potwierdzenie od razu, przypomnienie 24 h przed, opcjonalne drugie 2 h przed
- ✅ **Odwoływanie przez klienta** — link z SMS (`/cancel/<token>`), bez logowania
- ✅ **Panel klienta** `/moje` — klient loguje się **kodem SMS** (bez hasła) i widzi swoje wizyty (nadchodzące + historia), może odwołać/zmienić termin
- ✅ **Logowanie usługodawcy** — e-mail/hasło **oraz Google** (OAuth, włączane przez zmienne środowiskowe)
- ✅ **Plany i limity SMS** — Trial / Solo / Solo+ / **Biznes (nielimitowane SMS)**, subskrypcja miesięczna, licznik zużycia
- ✅ **Aplikacja mobilna** — responsywna **PWA** (instalowalna, offline) + konfiguracja **Capacitor** do Google Play / App Store (patrz [MOBILE.md](./MOBILE.md))
- ✅ **Google Calendar** — podłączany w `/panel/settings`; rezerwacje trafiają do kalendarza Google usługodawcy, odwołania usuwają wydarzenie, a zajętości z Google (freeBusy) blokują sloty rezerwacji online (traktowane jak blokada całego salonu)

## Stack

- **Next.js 15** (App Router) + **TypeScript** + **Tailwind**
- **Prisma** ORM. Lokalnie **SQLite**; schema przenośna na PostgreSQL (Supabase/Neon) — zmień `provider` w `prisma/schema.prisma` i `DATABASE_URL`.
- **Auth**: sesje w cookie (JWT `jose` + `bcrypt`); usługodawca — e-mail/hasło lub Google OAuth; klient — kod SMS
- **PWA**: `public/manifest.webmanifest` + `public/sw.js` (service worker, offline); powłoka natywna przez Capacitor (`capacitor.config.ts`)
- **SMS**: abstrakcja providera (`lib/sms`) — `mock` (dev) lub `smsapi` (SMSAPI.pl)
- **Cron**: `/api/cron/reminders` (Vercel Cron co 5 min — patrz `vercel.json`)
- Wszystkie daty w bazie w **UTC**, wyświetlane w **Europe/Warsaw**

## Uruchomienie

```bash
npm install --legacy-peer-deps   # legacy-peer-deps: obejście konfliktu peer deps w npm 11
npm run db:push                  # utwórz bazę SQLite ze schematu
npm run db:seed                  # dane demo (idempotentny — można powtarzać)
npm run dev                      # http://localhost:3000
```

Konto demo:
- **Panel usługodawcy:** http://localhost:3000/login → `demo@bookeasy.pl` / `demo1234`
- **Strona rezerwacji:** http://localhost:3000/studio-anna (z wyborem osoby)
- **Panel klienta:** http://localhost:3000/moje → numer `500600700` (kod logowania pojawi się w konsoli serwera — tryb mock SMS)

### Logowanie Google (opcjonalne)

Ustaw w `.env` `GOOGLE_CLIENT_ID` i `GOOGLE_CLIENT_SECRET` (OAuth Client typu „Web" w Google Cloud;
authorized redirect URIs: `<NEXT_PUBLIC_APP_URL>/api/auth/google/callback` oraz
`<NEXT_PUBLIC_APP_URL>/api/auth/gcal/callback`). Bez tych zmiennych przyciski Google
(logowanie i podłączenie kalendarza) są ukryte, a logowanie e-mail/hasło działa normalnie.
Integracja kalendarza wymaga włączonego **Google Calendar API** w projekcie Google Cloud;
zgoda na kalendarz jest udzielana osobno (przycisk w `/panel/settings`).

### SMS w trybie dev

Domyślnie `SMS_PROVIDER=mock` — SMS-y **nie są wysyłane realnie**, tylko wypisywane w konsoli serwera
i zapisywane w tabeli `sms_log`. Aby użyć realnej bramki: ustaw w `.env`
`SMS_PROVIDER=smsapi` i `SMSAPI_TOKEN=<token>`.

### Cron przypomnień (lokalnie)

```bash
curl "http://localhost:3000/api/cron/reminders?key=dev-cron-secret"
```

Zwraca liczbę wysłanych przypomnień. Na produkcji Vercel Cron wywołuje ten endpoint co 5 min
(z nagłówkiem `Authorization: Bearer $CRON_SECRET`).

### Test end-to-end

Przy uruchomionym serwerze (`npm run dev` lub `npm start`):

```bash
node scripts/e2e.mjs
```

Sprawdza: liczenie slotów → rezerwację online → SMS potwierdzenia → ochronę przed double-bookingiem →
cron przypomnień → odwołanie.

## Struktura

```
app/
  page.tsx                 landing z cennikiem (4 plany)
  [slug]/                  publiczna strona rezerwacji (wybór osoby → usługi → terminu)
  cancel/[token]/          odwołanie wizyty przez klienta (link z SMS)
  moje/                    panel klienta — logowanie kodem SMS, lista i odwoływanie wizyt
  login, register/         auth usługodawcy (e-mail/hasło + Google)
  auth-ui.tsx, icons.tsx   wspólny UI (shell logowania, zestaw ikon)
  panel/                   panel usługodawcy (chroniony middlewarem)
    calendar/              widok tygodnia, wizyty ręczne (z osobą), blokady
    staff/                 zespół (pracownicy) — CRUD, limit wg planu
    services, hours/       konfiguracja usług i godzin pracy
    clients, settings/     baza klientów, plan i ustawienia SMS
  api/
    auth/google/           OAuth Google: start + callback
    public/[slug]/slots    liczenie wolnych terminów (per-osoba)
    public/[slug]/book     rezerwacja online + SMS potwierdzenia
    cron/reminders         wysyłka przypomnień 24 h / 2 h
lib/
  slots.ts                 silnik slotów per-osoba (godziny − wizyty − blokady, z buforem)
  sms/                     abstrakcja bramki: provider.ts, mock.ts, smsapi.ts, index.ts (szablony+limity)
  auth.ts, client-auth.ts  sesje usługodawcy i klienta (JWT cookie)
  google.ts, plans.ts      OAuth Google, definicje planów (w tym Biznes/nielimit)
  time.ts, format.ts, workingHours.ts, slug.ts, tokens.ts
prisma/schema.prisma       model: providers, staff, services, clients, appointments, blocks, sms_log, login_codes
public/                    manifest.webmanifest, sw.js, offline.html, icons/ (PWA)
capacitor.config.ts        powłoka natywna Android/iOS (patrz MOBILE.md)
```

## Świadome uproszczenia względem produkcji (patrz PLAN.md)

Aplikacja jest w pełni uruchamialna lokalnie bez zewnętrznych kont. W wersji produkcyjnej:

- **Baza:** zamień SQLite → PostgreSQL (Supabase/Neon). Schema już jest zgodna.
- **Płatności:** zmiana planu jest teraz natychmiastowa (tryb demo). Podłącz **Stripe Billing**
  (Checkout + webhook) — miejsca oznaczone w `app/panel/settings/actions.ts`.
- **SMS:** ustaw realną bramkę SMSAPI.pl. Własne pole nadawcy wymaga rejestracji u operatora.
- **Auth:** można zostać przy sesjach cookie albo przejść na Supabase Auth (jak sugeruje plan).

Poza MVP (roadmapa v2 z planu): zaliczki BLIK, statystyki, pełny sync Google Calendar przez webhooki
(teraz: push wydarzeń + freeBusy przy liczeniu slotów).

# BookEasy — rezerwacje i przypomnienia SMS dla małych usługodawców

> Pomysł #8: kalendarz online + automatyczne przypomnienia SMS dla jednoosobowych usługodawców (kosmetyczka, barber, masażysta, trener personalny). Tańsza i prostsza alternatywa dla Booksy.

---

## 1. Problem i grupa docelowa

**Problem:**
- Jednoosobowi usługodawcy tracą pieniądze na "no-shows" — klienci zapominają o wizytach (branżowo szacuje się 10–20% wizyt).
- Umawianie przez telefon/Instagram DM przerywa pracę (nie da się odpisać w trakcie strzyżenia).
- Booksy kosztuje od ~130 zł/mies. + prowizje i jest przeładowane funkcjami (marketplace, marketing), których solo-usługodawca nie potrzebuje.

**Grupa docelowa (ICP):**
- Jednoosobowa działalność lub 2–3 osobowy salon.
- Branże: beauty (paznokcie, rzęsy, brwi, fryzjer/barber), masaż, fizjoterapia, trenerzy personalni, tatuażyści, groomerzy psów.
- Cechy: prowadzą zapisy w papierowym kalendarzu lub w DM na Instagramie; cena jest dla nich główną barierą wejścia do Booksy.
- W Polsce: dziesiątki tysięcy takich działalności (sekcja S i Q PKD, beauty samo w sobie to ~100 tys. firm).

**Propozycja wartości (jedno zdanie):**
„Twój kalendarz online i SMS-y przypominające klientom o wizycie — za 29 zł miesięcznie, bez prowizji i bez zbędnych funkcji."

---

## 2. Zakres MVP (4–6 tygodni)

### Musi być (v1)
1. **Publiczna strona rezerwacji** — `bookeasy.pl/twoja-nazwa`: lista usług (nazwa, czas trwania, cena), wybór terminu z dostępnych slotów, formularz (imię, telefon), potwierdzenie.
2. **Kalendarz usługodawcy** — widok tygodnia, ręczne dodawanie wizyt (klienci z telefonu też muszą się dać wpisać), blokowanie terminów (urlop, przerwa).
3. **Godziny pracy i usługi** — konfiguracja: dni/godziny pracy, usługi z czasem trwania i ceną, bufor między wizytami.
4. **SMS-y automatyczne:**
   - potwierdzenie rezerwacji (od razu),
   - przypomnienie 24 h przed wizytą,
   - opcjonalnie drugie przypomnienie 2 h przed.
5. **Odwoływanie przez klienta** — link w SMS-ie do odwołania/zmiany terminu (to jest sedno redukcji no-shows: klient, który nie może przyjść, odwoła jednym klikiem zamiast po prostu nie przyjść).
6. **Panel: lista nadchodzących wizyt + prosta baza klientów** (imię, telefon, historia wizyt).
7. **Płatności za subskrypcję** — Stripe lub Przelewy24, 14 dni triala bez karty.

### Świadomie POZA MVP
- Płatności klientów za wizyty / zaliczki (v2 — mocny feature przeciw no-shows, ale wymaga KYC i obsługi zwrotów).
- Aplikacja mobilna natywna (PWA wystarczy).
- Wielu pracowników / grafiki zmianowe (v2).
- Marketplace / wyszukiwarka usług (nigdy — to gra Booksy, my jesteśmy narzędziem, nie platformą).
- Integracja z Google Calendar (v1.1 — częsta prośba, prosta w realizacji, ale nie blokuje startu).
- Program lojalnościowy, karnety, magazyn produktów.

---

## 3. Architektura i stack techniczny

**Zasada: nudny, sprawdzony stack — jedna osoba ma to utrzymać.**

- **Frontend:** Next.js (App Router) + Tailwind. Dwie aplikacje w jednym projekcie: panel usługodawcy i publiczna strona rezerwacji (SSR, ważne dla szybkości na mobile — klienci rezerwują z telefonu).
- **Backend:** Next.js API routes / server actions — bez osobnego backendu na starcie.
- **Baza:** PostgreSQL (Supabase albo Neon). Supabase daje od razu auth + row-level security.
- **SMS:** SMSAPI.pl lub SerwerSMS (polskie bramki, ~7–9 gr/SMS, dobra zgodność z polskimi operatorami i pole nadawcy typu "BookEasy"). Abstrakcja providera w kodzie od pierwszego dnia — łatwa zmiana bramki.
- **Kolejka/cron:** przypomnienia SMS jako cron co 5 minut (Vercel Cron albo pg_cron) — odpytuje wizyty w oknie przypomnienia. Bez Redis/BullMQ na starcie.
- **Płatności:** Stripe Billing (subskrypcje) — najmniej pracy; Przelewy24/PayU dopiero gdy klienci będą chcieli BLIK-a do opłacenia subskrypcji.
- **Hosting:** Vercel + Supabase — koszt ~0–100 zł/mies. do pierwszych setek klientów.

**Model danych (rdzeń):**
```
providers (id, slug, nazwa, telefon, godziny_pracy jsonb, plan, trial_do)
services (id, provider_id, nazwa, czas_min, cena, aktywna)
clients (id, provider_id, imie, telefon, notatki)
appointments (id, provider_id, service_id, client_id, start, koniec,
              status: booked|cancelled|no_show|done, zrodlo: online|manual)
sms_log (id, appointment_id, typ, status, koszt, wyslano_at)
```

**Kluczowe decyzje techniczne:**
- Sloty liczone w locie z godzin pracy minus istniejące wizyty (bez tabeli slotów — mniej stanów do synchronizacji).
- Strefa czasowa: wszystko Europe/Warsaw, zapisywane w UTC.
- Numer telefonu klienta = identyfikator klienta u danego usługodawcy (deduplikacja).
- Link do odwołania: podpisany token w URL (bez logowania klienta).

---

## 4. Model biznesowy i cennik

| Plan | Cena | Zawartość |
|------|------|-----------|
| Trial | 0 zł / 14 dni | wszystko, limit 50 SMS |
| Solo | **29 zł/mies.** | 1 kalendarz, 150 SMS/mies. |
| Solo+ | **49 zł/mies.** | 1 kalendarz, 400 SMS, drugie przypomnienie, własna nazwa nadawcy SMS |
| Duet (v2) | 79 zł/mies. | 2–3 pracowników |

- SMS-y ponad limit: pakiet 100 SMS za 12 zł (koszt własny ~8 zł — SMS to też źródło marży).
- Rocznie: 2 miesiące gratis (290 zł/rok) — poprawia cashflow i retencję.
- **Ekonomia jednostkowa:** przychód 29 zł, koszt SMS ~10–12 zł, infrastruktura <1 zł → marża brutto ~55–60% na planie Solo, wyraźnie lepsza na Solo+.
- Próg opłacalności hobby→biznes: ~100 klientów = ~3 000 zł MRR.

**Argument sprzedażowy:** jedna uratowana wizyta (80–150 zł) miesięcznie zwraca abonament kilkukrotnie.

---

## 5. Go-to-market

**Faza 0 — walidacja (tydzień 1–2, równolegle z kodowaniem):**
- 15–20 rozmów z usługodawcami (umów się na paznokcie/strzyżenie i porozmawiaj — dosłownie). Pytania: jak dziś prowadzisz zapisy? ile osób nie przychodzi? co cię wkurza w Booksy/dlaczego z niego nie korzystasz?
- Landing page z ceną i zapisem na listę oczekujących; reklama 300 zł na Facebooku w grupy beauty — mierzenie konwersji.

**Faza 1 — pierwsze 20 klientów (ręcznie):**
- Grupy FB: „Kosmetyczki i kosmetolodzy Polska", „Barberzy PL", grupy lokalne „beauty [miasto]".
- Instagram outreach: profile usługodawców, którzy w bio mają „zapisy w DM" — to jest dokładnie nasz klient. Wiadomość: konkretna, krótka, oferta darmowej konfiguracji.
- Onboarding white-glove: konfigurujesz im wszystko sam na video-callu (15 min). Przy okazji zbierasz feedback.

**Faza 2 — powtarzalny kanał (miesiąc 2–4):**
- Content SEO/TikTok: „ile kosztują cię no-shows", „Booksy vs tańsze alternatywy", kalkulator strat z no-shows na stronie.
- Program poleceń: miesiąc gratis za polecenie (branża beauty jest gęsto usieciowana — dziewczyny znają dziewczyny).
- Współprace z hurtowniami kosmetycznymi i szkoleniowcami beauty (mają zasięgi do dokładnie tej grupy).

**Metryki sukcesu:** trial→paid ≥ 40% (przy white-glove onboardingu realne), churn miesięczny < 5%, aktywacja = pierwsza rezerwacja online w ciągu 7 dni od rejestracji.

---

## 6. Harmonogram (solo developer)

| Tydzień | Zakres |
|---------|--------|
| 1 | Setup projektu, auth, model danych, CRUD usług i godzin pracy |
| 2 | Silnik slotów + publiczna strona rezerwacji |
| 3 | Kalendarz usługodawcy (widok tygodnia, ręczne wizyty, blokady) |
| 4 | Integracja SMS + cron przypomnień + link odwołania |
| 5 | Stripe, trial, onboarding (kreator pierwszej konfiguracji), landing |
| 6 | Testy z 3–5 pilotażowymi salonami (za darmo, za feedback), poprawki |

**Definicja "gotowe do sprzedaży":** obcy człowiek rezerwuje wizytę z telefonu w < 60 s, SMS przychodzi, odwołanie działa, usługodawca widzi wizytę w kalendarzu.

---

## 7. Ryzyka i mitigacje

| Ryzyko | Ocena | Mitigacja |
|--------|-------|-----------|
| Booksy obniży ceny / zrobi plan solo | średnie | Nasza przewaga to prostota i brak prowizji, nie tylko cena; trzymać się niszy "solo" |
| Klienci nie chcą płacić po trialu | wysokie | White-glove onboarding, aktywacja do pierwszej rezerwacji online; SMS-y muszą realnie chodzić od 1. dnia triala |
| Koszty SMS zjadają marżę | niskie | Limity w planach, dopłaty za pakiety, negocjacja stawek przy wolumenie |
| RODO (dane klientów końcowych) | średnie | Umowa powierzenia przetwarzania w regulaminie, minimalny zakres danych (imię+telefon), retencja i eksport/usuwanie danych |
| Sezonowość/churn (ktoś zamyka działalność) | średnie | To churn nie do uniknięcia — kompensować planem rocznym i poleceniami |

---

## 8. Co dalej po MVP (roadmapa v2)

1. **Zaliczki/przedpłaty BLIK** przy rezerwacji — najsilniejsza broń przeciw no-shows, mocny argument za planem droższym.
2. Integracja Google Calendar (dwukierunkowa).
3. Wielu pracowników (plan Duet).
4. Statystyki: przychody, no-show rate, najpopularniejsze usługi.
5. Automatyczne SMS „wróć do nas" po X tygodniach od ostatniej wizyty (reaktywacja klientów = nowa wartość, uzasadnia podniesienie ceny).

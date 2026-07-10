# BookEasy na telefonie — PWA, Android i iPhone

BookEasy działa na telefonie na dwa sposoby. Oba korzystają z tej samej,
responsywnej aplikacji webowej — nie utrzymujesz osobnego kodu na Androida/iOS.

---

## 1. PWA (instalacja z przeglądarki) — działa od razu

Aplikacja jest skonfigurowana jako **Progressive Web App**:

- `public/manifest.webmanifest` — nazwa, ikony, kolory, tryb `standalone`,
- `public/sw.js` — service worker (offline shell + cache statyki),
- `public/offline.html` — ekran przy braku sieci,
- ikony: `public/icons/icon.svg` (zwykła) i `public/icons/maskable.svg` (maskowalna).

**Jak zainstalować (użytkownik):**
- **Android / Chrome:** menu ⋮ → „Zainstaluj aplikację" / „Dodaj do ekranu głównego".
- **iPhone / Safari:** przycisk Udostępnij → „Do ekranu początkowego".

Po instalacji BookEasy otwiera się jak natywna apka (pełny ekran, własna ikona,
działa offline dla już odwiedzonych ekranów).

> Uwaga: PWA wymaga HTTPS na produkcji (na `localhost` działa bez HTTPS).

---

## 2. Natywna paczka do sklepów (Google Play + App Store) — Capacitor

Do dystrybucji w sklepach pakujemy responsywną PWA w natywną powłokę
[Capacitor](https://capacitorjs.com/). Konfiguracja jest już w repo:
`capacitor.config.ts`. Ponieważ BookEasy to aplikacja **SSR** (server actions,
API, cron), powłoka ładuje wdrożoną wersję online (`server.url`) — to
akceptowane przez oba sklepy podejście dla aplikacji serwerowych.

### Wymagania
- Android: **Android Studio** + JDK 17.
- iOS: **macOS + Xcode** (build iOS można zrobić tylko na macOS).
- Node 18+.

### Krok po kroku

```bash
# 1. Zainstaluj zależności Capacitora (jednorazowo)
npm i -D @capacitor/cli
npm i @capacitor/core @capacitor/android @capacitor/ios

# 2. Wskaż produkcyjny adres aplikacji (HTTPS!) i dodaj platformy
export CAP_SERVER_URL="https://twoj-adres.pl"   # Windows PowerShell: $env:CAP_SERVER_URL="https://..."
npx cap add android
npx cap add ios

# 3. Zsynchronizuj konfigurację po każdej zmianie
npx cap sync

# 4. Otwórz w natywnym IDE i zbuduj paczkę
npx cap open android   # Android Studio -> Build -> Generate Signed Bundle (.aab)
npx cap open ios       # Xcode -> Archive -> Distribute App (.ipa)
```

### Publikacja
- **Google Play:** wgraj podpisany plik `.aab` w Google Play Console
  (konto deweloperskie 25 USD jednorazowo).
- **App Store:** wgraj `.ipa` przez Xcode/Transporter do App Store Connect
  (Apple Developer Program 99 USD/rok).

### Zanim wyślesz do recenzji
- Ikony i splash: podmień `icon.svg`/`maskable.svg` na finalne oraz wygeneruj
  natywne assety (`npx @capacitor/assets generate`).
- Ekran logowania Google w WebView: w Google Cloud dodaj natywne origin/redirect
  albo użyj wtyczki `@capacitor/browser` do logowania w systemowej przeglądarce
  (część sklepów blokuje OAuth w czystym WebView).
- Uzupełnij politykę prywatności i zgody RODO (przetwarzanie danych klientów).

---

## Skrót decyzji
| Cel | Rozwiązanie |
|-----|-------------|
| „Chcę, żeby dało się zainstalować z telefonu" | PWA — gotowe |
| „Chcę być w Google Play" | Capacitor → `.aab` |
| „Chcę być w App Store" | Capacitor → `.ipa` (wymaga macOS) |

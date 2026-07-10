import type { CapacitorConfig } from "@capacitor/cli";

// Konfiguracja natywnej powłoki (Android / iOS) dla BookEasy.
//
// BookEasy to aplikacja SSR (server actions + API routes), więc NIE eksportujemy
// jej statycznie. Zamiast tego natywna powłoka Capacitora ładuje wdrożoną,
// responsywną wersję webową (PWA). To sprawdzony, akceptowany przez sklepy
// sposób pakowania aplikacji SSR do Google Play i App Store.
//
// Przed buildem natywnym ustaw APP_URL na produkcyjny adres HTTPS.
const APP_URL = process.env.CAP_SERVER_URL || "https://app.bookeasy.pl";

const config: CapacitorConfig = {
  appId: "pl.bookeasy.app",
  appName: "BookEasy",
  // Pusty katalog — treść serwuje zdalny server.url (poniżej).
  webDir: "public",
  server: {
    url: APP_URL,
    cleartext: false,
  },
  backgroundColor: "#ffffff",
  ios: {
    contentInset: "always",
  },
  android: {
    // Pasek statusu w kolorze marki.
    backgroundColor: "#ffffff",
  },
};

export default config;

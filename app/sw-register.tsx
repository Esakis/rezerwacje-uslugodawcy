"use client";

import { useEffect } from "react";

// Rejestruje service worker (PWA). Bez UI.
// Tylko produkcja: w dev pliki /_next/ nie mają hashy w nazwach, więc strategia
// cache-first w sw.js serwowałaby nieaktualne chunki po każdej zmianie kodu
// (objaw: martwe linki/przyciski do twardego odświeżenia). W dev sprzątamy
// też ewentualne wcześniejsze rejestracje i cache.
export function SWRegister() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => regs.forEach((r) => r.unregister()))
        .catch(() => {});
      if ("caches" in window) {
        caches.keys().then((keys) => keys.forEach((k) => caches.delete(k))).catch(() => {});
      }
      return;
    }

    const onLoad = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* rejestracja SW nieobowiązkowa — ignorujemy błędy */
      });
    };
    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);
  return null;
}

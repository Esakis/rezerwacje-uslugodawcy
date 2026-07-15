"use client";

import { useEffect, useState } from "react";

// Chrome/Edge na Androidzie: przechwytujemy beforeinstallprompt, żeby pokazać
// własny przycisk „Zainstaluj". Safari/iOS tego nie wspiera — tam zostaje
// instrukcja „Do ekranu początkowego" obok.
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallAppButton() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) setInstalled(true);
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) {
    return <p className="text-sm font-medium text-emerald-600">✓ Aplikacja jest już zainstalowana</p>;
  }
  if (!deferred) return null;

  return (
    <button onClick={() => deferred.prompt()} className="btn-primary px-7 py-3.5 text-base">
      Zainstaluj aplikację teraz
    </button>
  );
}

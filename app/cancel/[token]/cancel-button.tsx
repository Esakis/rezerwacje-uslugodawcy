"use client";

import { useState, useTransition } from "react";
import { cancelByToken } from "./actions";

export function CancelButton({ token, rebookUrl }: { token: string; rebookUrl: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handle() {
    if (!confirm("Na pewno odwołać wizytę?")) return;
    startTransition(async () => {
      const res = await cancelByToken(token);
      if (!res.ok) setError(res.error ?? "Błąd.");
    });
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button onClick={handle} disabled={pending} className="btn-danger w-full">
        {pending ? "Odwołuję…" : "Odwołaj wizytę"}
      </button>
      <a href={rebookUrl} className="btn-secondary block w-full text-center">
        Zmień termin (zarezerwuj nowy)
      </a>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { setAppointmentStatus } from "./actions";

export function AppointmentActions({ id, status }: { id: string; status: string }) {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  if (status !== "booked") return null;

  function run(next: string) {
    if (next === "cancelled" && !confirm("Odwołać wizytę? Klient dostanie SMS.")) return;
    startTransition(() => setAppointmentStatus(id, next));
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={pending}
        className="btn-secondary px-3 py-2 text-xs sm:px-2 sm:py-1"
      >
        {pending ? "…" : "Zmień"}
      </button>
      {open && (
        <div className="absolute right-0 z-10 mt-1 w-40 max-w-[calc(100vw-2rem)] rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          <button onClick={() => run("done")} className="block w-full px-3 py-2.5 text-left text-sm hover:bg-slate-50 sm:py-1.5">
            ✓ Zrealizowana
          </button>
          <button onClick={() => run("no_show")} className="block w-full px-3 py-2.5 text-left text-sm hover:bg-slate-50 sm:py-1.5">
            ⚠ Nie przyszedł
          </button>
          <button onClick={() => run("cancelled")} className="block w-full px-3 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 sm:py-1.5">
            ✕ Odwołaj (SMS)
          </button>
        </div>
      )}
    </div>
  );
}

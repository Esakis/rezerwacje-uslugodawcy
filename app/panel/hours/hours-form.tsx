"use client";

import { useActionState } from "react";
import { saveWorkingHours, type ActionResult } from "./actions";
import type { WorkingHours } from "@/lib/workingHours";

const DAYS = [
  { d: 1, name: "Poniedziałek" },
  { d: 2, name: "Wtorek" },
  { d: 3, name: "Środa" },
  { d: 4, name: "Czwartek" },
  { d: 5, name: "Piątek" },
  { d: 6, name: "Sobota" },
  { d: 0, name: "Niedziela" },
];

const initial: ActionResult = { ok: false };

export function HoursForm({
  workingHours,
  bufferMin,
  slotStepMin,
}: {
  workingHours: WorkingHours;
  bufferMin: number;
  slotStepMin: number;
}) {
  const [state, action, pending] = useActionState(saveWorkingHours, initial);

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        {DAYS.map(({ d, name }) => {
          const interval = workingHours[String(d)]?.[0];
          const enabled = !!interval;
          return (
            <div key={d} className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 p-3">
              <label className="flex w-40 items-center gap-2 font-medium">
                <input type="checkbox" name={`enabled_${d}`} defaultChecked={enabled} className="rounded" />
                {name}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  name={`from_${d}`}
                  defaultValue={interval?.from ?? "09:00"}
                  className="input w-32"
                />
                <span className="text-slate-400">–</span>
                <input
                  type="time"
                  name={`to_${d}`}
                  defaultValue={interval?.to ?? "17:00"}
                  className="input w-32"
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Bufor między wizytami (min)</label>
          <input name="bufferMin" type="number" min={0} step={5} defaultValue={bufferMin} className="input" />
          <p className="mt-1 text-xs text-slate-400">Czas na sprzątnięcie / przygotowanie stanowiska.</p>
        </div>
        <div>
          <label className="label">Co ile minut oferować terminy</label>
          <input name="slotStepMin" type="number" min={5} step={5} defaultValue={slotStepMin} className="input" />
          <p className="mt-1 text-xs text-slate-400">Np. 15 = terminy o 9:00, 9:15, 9:30…</p>
        </div>
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.ok && state.message && <p className="text-sm text-emerald-600">{state.message}</p>}

      <button disabled={pending} className="btn-primary">
        {pending ? "Zapisuję…" : "Zapisz godziny pracy"}
      </button>
    </form>
  );
}

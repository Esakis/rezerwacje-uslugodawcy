"use client";

import { useTransition } from "react";
import { changePlan } from "./actions";
import { PLANS, PLAN_ORDER, UNLIMITED } from "@/lib/plans";

export function PlanPicker({ current }: { current: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {PLAN_ORDER.map((id) => {
        const p = PLANS[id];
        const isCurrent = current === id;
        return (
          <div
            key={id}
            className={`relative rounded-2xl border p-4 ${
              isCurrent ? "border-brand-500 ring-1 ring-brand-500" : "border-ink-200"
            }`}
          >
            <div className="font-semibold">{p.name}</div>
            <div className="mt-1 text-2xl font-bold">
              {p.pricePlnMonth === 0 ? "0 zł" : `${p.pricePlnMonth} zł`}
              <span className="text-sm font-normal text-ink-400">{id === "trial" ? "" : "/mies."}</span>
            </div>
            <ul className="mt-2 space-y-1 text-xs text-ink-500">
              <li>
                {p.staffLimit === 1
                  ? "1 osoba"
                  : p.staffLimit === UNLIMITED
                    ? "Zespół bez limitu osób"
                    : `do ${p.staffLimit} osób`}
              </li>
              <li>Automatyczne potwierdzenia i przypomnienia</li>
              {p.secondReminder && <li>Drugie przypomnienie 2h</li>}
              {p.reactivation && <li>Automatyczna reaktywacja klientów</li>}
              {p.customSender && <li>Własna nazwa nadawcy</li>}
            </ul>
            {isCurrent ? (
              <div className="mt-3 text-center text-xs font-medium text-brand-600">Aktywny plan</div>
            ) : (
              <button
                onClick={() => startTransition(() => changePlan(id))}
                disabled={pending}
                className="btn-secondary mt-3 w-full text-sm"
              >
                {id === "trial" ? "Wróć na trial" : "Wybierz"}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

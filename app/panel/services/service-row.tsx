"use client";

import { useTransition } from "react";
import { toggleService, deleteService } from "./actions";
import { fmtDuration, fmtPrice } from "@/lib/format";

export function ServiceRow({
  id,
  name,
  durationMin,
  priceGrosze,
  active,
}: {
  id: string;
  name: string;
  durationMin: number;
  priceGrosze: number;
  active: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 py-3">
      <div className={active ? "" : "opacity-40"}>
        <div className="font-medium">{name}</div>
        <div className="text-sm text-slate-500">
          {fmtDuration(durationMin)} · {fmtPrice(priceGrosze)}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => startTransition(() => toggleService(id))}
          disabled={pending}
          className="btn-secondary px-2 py-1 text-xs"
        >
          {active ? "Ukryj" : "Pokaż"}
        </button>
        <button
          onClick={() => {
            if (confirm("Usunąć usługę?")) startTransition(() => deleteService(id));
          }}
          disabled={pending}
          className="text-xs text-slate-400 hover:text-red-600"
        >
          Usuń
        </button>
      </div>
    </li>
  );
}

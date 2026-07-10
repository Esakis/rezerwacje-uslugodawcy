"use client";

import { useTransition } from "react";
import { toggleStaff, deleteStaff } from "./actions";

function initialsOf(name: string): string {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

export function StaffRow({
  id,
  name,
  role,
  active,
}: {
  id: string;
  name: string;
  role: string | null;
  active: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 py-3">
      <div className={`flex items-center gap-3 ${active ? "" : "opacity-40"}`}>
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
          {initialsOf(name)}
        </span>
        <div>
          <div className="font-medium">{name}</div>
          {role && <div className="text-sm text-ink-500">{role}</div>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => startTransition(() => toggleStaff(id))}
          disabled={pending}
          className="btn-secondary px-2.5 py-1 text-xs"
        >
          {active ? "Ukryj" : "Pokaż"}
        </button>
        <button
          onClick={() => {
            if (confirm("Usunąć osobę? Jej dotychczasowe wizyty pozostaną w kalendarzu.")) {
              startTransition(() => deleteStaff(id));
            }
          }}
          disabled={pending}
          className="text-xs text-ink-400 hover:text-red-600"
        >
          Usuń
        </button>
      </div>
    </li>
  );
}

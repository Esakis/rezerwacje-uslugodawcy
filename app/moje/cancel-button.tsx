"use client";

import { useTransition } from "react";
import { cancelMyAppointment } from "./actions";

export function CancelButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => {
        if (confirm("Odwołać tę wizytę?")) start(() => cancelMyAppointment(id));
      }}
      disabled={pending}
      className="btn-secondary px-3 py-1.5 text-xs"
    >
      {pending ? "Odwołuję…" : "Odwołaj"}
    </button>
  );
}

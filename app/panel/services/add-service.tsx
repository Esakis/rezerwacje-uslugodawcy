"use client";

import { useActionState, useEffect, useRef } from "react";
import { addService, type ActionResult } from "./actions";

const initial: ActionResult = { ok: false };

export function AddService() {
  const [state, action, pending] = useActionState(addService, initial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="grid gap-3 sm:grid-cols-4">
      <div className="sm:col-span-2">
        <label className="label">Nazwa usługi</label>
        <input name="name" className="input" placeholder="np. Manicure hybrydowy" required />
      </div>
      <div>
        <label className="label">Czas (min)</label>
        <input name="durationMin" type="number" min={5} step={5} className="input" placeholder="60" required />
      </div>
      <div>
        <label className="label">Cena (zł)</label>
        <input name="price" className="input" placeholder="120" required />
      </div>
      {state.error && <p className="text-sm text-red-600 sm:col-span-4">{state.error}</p>}
      <div className="sm:col-span-4">
        <button disabled={pending} className="btn-primary">
          {pending ? "Dodaję…" : "Dodaj usługę"}
        </button>
      </div>
    </form>
  );
}

"use client";

import { useActionState, useEffect, useRef } from "react";
import { addStaff, type ActionResult } from "./actions";

const initial: ActionResult = { ok: false };

export function AddStaff() {
  const [state, action, pending] = useActionState(addStaff, initial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="grid gap-3 sm:grid-cols-3">
      <div>
        <label className="label">Imię i nazwisko</label>
        <input name="name" className="input" placeholder="np. Anna Kowalska" required />
      </div>
      <div>
        <label className="label">Rola (opcjonalnie)</label>
        <input name="role" className="input" placeholder="np. Stylistka rzęs" />
      </div>
      <div className="flex items-end">
        <button disabled={pending} className="btn-primary w-full sm:w-auto">
          {pending ? "Dodaję…" : "Dodaj osobę"}
        </button>
      </div>
      {state.error && <p className="text-sm text-red-600 sm:col-span-3">{state.error}</p>}
    </form>
  );
}

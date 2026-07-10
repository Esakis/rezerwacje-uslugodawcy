"use client";

import { useActionState, useEffect, useRef } from "react";
import { addClient, type ActionResult } from "./actions";

const initial: ActionResult = { ok: false };

export function AddClient() {
  const [state, action, pending] = useActionState(addClient, initial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="grid gap-3 sm:grid-cols-3">
      <div>
        <label className="label">Imię i nazwisko</label>
        <input name="name" className="input" required />
      </div>
      <div>
        <label className="label">Telefon</label>
        <input name="phone" className="input" placeholder="500600700" required />
      </div>
      <div>
        <label className="label">Notatki</label>
        <input name="notes" className="input" placeholder="opcjonalnie" />
      </div>
      {state.error && <p className="text-sm text-red-600 sm:col-span-3">{state.error}</p>}
      <div className="sm:col-span-3">
        <button disabled={pending} className="btn-primary">
          {pending ? "Dodaję…" : "Dodaj klienta"}
        </button>
      </div>
    </form>
  );
}

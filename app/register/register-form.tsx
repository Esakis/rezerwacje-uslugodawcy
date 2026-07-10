"use client";

import { useActionState } from "react";
import { registerAction, type ActionState } from "./actions";

const initial: ActionState = {};

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(registerAction, initial);

  return (
    <form action={formAction} className="mt-5 space-y-4">
      <div>
        <label className="label" htmlFor="name">Nazwa salonu / Twoje imię</label>
        <input id="name" name="name" className="input" placeholder="Studio Urody Anna" required />
      </div>
      <div>
        <label className="label" htmlFor="email">E-mail</label>
        <input id="email" name="email" type="email" className="input" placeholder="ty@salon.pl" required />
      </div>
      <div>
        <label className="label" htmlFor="password">Hasło</label>
        <input id="password" name="password" type="password" className="input" placeholder="min. 6 znaków" required />
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Tworzę konto…" : "Załóż konto"}
      </button>
    </form>
  );
}

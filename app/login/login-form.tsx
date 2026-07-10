"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { loginAction, type ActionState } from "./actions";

const initial: ActionState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initial);
  const params = useSearchParams();
  const next = params.get("next") || "/panel";

  return (
    <form action={formAction} className="mt-5 space-y-4">
      <input type="hidden" name="next" value={next} />
      <div>
        <label className="label" htmlFor="email">E-mail</label>
        <input id="email" name="email" type="email" className="input" required autoFocus />
      </div>
      <div>
        <label className="label" htmlFor="password">Hasło</label>
        <input id="password" name="password" type="password" className="input" required />
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Logowanie…" : "Zaloguj"}
      </button>
    </form>
  );
}

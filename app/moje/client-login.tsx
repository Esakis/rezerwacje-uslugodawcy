"use client";

import { useActionState } from "react";
import { clientLoginAction, type LoginState } from "./actions";

const initial: LoginState = { step: "phone" };

export function ClientLogin() {
  const [state, action, pending] = useActionState(clientLoginAction, initial);

  return (
    <form action={action} className="mt-5 space-y-4">
      {state.step === "phone" ? (
        <>
          <input type="hidden" name="intent" value="request" />
          <div>
            <label className="label" htmlFor="phone">Numer telefonu</label>
            <input
              id="phone"
              name="phone"
              className="input"
              inputMode="tel"
              placeholder="500 600 700"
              autoFocus
              required
            />
            <p className="mt-1.5 text-xs text-ink-400">
              Wyślemy SMS z jednorazowym kodem. Bez hasła.
            </p>
          </div>
          {state.error && <p className="text-sm text-red-600">{state.error}</p>}
          <button disabled={pending} className="btn-primary w-full">
            {pending ? "Wysyłam…" : "Wyślij kod SMS"}
          </button>
        </>
      ) : (
        <>
          <input type="hidden" name="intent" value="verify" />
          <input type="hidden" name="phone" value={state.phone ?? ""} />
          {state.info && state.info !== "ok" && (
            <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">{state.info}</p>
          )}
          <div>
            <label className="label" htmlFor="code">Kod z SMS</label>
            <input
              id="code"
              name="code"
              className="input text-center text-lg tracking-[0.4em]"
              inputMode="numeric"
              maxLength={6}
              placeholder="______"
              autoFocus
              required
            />
          </div>
          {state.error && <p className="text-sm text-red-600">{state.error}</p>}
          <button disabled={pending} className="btn-primary w-full">
            {pending ? "Sprawdzam…" : "Zaloguj się"}
          </button>
          <button
            formNoValidate
            name="resend"
            value="1"
            className="btn-ghost w-full"
            disabled={pending}
          >
            Wyślij kod ponownie
          </button>
        </>
      )}
    </form>
  );
}

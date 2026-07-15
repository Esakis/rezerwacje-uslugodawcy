"use client";

import { useState } from "react";
import { useActionState } from "react";
import {
  clientLoginAction,
  emailAuthAction,
  type LoginState,
  type EmailAuthState,
} from "./actions";

const initialPhone: LoginState = { step: "phone" };
const initialEmail: EmailAuthState = {};

export function ClientLogin() {
  const [method, setMethod] = useState<"phone" | "email">("phone");

  return (
    <div className="mt-5">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setMethod("phone")}
          className={`pick py-2 text-sm font-medium ${method === "phone" ? "pick-active" : "pick-idle"}`}
        >
          Kod SMS
        </button>
        <button
          type="button"
          onClick={() => setMethod("email")}
          className={`pick py-2 text-sm font-medium ${method === "email" ? "pick-active" : "pick-idle"}`}
        >
          E-mail i hasło
        </button>
      </div>

      {method === "phone" ? <PhoneLogin /> : <EmailLogin />}
    </div>
  );
}

function PhoneLogin() {
  const [state, action, pending] = useActionState(clientLoginAction, initialPhone);

  return (
    <form action={action} className="mt-4 space-y-4">
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

function EmailLogin() {
  const [intent, setIntent] = useState<"login" | "register">("login");
  const [state, action, pending] = useActionState(emailAuthAction, initialEmail);

  return (
    <form action={action} className="mt-4 space-y-4">
      <input type="hidden" name="intent" value={intent} />
      <div>
        <label className="label" htmlFor="email">E-mail</label>
        <input
          id="email"
          name="email"
          type="email"
          className="input"
          placeholder="jan@przyklad.pl"
          autoFocus
          required
        />
      </div>
      <div>
        <label className="label" htmlFor="password">Hasło</label>
        <input
          id="password"
          name="password"
          type="password"
          className="input"
          placeholder={intent === "register" ? "min. 8 znaków" : "••••••••"}
          required
        />
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button disabled={pending} className="btn-primary w-full">
        {pending
          ? "Chwila…"
          : intent === "register"
            ? "Zarejestruj się"
            : "Zaloguj się"}
      </button>
      <button
        type="button"
        onClick={() => setIntent(intent === "login" ? "register" : "login")}
        className="btn-ghost w-full"
      >
        {intent === "login" ? "Nie masz konta? Zarejestruj się" : "Masz już konto? Zaloguj się"}
      </button>
    </form>
  );
}

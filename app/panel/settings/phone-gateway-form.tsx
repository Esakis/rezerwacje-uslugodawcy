"use client";

import { useActionState } from "react";
import {
  updatePhoneGateway,
  disconnectPhoneGateway,
  testPhoneGateway,
  type ActionResult,
} from "./actions";

const initial: ActionResult = { ok: false };

export function PhoneGatewayForm({
  connected,
  login,
}: {
  connected: boolean;
  login: string | null;
}) {
  const [saveState, saveAction, savePending] = useActionState(updatePhoneGateway, initial);
  const [testState, testAction, testPending] = useActionState(testPhoneGateway, initial);

  if (connected) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-ink-600">
          Telefon podpięty (login: <strong>{login}</strong>). Potwierdzenia i przypomnienia
          wychodzą z Twojego numeru — za darmo, poza limitem SMS planu. Gdy telefon będzie
          niedostępny, SMS pójdzie normalnie przez bramkę BookEasy.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <form action={testAction}>
            <button disabled={testPending} className="btn-secondary">
              {testPending ? "Wysyłam…" : "Wyślij SMS testowy"}
            </button>
          </form>
          <form action={disconnectPhoneGateway}>
            <button className="text-sm text-slate-400 hover:text-red-600">Rozłącz</button>
          </form>
        </div>
        {testState.error && <p className="text-sm text-red-600">{testState.error}</p>}
        {testState.ok && testState.message && (
          <p className="text-sm text-emerald-600">{testState.message}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ol className="list-decimal space-y-1 pl-5 text-sm text-ink-600">
        <li>
          Zainstaluj na swoim Androidzie darmową aplikację{" "}
          <a
            href="https://sms-gate.app"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-brand-600 underline"
          >
            SMS Gateway for Android (sms-gate.app)
          </a>
          .
        </li>
        <li>W aplikacji włącz tryb „Cloud Server" — pokaże się login i hasło.</li>
        <li>Przepisz je poniżej i zapisz, potem wyślij SMS testowy.</li>
      </ol>
      <form action={saveAction} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Login z aplikacji</label>
            <input name="phoneGwLogin" className="input" autoComplete="off" required />
          </div>
          <div>
            <label className="label">Hasło z aplikacji</label>
            <input
              name="phoneGwPassword"
              type="password"
              className="input"
              autoComplete="off"
              required
            />
          </div>
        </div>
        {saveState.error && <p className="text-sm text-red-600">{saveState.error}</p>}
        {saveState.ok && saveState.message && (
          <p className="text-sm text-emerald-600">{saveState.message}</p>
        )}
        <button disabled={savePending} className="btn-primary">
          {savePending ? "Zapisuję…" : "Podepnij telefon"}
        </button>
      </form>
      <p className="text-xs text-slate-400">
        Wymaga Androida i taryfy z SMS-ami. Telefon musi być włączony i online — w razie
        problemów SMS-y automatycznie pójdą przez bramkę BookEasy (liczone do limitu planu).
      </p>
    </div>
  );
}

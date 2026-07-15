"use client";

import { useActionState, useState } from "react";
import { addManualAppointment, addBlock, type ActionResult } from "./actions";
import { fmtDuration, fmtPrice } from "@/lib/format";

interface ServiceOpt {
  id: string;
  name: string;
  durationMin: number;
  priceGrosze: number;
}

interface StaffOpt {
  id: string;
  name: string;
  role: string | null;
}

const initial: ActionResult = { ok: false };

export function AddForms({
  services,
  staff,
  defaultDate,
}: {
  services: ServiceOpt[];
  staff: StaffOpt[];
  defaultDate: string;
}) {
  const [tab, setTab] = useState<"appt" | "block">("appt");
  const [repeatWeeks, setRepeatWeeks] = useState("0");
  const [apptState, apptAction, apptPending] = useActionState(addManualAppointment, initial);
  const [blockState, blockAction, blockPending] = useActionState(addBlock, initial);

  return (
    <div className="card">
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setTab("appt")}
          className={tab === "appt" ? "btn-primary px-3 py-1.5 text-sm" : "btn-secondary px-3 py-1.5 text-sm"}
        >
          + Wizyta
        </button>
        <button
          onClick={() => setTab("block")}
          className={tab === "block" ? "btn-primary px-3 py-1.5 text-sm" : "btn-secondary px-3 py-1.5 text-sm"}
        >
          + Blokada (urlop/przerwa)
        </button>
      </div>

      {tab === "appt" ? (
        <form action={apptAction} className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Klient</label>
            <input name="clientName" className="input" placeholder="Imię i nazwisko" required />
          </div>
          <div>
            <label className="label">Telefon</label>
            <input name="phone" className="input" placeholder="np. 500600700" required />
          </div>
          <div>
            <label className="label">Usługa</label>
            <select name="serviceId" className="input">
              <option value="">— bez usługi —</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {fmtDuration(s.durationMin)} · {fmtPrice(s.priceGrosze)}
                </option>
              ))}
            </select>
          </div>
          {staff.length > 0 && (
            <div>
              <label className="label">Do kogo (osoba)</label>
              <select name="staffId" className="input">
                <option value="">— dowolna / nie dotyczy —</option>
                {staff.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.role ? ` · ${p.role}` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Data</label>
              <input name="date" type="date" defaultValue={defaultDate} className="input" required />
            </div>
            <div>
              <label className="label">Godzina</label>
              <input name="time" type="time" className="input" required />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Powtarzaj</label>
              <select
                name="repeatWeeks"
                value={repeatWeeks}
                onChange={(e) => setRepeatWeeks(e.target.value)}
                className="input"
              >
                <option value="0">Nie powtarzaj</option>
                <option value="1">Co tydzień</option>
                <option value="2">Co 2 tygodnie</option>
                <option value="3">Co 3 tygodnie</option>
                <option value="4">Co 4 tygodnie</option>
              </select>
            </div>
            {repeatWeeks !== "0" && (
              <div>
                <label className="label">Liczba wizyt w serii</label>
                <select name="repeatCount" defaultValue="4" className="input">
                  {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          {repeatWeeks !== "0" && (
            <p className="text-xs text-slate-400 sm:col-span-2">
              Terminy kolidujące z innymi wizytami zostaną pominięte. SMS potwierdzający
              wyślemy tylko do pierwszej wizyty — przypomnienia przyjdą przed każdą.
            </p>
          )}
          <label className="flex items-center gap-2 text-sm text-slate-600 sm:col-span-2">
            <input type="checkbox" name="sendConfirm" defaultChecked className="rounded" />
            Wyślij SMS potwierdzający klientowi
          </label>
          {apptState.error && <p className="text-sm text-red-600 sm:col-span-2">{apptState.error}</p>}
          {apptState.ok && apptState.message && (
            <p className="text-sm text-emerald-600 sm:col-span-2">{apptState.message}</p>
          )}
          <div className="sm:col-span-2">
            <button disabled={apptPending} className="btn-primary">
              {apptPending ? "Dodaję…" : "Dodaj wizytę"}
            </button>
          </div>
        </form>
      ) : (
        <form action={blockAction} className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Data</label>
            <input name="date" type="date" defaultValue={defaultDate} className="input" required />
          </div>
          <div>
            <label className="label">Powód (opcjonalnie)</label>
            <input name="reason" className="input" placeholder="Urlop, przerwa…" />
          </div>
          <div>
            <label className="label">Od</label>
            <input name="from" type="time" className="input" required />
          </div>
          <div>
            <label className="label">Do</label>
            <input name="to" type="time" className="input" required />
          </div>
          {blockState.error && <p className="text-sm text-red-600 sm:col-span-2">{blockState.error}</p>}
          {blockState.ok && blockState.message && (
            <p className="text-sm text-emerald-600 sm:col-span-2">{blockState.message}</p>
          )}
          <div className="sm:col-span-2">
            <button disabled={blockPending} className="btn-primary">
              {blockPending ? "Dodaję…" : "Dodaj blokadę"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

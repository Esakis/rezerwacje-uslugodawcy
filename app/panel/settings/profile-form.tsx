"use client";

import { useActionState } from "react";
import { CATEGORIES } from "@/lib/categories";
import { updateProfile, type ActionResult } from "./actions";

const initial: ActionResult = { ok: false };

export function ProfileForm({
  name,
  phone,
  slug,
  category,
  city,
  address,
  smsSenderName,
  secondReminder,
  reactivationWeeks,
  customSenderAllowed,
  secondReminderAllowed,
  reactivationAllowed,
  appUrl,
}: {
  name: string;
  phone: string | null;
  slug: string;
  category: string | null;
  city: string | null;
  address: string | null;
  smsSenderName: string | null;
  secondReminder: boolean;
  reactivationWeeks: number;
  customSenderAllowed: boolean;
  secondReminderAllowed: boolean;
  reactivationAllowed: boolean;
  appUrl: string;
}) {
  const [state, action, pending] = useActionState(updateProfile, initial);

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Nazwa (widoczna dla klientów)</label>
          <input name="name" defaultValue={name} className="input" required />
        </div>
        <div>
          <label className="label">Telefon</label>
          <input name="phone" defaultValue={phone ?? ""} className="input" placeholder="+48…" />
        </div>
      </div>

      <div>
        <label className="label">Adres strony rezerwacji</label>
        <div className="flex items-center gap-1">
          <span className="text-sm text-slate-400">{appUrl.replace(/^https?:\/\//, "")}/</span>
          <input name="slug" defaultValue={slug} className="input" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label">Kategoria usług</label>
          <select name="category" defaultValue={category ?? ""} className="input">
            <option value="">— wybierz —</option>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Miasto</label>
          <input name="city" defaultValue={city ?? ""} className="input" placeholder="np. Warszawa" />
        </div>
        <div>
          <label className="label">Ulica i numer</label>
          <input name="address" defaultValue={address ?? ""} className="input" placeholder="np. Długa 12" />
        </div>
      </div>
      <p className="-mt-2 text-xs text-slate-400">
        Kategoria i adres sprawiają, że klienci znajdą Cię w wyszukiwarce usług i na mapie.
      </p>

      <div>
        <label className="label">
          Nazwa nadawcy SMS {!customSenderAllowed && <span className="text-xs text-slate-400">(plan Pro)</span>}
        </label>
        <input
          name="smsSenderName"
          defaultValue={smsSenderName ?? ""}
          className="input"
          placeholder="np. TwojSalon"
          maxLength={11}
          disabled={!customSenderAllowed}
        />
        <p className="mt-1 text-xs text-slate-400">Maks. 11 znaków. Wymaga rejestracji pola nadawcy u operatora.</p>
      </div>

      <label className={`flex items-center gap-2 text-sm ${secondReminderAllowed ? "text-slate-700" : "text-slate-400"}`}>
        <input
          type="checkbox"
          name="secondReminder"
          defaultChecked={secondReminder}
          disabled={!secondReminderAllowed}
          className="rounded"
        />
        Wysyłaj drugie przypomnienie 2 h przed wizytą {!secondReminderAllowed && "(plan Pro)"}
      </label>

      <div>
        <label className="label">
          SMS „wróć do nas" {!reactivationAllowed && <span className="text-xs text-slate-400">(plan Pro)</span>}
        </label>
        <select
          name="reactivationWeeks"
          defaultValue={String(reactivationWeeks)}
          className="input"
          disabled={!reactivationAllowed}
        >
          <option value="0">Wyłączone</option>
          <option value="4">Po 4 tygodniach od ostatniej wizyty</option>
          <option value="6">Po 6 tygodniach od ostatniej wizyty</option>
          <option value="8">Po 8 tygodniach od ostatniej wizyty</option>
          <option value="12">Po 12 tygodniach od ostatniej wizyty</option>
        </select>
        <p className="mt-1 text-xs text-slate-400">
          Automatyczny SMS z zaproszeniem i linkiem do rezerwacji dla klientów bez zaplanowanej wizyty.
        </p>
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.ok && state.message && <p className="text-sm text-emerald-600">{state.message}</p>}

      <button disabled={pending} className="btn-primary">
        {pending ? "Zapisuję…" : "Zapisz ustawienia"}
      </button>
    </form>
  );
}

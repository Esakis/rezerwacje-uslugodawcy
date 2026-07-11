import { requireProvider } from "@/lib/auth";
import { gcalEnabled } from "@/lib/gcal";
import { getPlan, isUnlimited, smsLimitLabel } from "@/lib/plans";
import { stripeEnabled } from "@/lib/stripe";
import { bookingUrl } from "@/lib/tokens";
import { disconnectGcal, openBillingPortal } from "./actions";
import { PlanPicker } from "./plan-picker";
import { ProfileForm } from "./profile-form";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ gcal?: string; billing?: string }>;
}) {
  const { gcal, billing } = await searchParams;
  const provider = await requireProvider();
  const plan = getPlan(provider.plan);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const link = bookingUrl(provider.slug);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Plan i ustawienia</h1>

      {/* Link do strony rezerwacji */}
      <div className="card">
        <h2 className="mb-2 text-lg font-semibold">Twoja strona rezerwacji</h2>
        <p className="text-sm text-slate-500">Udostępnij ten link klientom (bio na Instagramie, Google, wizytówka):</p>
        <div className="mt-2 flex items-center gap-2">
          <code className="flex-1 rounded bg-slate-100 px-3 py-2 text-sm">{link}</code>
          <a href={link} target="_blank" rel="noreferrer" className="btn-secondary">Otwórz ↗</a>
        </div>
      </div>

      {/* Zużycie SMS */}
      <div className="card">
        <h2 className="mb-2 text-lg font-semibold">Wykorzystanie SMS</h2>
        <p className="text-sm text-ink-600">
          {provider.smsUsed} / {smsLimitLabel(plan)} SMS w bieżącym okresie (plan {plan.name}).
        </p>
        {isUnlimited(plan) ? (
          <p className="mt-2 text-sm text-emerald-600">Plan {plan.name}: SMS-y bez limitu ✨</p>
        ) : (
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-ink-100">
            <div
              className="h-full bg-brand-gradient"
              style={{ width: `${Math.min(100, (provider.smsUsed / plan.smsLimit) * 100)}%` }}
            />
          </div>
        )}
      </div>

      {/* Google Calendar */}
      {gcalEnabled() && (
        <div className="card">
          <h2 className="mb-2 text-lg font-semibold">Google Calendar</h2>
          {gcal === "ok" && (
            <p className="mb-2 text-sm text-emerald-600">Połączono z Google Calendar ✓</p>
          )}
          {gcal && gcal !== "ok" && (
            <p className="mb-2 text-sm text-red-600">
              Nie udało się połączyć z Google Calendar. Spróbuj ponownie.
            </p>
          )}
          {provider.gcalRefreshToken ? (
            <>
              <p className="text-sm text-ink-600">
                Połączono z kontem <strong>{provider.gcalEmail ?? "Google"}</strong>. Nowe
                rezerwacje trafiają do Twojego kalendarza Google, a zajęte terminy z Google
                blokują rezerwacje online.
              </p>
              <form action={disconnectGcal} className="mt-3">
                <button className="btn-secondary">Rozłącz</button>
              </form>
            </>
          ) : (
            <>
              <p className="text-sm text-slate-500">
                Połącz swój kalendarz Google: wizyty z BookEasy pojawią się w Google, a Twoje
                prywatne wydarzenia zablokują terminy rezerwacji online.
              </p>
              <a href="/api/auth/gcal/start" className="btn-secondary mt-3 inline-block">
                Połącz z Google Calendar
              </a>
            </>
          )}
        </div>
      )}

      {/* Plany */}
      <div className="card">
        <h2 className="mb-4 text-lg font-semibold">Plan subskrypcji</h2>
        {billing === "ok" && (
          <p className="mb-3 text-sm text-emerald-600">
            Płatność przyjęta ✓ Plan aktywuje się po potwierdzeniu ze Stripe (zwykle kilka sekund) — odśwież stronę.
          </p>
        )}
        {billing === "cancel" && (
          <p className="mb-3 text-sm text-amber-600">Płatność anulowana — plan bez zmian.</p>
        )}
        <PlanPicker current={provider.plan} />
        {stripeEnabled() ? (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <p className="text-xs text-slate-400">Płatności i faktury obsługuje Stripe.</p>
            {provider.stripeCustomerId && (
              <form action={openBillingPortal}>
                <button className="text-xs font-medium text-brand-600 underline">
                  Zarządzaj subskrypcją (karta, faktury, anulowanie)
                </button>
              </form>
            )}
          </div>
        ) : (
          <p className="mt-3 text-xs text-slate-400">
            Tryb demo: zmiana planu następuje od razu. W wersji produkcyjnej płatność obsługuje Stripe Billing
            (ustaw zmienne STRIPE_* — patrz .env.example).
          </p>
        )}
      </div>

      {/* Profil */}
      <div className="card">
        <h2 className="mb-4 text-lg font-semibold">Dane i ustawienia SMS</h2>
        <ProfileForm
          name={provider.name}
          phone={provider.phone}
          slug={provider.slug}
          smsSenderName={provider.smsSenderName}
          secondReminder={provider.secondReminder}
          reactivationWeeks={provider.reactivationWeeks}
          customSenderAllowed={plan.customSender}
          secondReminderAllowed={plan.secondReminder}
          reactivationAllowed={plan.reactivation}
          appUrl={appUrl}
        />
      </div>
    </div>
  );
}

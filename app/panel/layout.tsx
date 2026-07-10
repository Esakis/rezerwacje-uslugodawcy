import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProvider } from "@/lib/auth";
import { getPlan, subscriptionActive, smsLimitLabel, isUnlimited } from "@/lib/plans";
import { bookingUrl } from "@/lib/tokens";
import { logoutAction } from "./actions";
import { PanelNav } from "./nav";
import { IconArrowRight } from "@/app/icons";

export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const provider = await getCurrentProvider();
  if (!provider) redirect("/login");

  const plan = getPlan(provider.plan);
  const active = subscriptionActive(provider.plan, provider.trialUntil);
  const trialDaysLeft =
    provider.plan === "trial" && provider.trialUntil
      ? Math.max(0, Math.ceil((provider.trialUntil.getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
      : null;

  const initials = provider.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen bg-ink-50">
      <header className="sticky top-0 z-30 border-b border-ink-100 bg-white/80 backdrop-blur-md safe-t">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <Link href="/panel" className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-gradient text-sm font-bold text-white">
                B
              </span>
              <span className="text-lg font-bold tracking-tight text-ink-900">BookEasy</span>
            </Link>
            <span className="hidden text-sm text-ink-400 sm:inline">/ {provider.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <a
              href={bookingUrl(provider.slug)}
              target="_blank"
              rel="noreferrer"
              className="hidden items-center gap-1 text-sm font-medium text-brand-600 hover:underline sm:inline-flex"
            >
              Twoja strona rezerwacji
              <IconArrowRight width={14} height={14} />
            </a>
            <form action={logoutAction}>
              <button className="text-sm text-ink-500 hover:text-ink-900">Wyloguj</button>
            </form>
            {provider.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={provider.avatarUrl} alt="" className="h-8 w-8 rounded-full ring-1 ring-ink-200" />
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                {initials}
              </span>
            )}
          </div>
        </div>
        <PanelNav />
      </header>

      {/* Pasek planu / triala */}
      {!active ? (
        <div className="bg-red-50 px-4 py-2 text-center text-sm text-red-700">
          Trial wygasł.{" "}
          <Link href="/panel/settings" className="font-medium underline">
            Wybierz plan
          </Link>
          , aby dalej wysyłać SMS-y i przyjmować rezerwacje online.
        </div>
      ) : trialDaysLeft !== null ? (
        <div className="bg-amber-50 px-4 py-2 text-center text-sm text-amber-800">
          Trial: pozostało {trialDaysLeft} dni. Wykorzystano {provider.smsUsed}/{smsLimitLabel(plan)} SMS.{" "}
          <Link href="/panel/settings" className="font-medium underline">
            Wybierz plan
          </Link>
        </div>
      ) : !isUnlimited(plan) && provider.smsUsed >= plan.smsLimit ? (
        <div className="bg-amber-50 px-4 py-2 text-center text-sm text-amber-800">
          Limit SMS w planie {plan.name} wyczerpany ({provider.smsUsed}/{plan.smsLimit}).{" "}
          <Link href="/panel/settings" className="font-medium underline">
            Zmień plan
          </Link>
        </div>
      ) : null}

      <main className="mx-auto max-w-6xl px-4 py-6 safe-b">{children}</main>
    </div>
  );
}

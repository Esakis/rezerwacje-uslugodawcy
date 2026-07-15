// Definicje planów: darmowy trial + jeden płatny plan Pro.
// Limity SMS pozostają wewnętrznym bezpiecznikiem (anty-nadużycia),
// ale nie są komunikowane w cenniku.
export type PlanId = "trial" | "pro";

export interface Plan {
  id: PlanId;
  name: string;
  pricePlnMonth: number;
  smsLimit: number; // -1 = bez limitu
  secondReminder: boolean;
  reactivation: boolean; // SMS „wróć do nas" po X tygodniach od ostatniej wizyty
  customSender: boolean;
  staffLimit: number; // ilu pracowników („do kogo") dozwolonych; -1 = bez limitu
  highlight?: boolean; // wyróżnienie w cenniku
  tagline: string;
}

export const UNLIMITED = -1;

export const PLANS: Record<PlanId, Plan> = {
  trial: {
    id: "trial",
    name: "Trial",
    pricePlnMonth: 0,
    smsLimit: 50,
    secondReminder: false,
    reactivation: false,
    customSender: false,
    staffLimit: 1,
    tagline: "Przetestuj wszystko przez 14 dni",
  },
  pro: {
    id: "pro",
    name: "Pro",
    pricePlnMonth: 49,
    smsLimit: 400,
    secondReminder: true,
    reactivation: true,
    customSender: true,
    staffLimit: UNLIMITED,
    highlight: true,
    tagline: "Wszystko, czego potrzebuje Twój salon",
  },
};

export const PLAN_ORDER: PlanId[] = ["trial", "pro"];
export const PAID_PLANS: PlanId[] = ["pro"];

// Wycofane plany (konta sprzed zmiany cennika) — traktowane jak Pro.
const LEGACY_PLANS: Record<string, PlanId> = {
  solo: "pro",
  solo_plus: "pro",
  biznes: "pro",
};

export function getPlan(id: string): Plan {
  const mapped = LEGACY_PLANS[id] ?? (id as PlanId);
  return PLANS[mapped] ?? PLANS.trial;
}

export function isUnlimited(plan: Plan): boolean {
  return plan.smsLimit === UNLIMITED;
}

// Czy zostały jeszcze SMS-y w bieżącym okresie.
export function smsAvailable(plan: Plan, smsUsed: number): boolean {
  if (isUnlimited(plan)) return true;
  return smsUsed < plan.smsLimit;
}

// Czy można dodać kolejną osobę do zespołu.
export function staffLimitReached(plan: Plan, count: number): boolean {
  return plan.staffLimit !== UNLIMITED && count >= plan.staffLimit;
}

// Etykieta limitu SMS do UI.
export function smsLimitLabel(plan: Plan): string {
  return isUnlimited(plan) ? "bez limitu" : String(plan.smsLimit);
}

// Czy trial jest aktywny (albo plan płatny — w tym wycofane plany legacy).
export function subscriptionActive(plan: string, trialUntil: Date | null): boolean {
  if (getPlan(plan).pricePlnMonth > 0 && plan !== "trial") return true;
  if (plan === "trial" && trialUntil) return trialUntil.getTime() > Date.now();
  return false;
}

// Definicje planów wg PLAN.md sekcja 4 (+ plan Biznes z nielimitowanymi SMS).
export type PlanId = "trial" | "solo" | "solo_plus" | "biznes";

export interface Plan {
  id: PlanId;
  name: string;
  pricePlnMonth: number;
  smsLimit: number; // -1 = bez limitu
  secondReminder: boolean;
  customSender: boolean;
  staffLimit: number; // ilu pracowników („do kogo") dozwolonych
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
    customSender: false,
    staffLimit: 1,
    tagline: "Przetestuj wszystko przez 14 dni",
  },
  solo: {
    id: "solo",
    name: "Solo",
    pricePlnMonth: 29,
    smsLimit: 150,
    secondReminder: false,
    customSender: false,
    staffLimit: 1,
    tagline: "Dla jednoosobowej działalności",
  },
  solo_plus: {
    id: "solo_plus",
    name: "Solo+",
    pricePlnMonth: 49,
    smsLimit: 400,
    secondReminder: true,
    customSender: true,
    staffLimit: 3,
    highlight: true,
    tagline: "Dla małego salonu (2–3 osoby)",
  },
  biznes: {
    id: "biznes",
    name: "Biznes",
    pricePlnMonth: 99,
    smsLimit: UNLIMITED,
    secondReminder: true,
    customSender: true,
    staffLimit: 20,
    tagline: "Nielimitowane SMS-y, bez martwienia się o pakiety",
  },
};

export const PLAN_ORDER: PlanId[] = ["trial", "solo", "solo_plus", "biznes"];
export const PAID_PLANS: PlanId[] = ["solo", "solo_plus", "biznes"];

export function getPlan(id: string): Plan {
  return PLANS[(id as PlanId)] ?? PLANS.trial;
}

export function isUnlimited(plan: Plan): boolean {
  return plan.smsLimit === UNLIMITED;
}

// Czy zostały jeszcze SMS-y w bieżącym okresie.
export function smsAvailable(plan: Plan, smsUsed: number): boolean {
  if (isUnlimited(plan)) return true;
  return smsUsed < plan.smsLimit;
}

// Etykieta limitu SMS do UI.
export function smsLimitLabel(plan: Plan): string {
  return isUnlimited(plan) ? "bez limitu" : String(plan.smsLimit);
}

// Czy trial jest aktywny (albo plan płatny).
export function subscriptionActive(plan: string, trialUntil: Date | null): boolean {
  if (PAID_PLANS.includes(plan as PlanId)) return true;
  if (plan === "trial" && trialUntil) return trialUntil.getTime() > Date.now();
  return false;
}

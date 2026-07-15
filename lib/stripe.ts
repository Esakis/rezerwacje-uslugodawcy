// Stripe Billing (subskrypcje planów — PLAN.md sekcja 3: "najmniej pracy").
// Wzorzec jak Google: bez zmiennych środowiskowych funkcja jest wyłączona,
// a zmiana planu działa w trybie demo (natychmiastowa, bez płatności).
//
// Wymagane zmienne: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET oraz
// STRIPE_PRICE_PRO (ID ceny utworzonej w dashboardzie Stripe,
// subskrypcja miesięczna PLN dla planu Pro).

import Stripe from "stripe";

export function stripeEnabled(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);
}

let client: Stripe | null = null;

export function getStripe(): Stripe {
  if (!client) {
    client = new Stripe(process.env.STRIPE_SECRET_KEY as string);
  }
  return client;
}

// Mapowanie planu na Stripe Price ID. null = plan bez ceny w Stripe (np. trial).
export function stripePriceId(planId: string): string | null {
  const map: Record<string, string | undefined> = {
    pro: process.env.STRIPE_PRICE_PRO,
  };
  return map[planId] ?? null;
}

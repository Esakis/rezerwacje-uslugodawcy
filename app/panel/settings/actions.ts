"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireProvider } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { appUrl } from "@/lib/google";
import { getPlan, PLAN_ORDER, type PlanId } from "@/lib/plans";
import { getStripe, stripeEnabled, stripePriceId } from "@/lib/stripe";
import { slugify } from "@/lib/slug";

export type ActionResult = { ok: boolean; error?: string; message?: string };

// Zmiana planu. Z kluczami Stripe: przekierowanie do Stripe Checkout
// (plan ustawia dopiero webhook po opłaceniu). Bez kluczy: tryb demo — od razu.
export async function changePlan(planId: string): Promise<void> {
  const provider = await requireProvider();
  if (!PLAN_ORDER.includes(planId as PlanId)) return;
  const plan = getPlan(planId as PlanId);

  const priceId = stripePriceId(planId);
  if (stripeEnabled() && priceId) {
    const stripe = getStripe();

    // Klient Stripe per usługodawca (tworzony przy pierwszym zakupie).
    let customerId = provider.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: provider.email,
        name: provider.name,
        metadata: { providerId: provider.id },
      });
      customerId = customer.id;
      await prisma.provider.update({
        where: { id: provider.id },
        data: { stripeCustomerId: customerId },
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl()}/panel/settings?billing=ok`,
      cancel_url: `${appUrl()}/panel/settings?billing=cancel`,
      metadata: { providerId: provider.id, planId },
    });
    if (!session.url) throw new Error("Stripe nie zwrócił adresu Checkout");
    redirect(session.url); // rzuca NEXT_REDIRECT — koniec akcji
  }

  // Tryb demo (bez Stripe) — zmiana natychmiastowa.
  await prisma.provider.update({
    where: { id: provider.id },
    data: {
      plan: planId,
      secondReminder: plan.secondReminder,
      // Przy przejściu na płatny plan czyścimy datę triala.
      trialUntil: planId === "trial" ? provider.trialUntil : null,
    },
  });
  revalidatePath("/panel");
  revalidatePath("/panel/settings");
}

// Portal klienta Stripe: zmiana karty, faktury, anulowanie subskrypcji.
export async function openBillingPortal(): Promise<void> {
  const provider = await requireProvider();
  if (!stripeEnabled() || !provider.stripeCustomerId) return;

  const session = await getStripe().billingPortal.sessions.create({
    customer: provider.stripeCustomerId,
    return_url: `${appUrl()}/panel/settings`,
  });
  redirect(session.url);
}

export async function updateProfile(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const provider = await requireProvider();
  const name = String(formData.get("name") || "").trim();
  const phone = String(formData.get("phone") || "").trim() || null;
  const slugInput = String(formData.get("slug") || "").trim();
  const smsSenderName = String(formData.get("smsSenderName") || "").trim() || null;
  const secondReminder = formData.get("secondReminder") === "on";
  const reactivationWeeks = Number(formData.get("reactivationWeeks") || 0);

  if (!name) return { ok: false, error: "Podaj nazwę." };

  const slug = slugify(slugInput || name);
  if (!slug) return { ok: false, error: "Nieprawidłowy adres strony." };

  // Slug musi być unikalny (poza bieżącym providerem).
  const clash = await prisma.provider.findFirst({
    where: { slug, id: { not: provider.id } },
  });
  if (clash) return { ok: false, error: "Ten adres jest już zajęty. Wybierz inny." };

  const plan = getPlan(provider.plan);
  await prisma.provider.update({
    where: { id: provider.id },
    data: {
      name,
      phone,
      slug,
      // Własna nazwa nadawcy tylko na planie z tą funkcją.
      smsSenderName: plan.customSender ? smsSenderName : null,
      // Drugie przypomnienie tylko jeśli plan pozwala.
      secondReminder: plan.secondReminder ? secondReminder : false,
      // SMS „wróć do nas": tylko plan z tą funkcją i dozwolone wartości (0 = wyłączone).
      reactivationWeeks:
        plan.reactivation && [0, 4, 6, 8, 12].includes(reactivationWeeks) ? reactivationWeeks : 0,
    },
  });

  revalidatePath("/panel/settings");
  return { ok: true, message: "Zapisano ustawienia." };
}

// Odłączenie Google Calendar. Usuwa tylko token po naszej stronie —
// wydarzenia utworzone wcześniej w Google zostają.
export async function disconnectGcal(): Promise<void> {
  const provider = await requireProvider();
  await prisma.provider.update({
    where: { id: provider.id },
    data: { gcalRefreshToken: null, gcalEmail: null },
  });
  revalidatePath("/panel/settings");
}

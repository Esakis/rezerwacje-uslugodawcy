import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/db";
import { getPlan } from "@/lib/plans";
import { getStripe, stripeEnabled } from "@/lib/stripe";

// Webhook Stripe: jedyne miejsce, które ustawia płatny plan (po opłaceniu Checkout)
// i odbiera go po anulowaniu subskrypcji. Podpis weryfikowany STRIPE_WEBHOOK_SECRET.

export async function POST(req: NextRequest) {
  if (!stripeEnabled()) {
    return NextResponse.json({ error: "Stripe wyłączony" }, { status: 404 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Brak podpisu" }, { status: 400 });
  }

  const payload = await req.text();
  let event: Stripe.Event;
  try {
    event = await getStripe().webhooks.constructEventAsync(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET as string
    );
  } catch {
    return NextResponse.json({ error: "Nieprawidłowy podpis" }, { status: 400 });
  }

  switch (event.type) {
    // Opłacony Checkout → aktywuj plan z metadanych sesji.
    case "checkout.session.completed": {
      const session = event.data.object;
      const providerId = session.metadata?.providerId;
      const planId = session.metadata?.planId;
      if (providerId && planId) {
        const plan = getPlan(planId);
        await prisma.provider.update({
          where: { id: providerId },
          data: {
            plan: plan.id,
            secondReminder: plan.secondReminder,
            trialUntil: null,
            stripeCustomerId:
              typeof session.customer === "string" ? session.customer : undefined,
            stripeSubscriptionId:
              typeof session.subscription === "string" ? session.subscription : undefined,
          },
        });
      }
      break;
    }

    // Subskrypcja anulowana/wygasła → powrót na trial z przeszłą datą
    // (subscriptionActive() = false: SMS-y przestają wychodzić, panel działa).
    case "customer.subscription.deleted": {
      const sub = event.data.object;
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      await prisma.provider.updateMany({
        where: { stripeCustomerId: customerId },
        data: {
          plan: "trial",
          trialUntil: new Date(0),
          secondReminder: false,
          stripeSubscriptionId: null,
        },
      });
      break;
    }
  }

  return NextResponse.json({ received: true });
}

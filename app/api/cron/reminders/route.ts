import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getPlan, subscriptionActive } from "@/lib/plans";
import { addDays, addMinutes } from "@/lib/time";
import { sendSms, reminder24Body, reminder2Body, reactivationBody } from "@/lib/sms";

// Cron przypomnień SMS (PLAN.md sekcja 3: cron co 5 min odpytuje wizyty w oknie przypomnienia).
// Na Vercel: skonfigurowane w vercel.json. Chronione nagłówkiem Authorization: Bearer <CRON_SECRET>.
// Lokalnie: GET http://localhost:3000/api/cron/reminders?key=<CRON_SECRET>

async function handle(req: NextRequest) {
  const secret = process.env.CRON_SECRET || "";
  const auth = req.headers.get("authorization");
  const key = req.nextUrl.searchParams.get("key");
  const authorized = auth === `Bearer ${secret}` || key === secret;
  if (secret && !authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const in24h = addMinutes(now, 24 * 60);
  const in2h = addMinutes(now, 2 * 60);

  let sent24 = 0;
  let sent2 = 0;
  let skipped = 0;

  // --- Przypomnienia 24 h ---
  const due24 = await prisma.appointment.findMany({
    where: {
      status: "booked",
      reminder24Sent: false,
      startAt: { gt: now, lte: in24h },
    },
    include: { client: true, service: true, provider: true },
  });

  for (const a of due24) {
    if (!a.client) continue;
    if (!subscriptionActive(a.provider.plan, a.provider.trialUntil)) {
      skipped++;
      continue;
    }
    const res = await sendSms({
      providerId: a.providerId,
      appointmentId: a.id,
      type: "reminder24",
      to: a.client.phone,
      body: reminder24Body(a.provider.name, a.service?.name ?? "wizyta", a),
    });
    if (res.ok) {
      await prisma.appointment.update({ where: { id: a.id }, data: { reminder24Sent: true } });
      sent24++;
    } else {
      skipped++;
    }
  }

  // --- Przypomnienia 2 h (tylko gdy plan i usługodawca to włączyli) ---
  const due2 = await prisma.appointment.findMany({
    where: {
      status: "booked",
      reminder2Sent: false,
      startAt: { gt: now, lte: in2h },
      provider: { secondReminder: true },
    },
    include: { client: true, service: true, provider: true },
  });

  for (const a of due2) {
    if (!a.client) continue;
    if (!subscriptionActive(a.provider.plan, a.provider.trialUntil)) {
      skipped++;
      continue;
    }
    const res = await sendSms({
      providerId: a.providerId,
      appointmentId: a.id,
      type: "reminder2",
      to: a.client.phone,
      body: reminder2Body(a.provider.name, a.service?.name ?? "wizyta", a),
    });
    if (res.ok) {
      await prisma.appointment.update({ where: { id: a.id }, data: { reminder2Sent: true } });
      sent2++;
    } else {
      skipped++;
    }
  }

  // --- SMS „wróć do nas" (reaktywacja; plan z tą funkcją + włączone w ustawieniach) ---
  // Limit na provider/przebieg: włączenie funkcji przy dużej bazie nieaktywnych klientów
  // nie może zużyć całego pakietu SMS w jednym przebiegu crona.
  const REACTIVATION_BATCH = 20;
  let sentReactivation = 0;

  const reactProviders = await prisma.provider.findMany({
    where: { reactivationWeeks: { gt: 0 } },
  });

  for (const p of reactProviders) {
    if (!getPlan(p.plan).reactivation) continue;
    if (!subscriptionActive(p.plan, p.trialUntil)) continue;
    const cutoff = addDays(now, -p.reactivationWeeks * 7);

    // Klienci z co najmniej jedną zrealizowaną wizytą i bez zaplanowanej przyszłej.
    const clients = await prisma.client.findMany({
      where: {
        providerId: p.id,
        appointments: { some: { status: "done" } },
        NOT: { appointments: { some: { status: "booked", startAt: { gt: now } } } },
      },
      include: {
        appointments: {
          where: { status: "done" },
          orderBy: { startAt: "desc" },
          take: 1,
          select: { startAt: true },
        },
      },
    });

    let batch = 0;
    for (const c of clients) {
      if (batch >= REACTIVATION_BATCH) break;
      const lastVisit = c.appointments[0]?.startAt;
      if (!lastVisit || lastVisit > cutoff) continue;
      // Nie powtarzaj — wyślij ponownie dopiero, gdy klient znów był na wizycie.
      if (c.reactivationSentAt && c.reactivationSentAt >= lastVisit) continue;

      const res = await sendSms({
        providerId: p.id,
        type: "reactivation",
        to: c.phone,
        body: reactivationBody(p.name, c.name, p.slug),
      });
      if (res.ok) {
        await prisma.client.update({
          where: { id: c.id },
          data: { reactivationSentAt: now },
        });
        sentReactivation++;
        batch++;
      } else {
        skipped++;
        if (res.status === "skipped_limit") break; // limit SMS wyczerpany — nie próbuj dalej
      }
    }
  }

  return NextResponse.json({
    ok: true,
    ranAt: now.toISOString(),
    sent24,
    sent2,
    sentReactivation,
    skipped,
  });
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}

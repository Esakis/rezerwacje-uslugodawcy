// Test SMS „wróć do nas": klient z dawną wizytą i bez przyszłej dostaje SMS
// reaktywacyjny z crona; drugi przebieg nie wysyła duplikatu.
// Wymaga uruchomionego serwera (npm start / npm run dev) i bazy z seedem.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BASE = process.env.BASE_URL || "http://localhost:3000";
const CRON = `${BASE}/api/cron/reminders?key=${process.env.CRON_SECRET || "dev-cron-secret"}`;
const PHONE = "+48700800900";

const provider = await prisma.provider.findUnique({ where: { email: "demo@bookeasy.pl" } });
if (!provider) throw new Error("Brak konta demo — uruchom npm run db:seed");

const original = { plan: provider.plan, reactivationWeeks: provider.reactivationWeeks };

try {
  // Włącz funkcję: plan z reaktywacją + próg 4 tygodnie.
  await prisma.provider.update({
    where: { id: provider.id },
    data: { plan: "solo_plus", reactivationWeeks: 4 },
  });

  // Czysty klient testowy z wizytą "done" sprzed 10 tygodni, bez przyszłych wizyt.
  const old = await prisma.client.findFirst({ where: { providerId: provider.id, phone: PHONE } });
  if (old) {
    await prisma.appointment.deleteMany({ where: { clientId: old.id } });
    await prisma.client.delete({ where: { id: old.id } });
  }
  await prisma.smsLog.deleteMany({ where: { providerId: provider.id, phone: PHONE } });

  const client = await prisma.client.create({
    data: { providerId: provider.id, name: "Reaktywacja Test", phone: PHONE },
  });
  const service = await prisma.service.findFirst({ where: { providerId: provider.id } });
  const tenWeeksAgo = new Date(Date.now() - 10 * 7 * 24 * 3600 * 1000);
  await prisma.appointment.create({
    data: {
      providerId: provider.id,
      serviceId: service?.id,
      clientId: client.id,
      startAt: tenWeeksAgo,
      endAt: new Date(tenWeeksAgo.getTime() + 3600 * 1000),
      status: "done",
      source: "manual",
    },
  });

  // Przebieg 1: powinien wysłać dokładnie jeden SMS reaktywacyjny.
  const run1 = await (await fetch(CRON)).json();
  const logs1 = await prisma.smsLog.count({
    where: { providerId: provider.id, type: "reactivation", phone: PHONE, status: "sent" },
  });
  if (logs1 !== 1) throw new Error(`Oczekiwano 1 SMS reaktywacyjnego, jest ${logs1} (cron: ${JSON.stringify(run1)})`);
  const afterSend = await prisma.client.findUnique({ where: { id: client.id } });
  if (!afterSend?.reactivationSentAt) throw new Error("reactivationSentAt nie został ustawiony");
  console.log(`[OK] Przebieg 1 — wysłano SMS reaktywacyjny (sentReactivation=${run1.sentReactivation})`);

  // Przebieg 2: bez duplikatu.
  await fetch(CRON);
  const logs2 = await prisma.smsLog.count({
    where: { providerId: provider.id, type: "reactivation", phone: PHONE, status: "sent" },
  });
  if (logs2 !== 1) throw new Error(`Duplikat! Po 2. przebiegu logów: ${logs2}`);
  console.log("[OK] Przebieg 2 — brak duplikatu");

  console.log("✅ REACTIVATION OK");
} finally {
  // Sprzątanie: usuń dane testowe, przywróć plan.
  const c = await prisma.client.findFirst({ where: { providerId: provider.id, phone: PHONE } });
  if (c) {
    await prisma.appointment.deleteMany({ where: { clientId: c.id } });
    await prisma.client.delete({ where: { id: c.id } });
  }
  await prisma.smsLog.deleteMany({ where: { providerId: provider.id, phone: PHONE } });
  await prisma.provider.update({ where: { id: provider.id }, data: original });
  await prisma.$disconnect();
}

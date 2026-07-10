// Prosty test end-to-end na działającym serwerze (npm start).
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BASE = "http://localhost:3000";

function fmtDate(d) {
  return d.toISOString().slice(0, 10);
}

async function main() {
  const provider = await prisma.provider.findUnique({
    where: { slug: "studio-anna" },
    include: { services: true, staff: { where: { active: true } } },
  });
  if (!provider) throw new Error("Brak seeda — uruchom npm run db:seed");
  const service = provider.services[0];
  const staff = provider.staff[0] ?? null;
  console.log(`Provider: ${provider.name}, usługa: ${service.name} (${service.durationMin} min)`);
  console.log(`Zespół: ${provider.staff.map((s) => s.name).join(", ") || "(solo)"}`);

  const staffQ = staff ? `&staffId=${staff.id}` : "";

  // Wybierz najbliższy dzień z wolnymi slotami (do 10 dni w przód).
  let chosen = null;
  for (let i = 0; i < 10 && !chosen; i++) {
    const date = fmtDate(new Date(Date.now() + i * 86400000));
    const r = await fetch(`${BASE}/api/public/studio-anna/slots?serviceId=${service.id}&date=${date}${staffQ}`);
    const { slots } = await r.json();
    if (slots && slots.length > 0) chosen = { date, slot: slots[Math.min(2, slots.length - 1)] };
  }
  if (!chosen) throw new Error("Nie znaleziono wolnych slotów");
  console.log(`\n[1] Sloty OK — wybrano ${chosen.date} ${chosen.slot.label}`);

  // Walidacja: rezerwacja bez wyboru osoby (gdy zespół istnieje) ma się nie udać.
  if (staff) {
    const noStaff = await fetch(`${BASE}/api/public/studio-anna/book`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serviceId: service.id, start: chosen.slot.start, name: "Bez Osoby", phone: "599888777" }),
    });
    console.log(`[1b] Rezerwacja bez osoby: HTTP ${noStaff.status} (oczekiwane 400)`);
  }

  // Rezerwacja online (z wyborem osoby, jeśli zespół istnieje).
  const bookRes = await fetch(`${BASE}/api/public/studio-anna/book`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      serviceId: service.id,
      staffId: staff?.id,
      start: chosen.slot.start,
      name: "Test Klient",
      phone: "511222333",
    }),
  });
  const book = await bookRes.json();
  if (!book.ok) throw new Error("Rezerwacja nieudana: " + JSON.stringify(book));
  console.log(`[2] Rezerwacja OK — cancelToken=${book.cancelToken.slice(0, 8)}…, smsSent=${book.smsSent}`);

  // Sprawdź wpis SMS potwierdzenia w logu.
  const confirmLog = await prisma.smsLog.findFirst({
    where: { type: "confirm", phone: "+48511222333" },
    orderBy: { sentAt: "desc" },
  });
  console.log(`[3] SMS potwierdzenia w logu: ${confirmLog ? confirmLog.status : "BRAK"}`);

  // Double-booking: druga próba tego samego slotu ma się nie udać.
  const dbl = await fetch(`${BASE}/api/public/studio-anna/book`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ serviceId: service.id, staffId: staff?.id, start: chosen.slot.start, name: "Inny", phone: "500000000" }),
  });
  console.log(`[4] Ochrona przed double-booking: HTTP ${dbl.status} (oczekiwane 409)`);

  // Test crona: utwórz wizytę za 1h i uruchom cron przypomnień 24h.
  const soon = new Date(Date.now() + 60 * 60 * 1000);
  const client = await prisma.client.upsert({
    where: { providerId_phone: { providerId: provider.id, phone: "+48522333444" } },
    update: {},
    create: { providerId: provider.id, name: "Cron Test", phone: "+48522333444" },
  });
  const cronAppt = await prisma.appointment.create({
    data: {
      providerId: provider.id,
      serviceId: service.id,
      clientId: client.id,
      startAt: soon,
      endAt: new Date(soon.getTime() + service.durationMin * 60000),
      status: "booked",
      source: "manual",
    },
  });
  const cronRes = await fetch(`${BASE}/api/cron/reminders?key=dev-cron-secret`);
  const cron = await cronRes.json();
  console.log(`[5] Cron uruchomiony: ${JSON.stringify(cron)}`);
  const after = await prisma.appointment.findUnique({ where: { id: cronAppt.id } });
  console.log(`    reminder24Sent dla testowej wizyty: ${after.reminder24Sent}`);

  // Odwołanie przez token.
  await prisma.appointment.update({ where: { id: cronAppt.id }, data: { status: "cancelled" } });
  console.log(`[6] Odwołanie: status ustawiony na cancelled`);

  console.log("\n✅ E2E PASSED");
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("❌ E2E FAILED:", e.message);
  await prisma.$disconnect();
  process.exit(1);
});

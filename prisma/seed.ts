import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Domyślne godziny pracy: pon-pt 9-17, sob 10-14.
const workingHours = JSON.stringify({
  "0": [],
  "1": [{ from: "09:00", to: "17:00" }],
  "2": [{ from: "09:00", to: "17:00" }],
  "3": [{ from: "09:00", to: "17:00" }],
  "4": [{ from: "09:00", to: "17:00" }],
  "5": [{ from: "09:00", to: "17:00" }],
  "6": [{ from: "10:00", to: "14:00" }],
});

async function main() {
  const email = "demo@bookeasy.pl";
  const passwordHash = await bcrypt.hash("demo1234", 10);

  const trialUntil = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  // Usuń istniejących demo (idempotentny seed).
  await prisma.provider.deleteMany({ where: { email: { in: [email, "demo-barber@bookeasy.pl"] } } });

  // Drugi usługodawca — żeby wyszukiwarka (/szukaj) miała co pokazać na mapie.
  await prisma.provider.create({
    data: {
      email: "demo-barber@bookeasy.pl",
      passwordHash,
      slug: "barber-bros",
      name: "Barber Bros",
      phone: "+48600300400",
      category: "barber",
      city: "Kraków",
      address: "Floriańska 12",
      lat: 50.0641,
      lng: 19.9414,
      workingHours,
      plan: "solo_plus",
      trialUntil,
      services: {
        create: [
          { name: "Strzyżenie męskie", durationMin: 30, priceGrosze: 7000, sortOrder: 1 },
          { name: "Strzyżenie + broda", durationMin: 50, priceGrosze: 11000, sortOrder: 2 },
          { name: "Trymowanie brody", durationMin: 20, priceGrosze: 5000, sortOrder: 3 },
        ],
      },
    },
  });

  const provider = await prisma.provider.create({
    data: {
      email,
      passwordHash,
      slug: "studio-anna",
      name: "Studio Urody Anna",
      phone: "+48600100200",
      category: "kosmetyka",
      city: "Warszawa",
      address: "Złota 44",
      lat: 52.2306,
      lng: 21.0022,
      workingHours,
      bufferMin: 10,
      slotStepMin: 15,
      plan: "solo_plus",
      trialUntil,
      secondReminder: true,
      services: {
        create: [
          { name: "Manicure hybrydowy", durationMin: 60, priceGrosze: 12000, sortOrder: 1 },
          { name: "Pedicure", durationMin: 75, priceGrosze: 15000, sortOrder: 2 },
          { name: "Stylizacja rzęs", durationMin: 90, priceGrosze: 20000, sortOrder: 3 },
          { name: "Regulacja brwi", durationMin: 30, priceGrosze: 5000, sortOrder: 4 },
        ],
      },
      staff: {
        create: [
          { name: "Anna Kowalska", role: "Stylistka paznokci", sortOrder: 1 },
          { name: "Marta Zając", role: "Stylistka rzęs i brwi", sortOrder: 2 },
        ],
      },
    },
    include: { services: true, staff: true },
  });

  // Konto klienckie (logowanie e-mail + hasło) z już zweryfikowanym numerem.
  await prisma.clientAccount.deleteMany({ where: { email: "kasia@example.com" } });
  await prisma.clientAccount.create({
    data: {
      email: "kasia@example.com",
      passwordHash: await bcrypt.hash("kasia1234", 10),
      phone: "+48500600700",
    },
  });

  // Przykładowa klientka + jedna wizyta jutro.
  const client = await prisma.client.create({
    data: {
      providerId: provider.id,
      name: "Kasia Nowak",
      phone: "+48500600700",
      email: "kasia@example.com",
      notes: "Alergia na aceton.",
    },
  });

  const tomorrow10 = new Date();
  tomorrow10.setDate(tomorrow10.getDate() + 1);
  tomorrow10.setHours(10, 0, 0, 0);
  const manicure = provider.services[0];

  await prisma.appointment.create({
    data: {
      providerId: provider.id,
      serviceId: manicure.id,
      clientId: client.id,
      staffId: provider.staff[0].id,
      startAt: tomorrow10,
      endAt: new Date(tomorrow10.getTime() + manicure.durationMin * 60 * 1000),
      priceGrosze: manicure.priceGrosze,
      status: "booked",
      source: "manual",
    },
  });

  // Zrealizowana wizyta w przeszłości (historia w panelu klienta).
  const lastWeek = new Date();
  lastWeek.setDate(lastWeek.getDate() - 7);
  lastWeek.setHours(14, 0, 0, 0);
  await prisma.appointment.create({
    data: {
      providerId: provider.id,
      serviceId: provider.services[2].id,
      clientId: client.id,
      staffId: provider.staff[1].id,
      startAt: lastWeek,
      endAt: new Date(lastWeek.getTime() + provider.services[2].durationMin * 60 * 1000),
      priceGrosze: provider.services[2].priceGrosze,
      status: "done",
      source: "online",
    },
  });

  console.log("✅ Seed gotowy.");
  console.log("   Logowanie panelu:  demo@bookeasy.pl / demo1234");
  console.log("   Strona rezerwacji: http://localhost:3000/studio-anna");
  console.log("   Panel klienta:     http://localhost:3000/moje");
  console.log("     — kodem SMS:     numer 500600700 (kod w konsoli)");
  console.log("     — e-mail+hasło:  kasia@example.com / kasia1234");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

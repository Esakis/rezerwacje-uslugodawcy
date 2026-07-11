import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { isSlotFree } from "@/lib/slots";
import { addMinutes } from "@/lib/time";
import { normalizePhone } from "@/lib/format";
import { sendSms, confirmBody } from "@/lib/sms";
import { syncAppointmentToGcal } from "@/lib/gcal";

const schema = z.object({
  serviceId: z.string().min(1),
  staffId: z.string().min(1).optional(),
  start: z.string().datetime(), // ISO UTC
  name: z.string().min(2).max(80),
  phone: z.string().min(6).max(20),
});

// POST /api/public/<slug>/book — rezerwacja przez klienta (source=online).
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Nieprawidłowe dane." }, { status: 400 });
  }
  const { serviceId, start, name, staffId } = parsed.data;
  const phone = normalizePhone(parsed.data.phone);
  if (!phone) {
    return NextResponse.json({ error: "Nieprawidłowy numer telefonu." }, { status: 400 });
  }

  const provider = await prisma.provider.findUnique({ where: { slug } });
  if (!provider) {
    return NextResponse.json({ error: "Nie znaleziono usługodawcy." }, { status: 404 });
  }

  const service = await prisma.service.findFirst({
    where: { id: serviceId, providerId: provider.id, active: true },
  });
  if (!service) {
    return NextResponse.json({ error: "Nieprawidłowa usługa." }, { status: 400 });
  }

  // Jeśli usługodawca ma aktywnych pracowników, wybór osoby jest wymagany.
  const activeStaff = await prisma.staffMember.findMany({
    where: { providerId: provider.id, active: true },
    select: { id: true },
  });
  let chosenStaffId: string | null = null;
  if (activeStaff.length > 0) {
    if (!staffId || !activeStaff.some((s) => s.id === staffId)) {
      return NextResponse.json({ error: "Wybierz osobę, do której się umawiasz." }, { status: 400 });
    }
    chosenStaffId = staffId;
  }

  const startAt = new Date(start);
  if (isNaN(startAt.getTime()) || startAt.getTime() <= Date.now()) {
    return NextResponse.json({ error: "Termin w przeszłości." }, { status: 400 });
  }
  const endAt = addMinutes(startAt, service.durationMin);

  // Walidacja: termin nadal wolny (ochrona przed double-bookingiem), zawężona do osoby.
  const free = await isSlotFree(provider.id, startAt, endAt, undefined, chosenStaffId);
  if (!free) {
    return NextResponse.json(
      { error: "Ten termin został właśnie zajęty. Wybierz inny." },
      { status: 409 }
    );
  }

  // Deduplikacja klienta po numerze.
  const client = await prisma.client.upsert({
    where: { providerId_phone: { providerId: provider.id, phone } },
    update: { name },
    create: { providerId: provider.id, name, phone },
  });

  const appt = await prisma.appointment.create({
    data: {
      providerId: provider.id,
      serviceId: service.id,
      clientId: client.id,
      staffId: chosenStaffId,
      startAt,
      endAt,
      status: "booked",
      source: "online",
    },
  });

  // SMS potwierdzający i wydarzenie w Google Calendar (best-effort) — niezależne
  // efekty uboczne, uruchamiane równolegle, żeby nie sumować opóźnień.
  const [sms] = await Promise.all([
    sendSms({
      providerId: provider.id,
      appointmentId: appt.id,
      type: "confirm",
      to: phone,
      body: confirmBody(provider.name, service.name, appt),
    }),
    syncAppointmentToGcal(appt.id),
  ]);
  if (sms.ok) {
    await prisma.appointment.update({ where: { id: appt.id }, data: { confirmSent: true } });
  }

  return NextResponse.json({
    ok: true,
    cancelToken: appt.cancelToken,
    smsSent: sms.ok,
  });
}

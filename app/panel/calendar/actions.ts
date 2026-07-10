"use server";

import { revalidatePath } from "next/cache";
import { requireProvider } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isSlotFree } from "@/lib/slots";
import { normalizePhone } from "@/lib/format";
import { warsawTimeToUtc, addMinutes } from "@/lib/time";
import { sendSms, confirmBody, cancelBody } from "@/lib/sms";

export type ActionResult = { ok: boolean; error?: string; message?: string };

// Ręczne dodanie wizyty przez usługodawcę (klient z telefonu też musi się dać wpisać).
export async function addManualAppointment(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const provider = await requireProvider();

  const clientName = String(formData.get("clientName") || "").trim();
  const phoneRaw = String(formData.get("phone") || "").trim();
  const serviceId = String(formData.get("serviceId") || "");
  const staffIdRaw = String(formData.get("staffId") || "");
  const date = String(formData.get("date") || ""); // YYYY-MM-DD
  const time = String(formData.get("time") || ""); // HH:mm
  const sendConfirm = formData.get("sendConfirm") === "on";

  if (!clientName || !date || !time) {
    return { ok: false, error: "Uzupełnij klienta, datę i godzinę." };
  }
  const phone = normalizePhone(phoneRaw);
  if (!phone) {
    return { ok: false, error: "Nieprawidłowy numer telefonu." };
  }

  const service = serviceId
    ? await prisma.service.findFirst({ where: { id: serviceId, providerId: provider.id } })
    : null;
  const duration = service?.durationMin ?? 30;

  // Osoba (opcjonalna). Weryfikacja, że należy do usługodawcy.
  let staffId: string | null = null;
  if (staffIdRaw) {
    const staff = await prisma.staffMember.findFirst({
      where: { id: staffIdRaw, providerId: provider.id },
      select: { id: true },
    });
    if (!staff) return { ok: false, error: "Nieprawidłowy pracownik." };
    staffId = staff.id;
  }

  // Dzień w UTC z daty warszawskiej.
  const dayAnchor = warsawTimeToUtc(new Date(`${date}T12:00:00Z`), "12:00");
  const startAt = warsawTimeToUtc(dayAnchor, time);
  const endAt = addMinutes(startAt, duration);

  const free = await isSlotFree(provider.id, startAt, endAt, undefined, staffId);
  if (!free) {
    return { ok: false, error: "Ten termin koliduje z inną wizytą lub blokadą tej osoby." };
  }

  // Deduplikacja klienta po numerze telefonu.
  const client = await prisma.client.upsert({
    where: { providerId_phone: { providerId: provider.id, phone } },
    update: { name: clientName },
    create: { providerId: provider.id, name: clientName, phone },
  });

  const appt = await prisma.appointment.create({
    data: {
      providerId: provider.id,
      serviceId: service?.id,
      clientId: client.id,
      staffId,
      startAt,
      endAt,
      status: "booked",
      source: "manual",
    },
  });

  if (sendConfirm) {
    const res = await sendSms({
      providerId: provider.id,
      appointmentId: appt.id,
      type: "confirm",
      to: phone,
      body: confirmBody(provider.name, service?.name ?? "wizyta", appt),
    });
    if (res.ok) {
      await prisma.appointment.update({ where: { id: appt.id }, data: { confirmSent: true } });
    }
  }

  revalidatePath("/panel/calendar");
  revalidatePath("/panel");
  return { ok: true, message: "Dodano wizytę." };
}

// Zmiana statusu wizyty (odwołanie / zrealizowana / nie przyszedł).
export async function setAppointmentStatus(id: string, status: string): Promise<void> {
  const provider = await requireProvider();
  if (!["booked", "cancelled", "done", "no_show"].includes(status)) return;

  const appt = await prisma.appointment.findFirst({
    where: { id, providerId: provider.id },
    include: { client: true },
  });
  if (!appt) return;

  await prisma.appointment.update({ where: { id }, data: { status } });

  // SMS o odwołaniu przez usługodawcę.
  if (status === "cancelled" && appt.client) {
    await sendSms({
      providerId: provider.id,
      appointmentId: appt.id,
      type: "cancel",
      to: appt.client.phone,
      body: cancelBody(provider.name, appt),
    });
  }

  revalidatePath("/panel/calendar");
  revalidatePath("/panel");
}

// Blokada terminu (urlop, przerwa).
export async function addBlock(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const provider = await requireProvider();
  const date = String(formData.get("date") || "");
  const from = String(formData.get("from") || "");
  const to = String(formData.get("to") || "");
  const reason = String(formData.get("reason") || "").trim() || null;

  if (!date || !from || !to) {
    return { ok: false, error: "Podaj datę oraz godziny od–do." };
  }
  const dayAnchor = warsawTimeToUtc(new Date(`${date}T12:00:00Z`), "12:00");
  const startAt = warsawTimeToUtc(dayAnchor, from);
  const endAt = warsawTimeToUtc(dayAnchor, to);
  if (endAt <= startAt) {
    return { ok: false, error: "Godzina zakończenia musi być późniejsza niż początek." };
  }

  await prisma.timeBlock.create({
    data: { providerId: provider.id, startAt, endAt, reason },
  });

  revalidatePath("/panel/calendar");
  return { ok: true, message: "Dodano blokadę." };
}

export async function deleteBlock(id: string): Promise<void> {
  const provider = await requireProvider();
  await prisma.timeBlock.deleteMany({ where: { id, providerId: provider.id } });
  revalidatePath("/panel/calendar");
}

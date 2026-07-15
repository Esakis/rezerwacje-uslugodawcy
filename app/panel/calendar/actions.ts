"use server";

import { revalidatePath } from "next/cache";
import { requireProvider } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isSlotFree } from "@/lib/slots";
import { normalizePhone } from "@/lib/format";
import { warsawTimeToUtc, addMinutes, fmtDateHuman } from "@/lib/time";
import { sendSms, confirmBody, cancelBody } from "@/lib/sms";
import { syncAppointmentToGcal } from "@/lib/gcal";

export type ActionResult = { ok: boolean; error?: string; message?: string };

// Przesunięcie daty YYYY-MM-DD o n dni w przestrzeni kalendarza (odporne na DST —
// godzina każdego wystąpienia liczona jest osobno przez warsawTimeToUtc).
function addDaysToDateStr(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

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

  // Wizyty cykliczne: co repeatWeeks tygodni, occurrences terminów (1 = pojedyncza).
  const repeatWeeksRaw = Number(formData.get("repeatWeeks") || 0);
  const repeatWeeks = [1, 2, 3, 4].includes(repeatWeeksRaw) ? repeatWeeksRaw : 0;
  const repeatCountRaw = Number(formData.get("repeatCount") || 1);
  const occurrences = repeatWeeks > 0 ? Math.min(Math.max(repeatCountRaw, 2), 12) : 1;

  // Terminy wystąpień: każda data liczona w kalendarzu warszawskim (poprawne przy DST).
  const slots: { startAt: Date; endAt: Date }[] = [];
  const skipped: string[] = [];
  for (let i = 0; i < occurrences; i++) {
    const ds = addDaysToDateStr(date, i * repeatWeeks * 7);
    const dayAnchor = warsawTimeToUtc(new Date(`${ds}T12:00:00Z`), "12:00");
    const startAt = warsawTimeToUtc(dayAnchor, time);
    const endAt = addMinutes(startAt, duration);
    const free = await isSlotFree(provider.id, startAt, endAt, undefined, staffId);
    if (free) slots.push({ startAt, endAt });
    else skipped.push(fmtDateHuman(startAt));
  }

  if (slots.length === 0) {
    return {
      ok: false,
      error:
        occurrences === 1
          ? "Ten termin koliduje z inną wizytą lub blokadą tej osoby."
          : "Wszystkie terminy serii kolidują z innymi wizytami lub blokadami.",
    };
  }

  // Deduplikacja klienta po numerze telefonu.
  const client = await prisma.client.upsert({
    where: { providerId_phone: { providerId: provider.id, phone } },
    update: { name: clientName },
    create: { providerId: provider.id, name: clientName, phone },
  });

  let firstAppt: { id: string; startAt: Date; cancelToken: string } | null = null;
  const createdIds: string[] = [];
  for (const s of slots) {
    const appt = await prisma.appointment.create({
      data: {
        providerId: provider.id,
        serviceId: service?.id,
        clientId: client.id,
        staffId,
        startAt: s.startAt,
        endAt: s.endAt,
        priceGrosze: service?.priceGrosze,
        status: "booked",
        source: "manual",
      },
    });
    createdIds.push(appt.id);
    if (!firstAppt) firstAppt = appt;
  }

  // SMS potwierdzający tylko do pierwszej wizyty serii (przypomnienia 24 h
  // i tak wyjdą przed każdym terminem).
  if (sendConfirm && firstAppt) {
    const res = await sendSms({
      providerId: provider.id,
      appointmentId: firstAppt.id,
      type: "confirm",
      to: phone,
      body: confirmBody(provider.name, service?.name ?? "wizyta", firstAppt),
    });
    if (res.ok) {
      await prisma.appointment.update({
        where: { id: firstAppt.id },
        data: { confirmSent: true },
      });
    }
  }

  // Wydarzenia w Google Calendar usługodawcy (best-effort).
  for (const id of createdIds) {
    await syncAppointmentToGcal(id);
  }

  revalidatePath("/panel/calendar");
  revalidatePath("/panel");

  if (occurrences === 1) return { ok: true, message: "Dodano wizytę." };
  return {
    ok: true,
    message:
      `Dodano ${createdIds.length} z ${occurrences} wizyt` +
      (skipped.length > 0 ? ` (pominięto kolizje: ${skipped.join(", ")})` : "") +
      ".",
  };
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

  // Aktualizacja Google Calendar: odwołanie usuwa wydarzenie, przywrócenie tworzy je na nowo.
  await syncAppointmentToGcal(appt.id);

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

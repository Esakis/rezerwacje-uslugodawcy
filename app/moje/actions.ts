"use server";

import { randomInt } from "crypto";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { normalizePhone } from "@/lib/format";
import { sendRawSms } from "@/lib/sms";
import { createClientSession, destroyClientSession, getClientPhone } from "@/lib/client-auth";
import { syncAppointmentToGcal } from "@/lib/gcal";

export type LoginState = {
  step: "phone" | "code";
  phone?: string;
  error?: string;
  info?: string;
};

const CODE_TTL_MIN = 10;
const MAX_ATTEMPTS = 5;

async function sendCode(phone: string): Promise<void> {
  const hasAccount = await prisma.client.findFirst({ where: { phone }, select: { id: true } });
  if (!hasAccount) return; // cicho — nie zdradzamy, czy numer ma konto
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const codeHash = await bcrypt.hash(code, 10);
  await prisma.loginCode.deleteMany({ where: { phone } });
  await prisma.loginCode.create({
    data: { phone, codeHash, expiresAt: new Date(Date.now() + CODE_TTL_MIN * 60 * 1000) },
  });
  await sendRawSms(phone, `BookEasy: Twój kod logowania to ${code}. Ważny ${CODE_TTL_MIN} min.`);
}

// Jedna akcja obsługuje oba kroki (intent: request | resend | verify).
export async function clientLoginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  // Przycisk „wyślij ponownie" ma pierwszeństwo nad ukrytym polem intent.
  const intent = formData.get("resend") ? "resend" : String(formData.get("intent") || "request");
  const phone = normalizePhone(String(formData.get("phone") || ""));
  if (!phone) {
    return { step: "phone", error: "Podaj prawidłowy numer telefonu." };
  }

  if (intent === "request" || intent === "resend") {
    await sendCode(phone);
    return {
      step: "code",
      phone,
      info: "Jeśli ten numer ma u nas wizyty, wysłaliśmy SMS z kodem.",
    };
  }

  // intent === "verify"
  const code = String(formData.get("code") || "").trim();
  if (!/^\d{6}$/.test(code)) {
    return { step: "code", phone, error: "Kod to 6 cyfr." };
  }

  const rec = await prisma.loginCode.findFirst({
    where: { phone },
    orderBy: { createdAt: "desc" },
  });
  if (!rec || rec.expiresAt.getTime() < Date.now()) {
    return { step: "code", phone, error: "Kod wygasł. Wyślij nowy." };
  }
  if (rec.attempts >= MAX_ATTEMPTS) {
    return { step: "code", phone, error: "Za dużo prób. Wyślij nowy kod." };
  }

  const valid = await bcrypt.compare(code, rec.codeHash);
  if (!valid) {
    await prisma.loginCode.update({ where: { id: rec.id }, data: { attempts: { increment: 1 } } });
    return { step: "code", phone, error: "Nieprawidłowy kod." };
  }

  await prisma.loginCode.deleteMany({ where: { phone } });
  await createClientSession(phone);
  revalidatePath("/moje");
  return { step: "code", phone, info: "ok" };
}

export async function logoutClient(): Promise<void> {
  await destroyClientSession();
  revalidatePath("/moje");
}

// Odwołanie wizyty przez zalogowanego klienta.
export async function cancelMyAppointment(appointmentId: string): Promise<void> {
  const phone = await getClientPhone();
  if (!phone) return;

  const appt = await prisma.appointment.findFirst({
    where: { id: appointmentId, status: "booked", client: { phone } },
    select: { id: true },
  });
  if (!appt) return;

  await prisma.appointment.update({ where: { id: appt.id }, data: { status: "cancelled" } });
  // Usunięcie wydarzenia z Google Calendar usługodawcy (best-effort).
  await syncAppointmentToGcal(appt.id);
  revalidatePath("/moje");
}

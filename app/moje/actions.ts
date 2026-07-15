"use server";

import { randomInt } from "crypto";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { normalizePhone, normalizeEmail } from "@/lib/format";
import { sendRawSms } from "@/lib/sms";
import {
  createClientSession,
  destroyClientSession,
  getClientIdentity,
  clientMatch,
} from "@/lib/client-auth";
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
  // Cicho — nie zdradzamy, czy numer ma u nas wizyty lub konto.
  const hasClient = await prisma.client.findFirst({ where: { phone }, select: { id: true } });
  const hasAccount =
    hasClient ??
    (await prisma.clientAccount.findFirst({ where: { phone }, select: { id: true } }));
  if (!hasAccount) return;
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const codeHash = await bcrypt.hash(code, 10);
  await prisma.loginCode.deleteMany({ where: { identifier: phone } });
  await prisma.loginCode.create({
    data: { identifier: phone, codeHash, expiresAt: new Date(Date.now() + CODE_TTL_MIN * 60 * 1000) },
  });
  await sendRawSms(phone, `BookEasy: Twój kod logowania to ${code}. Ważny ${CODE_TTL_MIN} min.`);
}

// Logowanie kodem SMS — jedna akcja obsługuje oba kroki (intent: request | resend | verify).
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
    where: { identifier: phone },
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

  await prisma.loginCode.deleteMany({ where: { identifier: phone } });
  // Jeśli numer należy do konta e-mailowego, doczepiamy e-mail do sesji.
  const account = await prisma.clientAccount.findFirst({ where: { phone } });
  await createClientSession({ phone, email: account?.email });
  revalidatePath("/moje");
  return { step: "code", phone, info: "ok" };
}

export type EmailAuthState = { error?: string };

// Logowanie / rejestracja klienta e-mailem i hasłem.
export async function emailAuthAction(
  _prev: EmailAuthState,
  formData: FormData
): Promise<EmailAuthState> {
  const intent = String(formData.get("intent") || "login"); // login | register
  const email = normalizeEmail(String(formData.get("email") || ""));
  const password = String(formData.get("password") || "");
  if (!email) return { error: "Podaj prawidłowy adres e-mail." };

  if (intent === "register") {
    if (password.length < 8) return { error: "Hasło musi mieć co najmniej 8 znaków." };
    const exists = await prisma.clientAccount.findUnique({ where: { email } });
    if (exists) return { error: "Konto z tym e-mailem już istnieje — zaloguj się." };
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.clientAccount.create({ data: { email, passwordHash } });
    await createClientSession({ email });
  } else {
    const account = await prisma.clientAccount.findUnique({ where: { email } });
    if (!account || !(await bcrypt.compare(password, account.passwordHash))) {
      return { error: "Nieprawidłowy e-mail lub hasło." };
    }
    await createClientSession({ email, phone: account.phone ?? undefined });
  }

  revalidatePath("/moje");
  return {};
}

export async function logoutClient(): Promise<void> {
  await destroyClientSession();
  revalidatePath("/moje");
}

// Odwołanie wizyty przez zalogowanego klienta.
export async function cancelMyAppointment(appointmentId: string): Promise<void> {
  const identity = await getClientIdentity();
  if (!identity) return;

  const appt = await prisma.appointment.findFirst({
    where: { id: appointmentId, status: "booked", client: clientMatch(identity) },
    select: { id: true },
  });
  if (!appt) return;

  await prisma.appointment.update({ where: { id: appt.id }, data: { status: "cancelled" } });
  // Usunięcie wydarzenia z Google Calendar usługodawcy (best-effort).
  await syncAppointmentToGcal(appt.id);
  revalidatePath("/moje");
}

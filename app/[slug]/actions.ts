"use server";

import { randomInt } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { normalizePhone, normalizeEmail } from "@/lib/format";
import { sendRawSms } from "@/lib/sms";
import { createClientSession, getClientIdentity } from "@/lib/client-auth";

// Logowanie / weryfikacja telefonu w trakcie rezerwacji.
// Kod SMS dostaje KAŻDY numer (nowy klient zakłada konto pierwszą rezerwacją).
// Ten sam mechanizm weryfikuje numer klienta zalogowanego e-mailem i hasłem.

export type BookingLoginResult = {
  ok: boolean;
  error?: string;
  phone?: string;
  email?: string;
};

const CODE_TTL_MIN = 10;
const MAX_ATTEMPTS = 5;

export async function requestBookingCode(phoneInput: string): Promise<BookingLoginResult> {
  const phone = normalizePhone(phoneInput);
  if (!phone) return { ok: false, error: "Podaj prawidłowy numer telefonu." };

  // Anty-spam: jeśli kod wysłano w ciągu ostatnich 30 s, nie wysyłamy kolejnego.
  const recent = await prisma.loginCode.findFirst({
    where: { identifier: phone, createdAt: { gt: new Date(Date.now() - 30_000) } },
  });
  if (recent) return { ok: true, phone };

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const codeHash = await bcrypt.hash(code, 10);
  await prisma.loginCode.deleteMany({ where: { identifier: phone } });
  await prisma.loginCode.create({
    data: { identifier: phone, codeHash, expiresAt: new Date(Date.now() + CODE_TTL_MIN * 60 * 1000) },
  });
  await sendRawSms(phone, `BookEasy: Twój kod potwierdzający to ${code}. Ważny ${CODE_TTL_MIN} min.`);
  return { ok: true, phone };
}

export async function verifyBookingCode(
  phoneInput: string,
  codeInput: string
): Promise<BookingLoginResult> {
  const phone = normalizePhone(phoneInput);
  if (!phone) return { ok: false, error: "Podaj prawidłowy numer telefonu." };
  const code = codeInput.trim();
  if (!/^\d{6}$/.test(code)) return { ok: false, error: "Kod to 6 cyfr." };

  const rec = await prisma.loginCode.findFirst({
    where: { identifier: phone },
    orderBy: { createdAt: "desc" },
  });
  if (!rec || rec.expiresAt.getTime() < Date.now()) {
    return { ok: false, error: "Kod wygasł. Wyślij nowy." };
  }
  if (rec.attempts >= MAX_ATTEMPTS) {
    return { ok: false, error: "Za dużo prób. Wyślij nowy kod." };
  }

  const valid = await bcrypt.compare(code, rec.codeHash);
  if (!valid) {
    await prisma.loginCode.update({ where: { id: rec.id }, data: { attempts: { increment: 1 } } });
    return { ok: false, error: "Nieprawidłowy kod." };
  }

  await prisma.loginCode.deleteMany({ where: { identifier: phone } });

  // Jeśli klient jest już zalogowany e-mailem, doczepiamy zweryfikowany numer
  // do jego konta i sesji. W przeciwnym razie zwykłe logowanie telefonem.
  const identity = await getClientIdentity();
  const email = identity?.email ?? undefined;
  if (email) {
    await prisma.clientAccount.updateMany({ where: { email }, data: { phone } });
  }
  await createClientSession({ phone, email });
  return { ok: true, phone, email };
}

// Logowanie / rejestracja e-mailem i hasłem w trakcie rezerwacji.
export async function bookingEmailAuth(
  emailInput: string,
  password: string,
  intent: "login" | "register"
): Promise<BookingLoginResult> {
  const email = normalizeEmail(emailInput);
  if (!email) return { ok: false, error: "Podaj prawidłowy adres e-mail." };

  if (intent === "register") {
    if (password.length < 8) return { ok: false, error: "Hasło musi mieć co najmniej 8 znaków." };
    const exists = await prisma.clientAccount.findUnique({ where: { email } });
    if (exists) return { ok: false, error: "Konto z tym e-mailem już istnieje — zaloguj się." };
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.clientAccount.create({ data: { email, passwordHash } });
    await createClientSession({ email });
    return { ok: true, email };
  }

  const account = await prisma.clientAccount.findUnique({ where: { email } });
  if (!account || !(await bcrypt.compare(password, account.passwordHash))) {
    return { ok: false, error: "Nieprawidłowy e-mail lub hasło." };
  }
  await createClientSession({ email, phone: account.phone ?? undefined });
  return { ok: true, email, phone: account.phone ?? undefined };
}

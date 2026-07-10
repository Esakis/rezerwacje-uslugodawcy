import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "./db";

const SESSION_COOKIE = "be_session";
const secret = new TextEncoder().encode(process.env.APP_SECRET || "dev-secret");

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function createSession(providerId: string): Promise<void> {
  const token = await new SignJWT({ sub: providerId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

// Zwraca id usługodawcy z sesji lub null.
export async function getSessionProviderId(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

// Pobiera zalogowanego usługodawcę; null jeśli brak sesji / nie istnieje.
export async function getCurrentProvider() {
  const id = await getSessionProviderId();
  if (!id) return null;
  return prisma.provider.findUnique({ where: { id } });
}

// Wersja rzucająca — do użycia w chronionych server actions.
export async function requireProvider() {
  const provider = await getCurrentProvider();
  if (!provider) throw new Error("Brak autoryzacji");
  return provider;
}

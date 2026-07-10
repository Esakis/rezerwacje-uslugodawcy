import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

// Sesja klienta końcowego (panel klienta) — osobna od sesji usługodawcy.
// Tożsamość = numer telefonu (ten sam identyfikator, którego używamy do wizyt).

const CLIENT_COOKIE = "be_client";
const secret = new TextEncoder().encode(process.env.APP_SECRET || "dev-secret");

export async function createClientSession(phone: string): Promise<void> {
  const token = await new SignJWT({ phone })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);

  const store = await cookies();
  store.set(CLIENT_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function destroyClientSession(): Promise<void> {
  const store = await cookies();
  store.delete(CLIENT_COOKIE);
}

// Zwraca numer telefonu zalogowanego klienta lub null.
export async function getClientPhone(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(CLIENT_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return typeof payload.phone === "string" ? payload.phone : null;
  } catch {
    return null;
  }
}

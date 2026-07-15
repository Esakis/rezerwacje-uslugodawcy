import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

// Sesja klienta końcowego (panel klienta) — osobna od sesji usługodawcy.
// Tożsamość = numer telefonu i/lub e-mail (zależnie od kanału logowania).

const CLIENT_COOKIE = "be_client";
const secret = new TextEncoder().encode(process.env.APP_SECRET || "dev-secret");

export type ClientIdentity = { phone: string | null; email: string | null };

export async function createClientSession(identity: {
  phone?: string;
  email?: string;
}): Promise<void> {
  const token = await new SignJWT({
    phone: identity.phone ?? null,
    email: identity.email ?? null,
  })
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

// Tożsamość zalogowanego klienta lub null (brak/nieważna sesja).
export async function getClientIdentity(): Promise<ClientIdentity | null> {
  const store = await cookies();
  const token = store.get(CLIENT_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    const phone = typeof payload.phone === "string" ? payload.phone : null;
    const email = typeof payload.email === "string" ? payload.email : null;
    if (!phone && !email) return null;
    return { phone, email };
  } catch {
    return null;
  }
}

// Warunek Prisma dopasowujący klienta do zalogowanej tożsamości
// (telefon LUB e-mail — zależnie od tego, czym się zalogował).
export function clientMatch(identity: ClientIdentity): {
  OR: Array<{ phone: string } | { email: string }>;
} {
  const or: Array<{ phone: string } | { email: string }> = [];
  if (identity.phone) or.push({ phone: identity.phone });
  if (identity.email) or.push({ email: identity.email });
  return { OR: or };
}

// Szybki test renderowania /panel/stats: loguje się jak lib/auth.ts (JWT w cookie)
// na konto demo i sprawdza, że strona zwraca 200 z kluczowymi sekcjami.
import { SignJWT } from "jose";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BASE = process.env.BASE_URL || "http://localhost:3000";
const secret = new TextEncoder().encode(process.env.APP_SECRET || "dev-secret");

const provider = await prisma.provider.findUnique({ where: { email: "demo@bookeasy.pl" } });
if (!provider) throw new Error("Brak konta demo — uruchom npm run db:seed");

const token = await new SignJWT({ sub: provider.id })
  .setProtectedHeader({ alg: "HS256" })
  .setIssuedAt()
  .setExpirationTime("1h")
  .sign(secret);

for (const okres of ["", "?okres=90", "?okres=365"]) {
  const res = await fetch(`${BASE}/panel/stats${okres}`, {
    headers: { Cookie: `be_session=${token}` },
    redirect: "manual",
  });
  if (res.status !== 200) throw new Error(`/panel/stats${okres}: HTTP ${res.status}`);
  const html = await res.text();
  for (const expected of ["Statystyki", "No-show rate", "Najpopularniejsze usługi", "Przychód miesięcznie"]) {
    if (!html.includes(expected)) throw new Error(`/panel/stats${okres}: brak sekcji "${expected}"`);
  }
  console.log(`[OK] /panel/stats${okres} — 200, wszystkie sekcje obecne`);
}

await prisma.$disconnect();
console.log("✅ STATS PAGE OK");

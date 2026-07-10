import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { exchangeCodeForUser, googleEnabled, appUrl } from "@/lib/google";
import { slugify } from "@/lib/slug";
import { defaultWorkingHours, serializeWorkingHours } from "@/lib/workingHours";

function loginError(code: string) {
  return NextResponse.redirect(new URL(`/login?error=${code}`, appUrl()));
}

// GET /api/auth/google/callback — powrót z Google, utworzenie/logowanie konta.
export async function GET(req: NextRequest) {
  if (!googleEnabled()) return loginError("google_off");

  const url = req.nextUrl;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = req.cookies.get("g_state")?.value;

  if (!code || !state || !cookieState || state !== cookieState) {
    return loginError("google_state");
  }

  const gu = await exchangeCodeForUser(code);
  if (!gu) return loginError("google_failed");

  // 1) Konto już powiązane z tym Google.
  let provider = await prisma.provider.findUnique({ where: { googleId: gu.sub } });

  // 2) Konto z tym e-mailem — dowiąż Google.
  if (!provider) {
    const byEmail = await prisma.provider.findUnique({ where: { email: gu.email } });
    if (byEmail) {
      provider = await prisma.provider.update({
        where: { id: byEmail.id },
        data: { googleId: gu.sub, avatarUrl: gu.picture ?? byEmail.avatarUrl },
      });
    }
  }

  // 3) Nowe konto (rejestracja przez Google).
  if (!provider) {
    const name = gu.name || gu.email.split("@")[0];
    const base = slugify(name) || "salon";
    let slug = base;
    let n = 1;
    while (await prisma.provider.findUnique({ where: { slug } })) {
      slug = `${base}-${++n}`;
    }
    provider = await prisma.provider.create({
      data: {
        email: gu.email,
        googleId: gu.sub,
        avatarUrl: gu.picture,
        name,
        slug,
        workingHours: serializeWorkingHours(defaultWorkingHours()),
        plan: "trial",
        trialUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
    });
  }

  await createSession(provider.id);
  const res = NextResponse.redirect(new URL("/panel", appUrl()));
  res.cookies.delete("g_state");
  return res;
}

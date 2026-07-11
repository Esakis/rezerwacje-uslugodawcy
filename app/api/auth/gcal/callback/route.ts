import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionProviderId } from "@/lib/auth";
import { appUrl } from "@/lib/google";
import { exchangeCodeForCalendar, gcalEnabled } from "@/lib/gcal";

function settingsRedirect(status: string) {
  return NextResponse.redirect(new URL(`/panel/settings?gcal=${status}`, appUrl()));
}

// GET /api/auth/gcal/callback — powrót z Google, zapis refresh tokena kalendarza.
export async function GET(req: NextRequest) {
  if (!gcalEnabled()) return settingsRedirect("off");

  const providerId = await getSessionProviderId();
  if (!providerId) {
    return NextResponse.redirect(new URL("/login", appUrl()));
  }

  const url = req.nextUrl;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = req.cookies.get("gcal_state")?.value;
  if (!code || !state || !cookieState || state !== cookieState) {
    return settingsRedirect("state");
  }

  const tokens = await exchangeCodeForCalendar(code);
  if (!tokens) return settingsRedirect("failed");

  await prisma.provider.update({
    where: { id: providerId },
    data: { gcalRefreshToken: tokens.refreshToken, gcalEmail: tokens.email },
  });

  const res = settingsRedirect("ok");
  res.cookies.delete("gcal_state");
  return res;
}

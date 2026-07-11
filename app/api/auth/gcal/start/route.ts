import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getSessionProviderId } from "@/lib/auth";
import { appUrl } from "@/lib/google";
import { gcalAuthUrl, gcalEnabled } from "@/lib/gcal";

// GET /api/auth/gcal/start — podłączenie Google Calendar (wymaga zalogowanego usługodawcy).
export async function GET() {
  if (!gcalEnabled()) {
    return NextResponse.redirect(new URL("/panel/settings?gcal=off", appUrl()));
  }
  const providerId = await getSessionProviderId();
  if (!providerId) {
    return NextResponse.redirect(new URL("/login", appUrl()));
  }

  const state = randomUUID();
  const res = NextResponse.redirect(gcalAuthUrl(state));
  res.cookies.set("gcal_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });
  return res;
}

import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { googleAuthUrl, googleEnabled } from "@/lib/google";

// GET /api/auth/google/start — start logowania przez Google.
export async function GET() {
  if (!googleEnabled()) {
    return NextResponse.redirect(
      new URL("/login?error=google_off", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000")
    );
  }

  const state = randomUUID();
  const res = NextResponse.redirect(googleAuthUrl(state));
  res.cookies.set("g_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });
  return res;
}

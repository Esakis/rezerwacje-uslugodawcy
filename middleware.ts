import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.APP_SECRET || "dev-secret");

// Chroni /panel — bez ważnej sesji przekierowanie na /login.
// (Weryfikacja tokenu w middleware; pełne dane usługodawcy pobierane już w stronach.)
export async function middleware(req: NextRequest) {
  const token = req.cookies.get("be_session")?.value;
  let valid = false;
  if (token) {
    try {
      await jwtVerify(token, secret);
      valid = true;
    } catch {
      valid = false;
    }
  }

  if (!valid) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/panel/:path*"],
};

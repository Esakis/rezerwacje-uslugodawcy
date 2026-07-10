// Logowanie/rejestracja przez Google (OAuth2 authorization code).
// Włączane przez zmienne środowiskowe — bez nich przyciski Google są ukryte,
// a klasyczne logowanie e-mail/hasło działa normalnie.

export function googleEnabled(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function googleRedirectUri(): string {
  return `${appUrl()}/api/auth/google/callback`;
}

// URL zgody Google. state = losowy token (CSRF) zapisany w cookie.
export function googleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID as string,
    redirect_uri: googleRedirectUri(),
    response_type: "code",
    scope: "openid email profile",
    access_type: "online",
    prompt: "select_account",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export interface GoogleUser {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
}

// Wymiana kodu na tokeny i pobranie profilu użytkownika.
export async function exchangeCodeForUser(code: string): Promise<GoogleUser | null> {
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID as string,
      client_secret: process.env.GOOGLE_CLIENT_SECRET as string,
      redirect_uri: googleRedirectUri(),
      grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) return null;
  const token = (await tokenRes.json()) as { access_token?: string };
  if (!token.access_token) return null;

  const infoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  if (!infoRes.ok) return null;
  const info = (await infoRes.json()) as {
    sub?: string;
    email?: string;
    name?: string;
    picture?: string;
  };
  if (!info.sub || !info.email) return null;
  return { sub: info.sub, email: info.email.toLowerCase(), name: info.name, picture: info.picture };
}

// Integracja z Google Calendar (roadmapa v2, PLAN.md sekcja 8).
// Osobny flow zgody niż logowanie Google: access_type=offline + scope kalendarza,
// bo logowanie nie przechowuje refresh tokena.
// Zasada: best-effort — awaria Google nigdy nie blokuje rezerwacji ani panelu.

import { prisma } from "./db";
import { appUrl, googleEnabled } from "./google";

export const gcalEnabled = googleEnabled;

// Wizyty trafiają do głównego kalendarza konta; wybór innego kalendarza = v2.
const CALENDAR_ID = "primary";

// Timeout na każde wywołanie Google — wiszące połączenie nie może blokować
// strony rezerwacji ani POST-a rezerwacji.
const FETCH_TIMEOUT_MS = 8000;

function gfetch(url: string, init: RequestInit): Promise<Response> {
  return fetch(url, { ...init, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
}

export function gcalRedirectUri(): string {
  return `${appUrl()}/api/auth/gcal/callback`;
}

const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.freebusy",
  "openid",
  "email",
].join(" ");

// URL zgody Google. state = losowy token (CSRF) zapisany w cookie.
export function gcalAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID as string,
    redirect_uri: gcalRedirectUri(),
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent", // wymusza wydanie refresh_token także przy ponownym podłączeniu
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

// Wymiana kodu na refresh token (stałe połączenie) + e-mail konta do wyświetlenia w ustawieniach.
// Zwraca null przy każdym błędzie (także sieciowym) — callback pokazuje wtedy ?gcal=failed.
export async function exchangeCodeForCalendar(
  code: string
): Promise<{ refreshToken: string; email: string | null } | null> {
  try {
    const res = await gfetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID as string,
        client_secret: process.env.GOOGLE_CLIENT_SECRET as string,
        redirect_uri: gcalRedirectUri(),
        grant_type: "authorization_code",
      }),
    });
    if (!res.ok) return null;
    const tok = (await res.json()) as { refresh_token?: string; access_token?: string };
    if (!tok.refresh_token) return null;

    let email: string | null = null;
    if (tok.access_token) {
      const info = await gfetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${tok.access_token}` },
      });
      if (info.ok) {
        email = ((await info.json()) as { email?: string }).email?.toLowerCase() ?? null;
      }
    }
    return { refreshToken: tok.refresh_token, email };
  } catch (e) {
    console.warn("[gcal] code exchange failed:", e);
    return null;
  }
}

interface ProviderGcal {
  id: string;
  gcalRefreshToken: string | null;
}

// Cache access tokenów per usługodawca (token żyje ~1 h; cache per instancja serverless).
const tokenCache = new Map<string, { token: string; expiresAt: number }>();

async function getAccessToken(p: ProviderGcal): Promise<string | null> {
  if (!gcalEnabled() || !p.gcalRefreshToken) return null;
  const cached = tokenCache.get(p.id);
  if (cached && cached.expiresAt > Date.now()) return cached.token;

  const res = await gfetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: p.gcalRefreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID as string,
      client_secret: process.env.GOOGLE_CLIENT_SECRET as string,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    // invalid_grant = użytkownik cofnął zgodę w Google — odłącz kalendarz, żeby
    // ustawienia pokazywały stan faktyczny. Inne błędy (przejściowe/konfiguracyjne)
    // nie mogą kasować ważnego refresh tokena.
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    if (err.error === "invalid_grant") {
      tokenCache.delete(p.id);
      await prisma.provider
        .update({ where: { id: p.id }, data: { gcalRefreshToken: null, gcalEmail: null } })
        .catch(() => {});
    }
    return null;
  }
  const tok = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!tok.access_token) return null;
  tokenCache.set(p.id, {
    token: tok.access_token,
    expiresAt: Date.now() + ((tok.expires_in ?? 3600) - 60) * 1000,
  });
  return tok.access_token;
}

// Push wizyty do Google Calendar wg jej bieżącego stanu w bazie:
// booked bez wydarzenia → utwórz; cancelled z wydarzeniem → usuń.
// Wywoływana po każdej zmianie wizyty. Nigdy nie rzuca.
export async function syncAppointmentToGcal(appointmentId: string): Promise<void> {
  if (!gcalEnabled()) return;
  try {
    const appt = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { provider: true, service: true, client: true, staff: true },
    });
    if (!appt || !appt.provider.gcalRefreshToken) return;
    const token = await getAccessToken(appt.provider);
    if (!token) return;

    if (appt.status === "booked" && !appt.gcalEventId) {
      const summary = `${appt.service?.name ?? "Wizyta"} — ${appt.client?.name ?? "klient"}`;
      const description = [
        appt.client?.phone ? `Telefon: ${appt.client.phone}` : null,
        appt.staff?.name ? `Osoba: ${appt.staff.name}` : null,
        "Rezerwacja z BookEasy",
      ]
        .filter(Boolean)
        .join("\n");
      const res = await gfetch(
        `https://www.googleapis.com/calendar/v3/calendars/${CALENDAR_ID}/events`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            summary,
            description,
            start: { dateTime: appt.startAt.toISOString() },
            end: { dateTime: appt.endAt.toISOString() },
          }),
        }
      );
      if (res.ok) {
        const ev = (await res.json()) as { id?: string };
        if (ev.id) {
          await prisma.appointment.update({
            where: { id: appt.id },
            data: { gcalEventId: ev.id },
          });
        }
      }
    } else if (appt.status === "cancelled" && appt.gcalEventId) {
      const res = await gfetch(
        `https://www.googleapis.com/calendar/v3/calendars/${CALENDAR_ID}/events/${encodeURIComponent(appt.gcalEventId)}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
      );
      // 404/410 = wydarzenie usunięte ręcznie w Google — też czyścimy referencję.
      if (res.ok || res.status === 404 || res.status === 410) {
        await prisma.appointment.update({
          where: { id: appt.id },
          data: { gcalEventId: null },
        });
      }
    }
  } catch (e) {
    console.warn("[gcal] sync failed:", e);
  }
}

export interface GcalBusy {
  startAt: Date;
  endAt: Date;
}

// Krótki cache wyników freeBusy — sloty liczone są przy każdym renderze strony rezerwacji.
// isSlotFree tworzy unikalny klucz per próba rezerwacji, więc mapa wymaga ewikcji.
const busyCache = new Map<string, { at: number; busy: GcalBusy[] }>();
const BUSY_CACHE_MS = 60_000;
const BUSY_CACHE_MAX = 500;

// Zajętości z kalendarza Google w danym przedziale (freeBusy API).
// Zwraca [] gdy kalendarz niepodłączony albo Google nie odpowiada (best-effort:
// wolimy zaryzykować kolizję z prywatnym wydarzeniem niż zablokować rezerwacje).
export async function getGcalBusy(
  provider: ProviderGcal,
  rangeStart: Date,
  rangeEnd: Date
): Promise<GcalBusy[]> {
  if (!gcalEnabled() || !provider.gcalRefreshToken) return [];
  const key = `${provider.id}:${rangeStart.getTime()}:${rangeEnd.getTime()}`;
  const cached = busyCache.get(key);
  if (cached) {
    if (Date.now() - cached.at < BUSY_CACHE_MS) return cached.busy;
    busyCache.delete(key);
  }

  try {
    const token = await getAccessToken(provider);
    if (!token) return [];
    const res = await gfetch("https://www.googleapis.com/calendar/v3/freeBusy", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        timeMin: rangeStart.toISOString(),
        timeMax: rangeEnd.toISOString(),
        items: [{ id: CALENDAR_ID }],
      }),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      calendars?: Record<string, { busy?: { start: string; end: string }[] }>;
    };
    const busy = (data.calendars?.[CALENDAR_ID]?.busy ?? []).map((b) => ({
      startAt: new Date(b.start),
      endAt: new Date(b.end),
    }));
    if (busyCache.size >= BUSY_CACHE_MAX) busyCache.clear();
    busyCache.set(key, { at: Date.now(), busy });
    return busy;
  } catch (e) {
    console.warn("[gcal] freeBusy failed:", e);
    return [];
  }
}

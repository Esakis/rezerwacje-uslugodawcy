import type { Provider } from "@prisma/client";
import { prisma } from "../db";
import { getPlan, smsAvailable } from "../plans";
import { fmtDateHuman, fmtTime } from "../time";
import { bookingUrl, cancelUrl } from "../tokens";
import { MockSmsProvider } from "./mock";
import { PhoneGatewayProvider } from "./phone";
import type { SmsProvider } from "./provider";
import { SmsApiProvider } from "./smsapi";

export type SmsType =
  | "confirm"
  | "reminder24"
  | "reminder2"
  | "cancel"
  | "login"
  | "reactivation"
  | "owner_new";

function getProvider(): SmsProvider {
  const kind = process.env.SMS_PROVIDER || "mock";
  if (kind === "smsapi") {
    const token = process.env.SMSAPI_TOKEN;
    if (token) return new SmsApiProvider(token);
    // eslint-disable-next-line no-console
    console.warn("[SMS] SMS_PROVIDER=smsapi, ale brak SMSAPI_TOKEN — używam mocka.");
  }
  return new MockSmsProvider();
}

// Nazwa nadawcy: własna (plan solo_plus) lub domyślna.
function senderName(provider: Provider): string {
  const plan = getPlan(provider.plan);
  if (plan.customSender && provider.smsSenderName) return provider.smsSenderName;
  return process.env.SMS_SENDER_NAME || "BookEasy";
}

// Reset licznika SMS jeśli minął miesiąc od początku okresu.
async function ensurePeriod(provider: Provider): Promise<Provider> {
  const periodStart = provider.smsPeriodStart;
  const monthMs = 30 * 24 * 60 * 60 * 1000;
  if (Date.now() - periodStart.getTime() > monthMs) {
    return prisma.provider.update({
      where: { id: provider.id },
      data: { smsUsed: 0, smsPeriodStart: new Date() },
    });
  }
  return provider;
}

interface SendResult {
  ok: boolean;
  status: "sent" | "failed" | "skipped_limit";
  error?: string;
}

// Główna funkcja wysyłki: sprawdza limit planu, wysyła, loguje do sms_log, aktualizuje licznik.
// system=true: powiadomienie wewnętrzne (np. do usługodawcy) — poza limitem planu
// i licznikiem, ale nadal logowane i z priorytetem bramki telefonu.
export async function sendSms(params: {
  providerId: string;
  appointmentId?: string;
  type: SmsType;
  to: string;
  body: string;
  system?: boolean;
}): Promise<SendResult> {
  let provider = await prisma.provider.findUnique({ where: { id: params.providerId } });
  if (!provider) return { ok: false, status: "failed", error: "Brak usługodawcy" };

  provider = await ensurePeriod(provider);
  const plan = getPlan(provider.plan);

  // Telefon usługodawcy (SMS Gate): za darmo, poza limitem planu i licznikiem.
  // Gdy zlecenie się nie powiedzie (złe dane / chmura niedostępna) — fallback
  // na globalną bramkę poniżej, już na zwykłych zasadach limitu.
  if (provider.phoneGwLogin && provider.phoneGwPassword) {
    const phoneGw = new PhoneGatewayProvider(provider.phoneGwLogin, provider.phoneGwPassword);
    const phoneResult = await phoneGw.send({ to: params.to, body: params.body });
    if (phoneResult.ok) {
      await prisma.smsLog.create({
        data: {
          providerId: provider.id,
          appointmentId: params.appointmentId,
          type: params.type,
          phone: params.to,
          body: params.body,
          status: "sent",
          costGrosze: 0,
        },
      });
      return { ok: true, status: "sent" };
    }
    // eslint-disable-next-line no-console
    console.warn(`[SMS] Bramka telefonu zawiodła (${phoneResult.error}) — fallback na globalną.`);
  }

  // Limit SMS wg planu (nie dotyczy powiadomień systemowych).
  if (!params.system && !smsAvailable(plan, provider.smsUsed)) {
    await prisma.smsLog.create({
      data: {
        providerId: provider.id,
        appointmentId: params.appointmentId,
        type: params.type,
        phone: params.to,
        body: params.body,
        status: "skipped_limit",
        costGrosze: 0,
      },
    });
    return { ok: false, status: "skipped_limit", error: "Limit SMS wyczerpany" };
  }

  const smsProvider = getProvider();
  const result = await smsProvider.send({
    to: params.to,
    body: params.body,
    from: senderName(provider),
  });

  await prisma.smsLog.create({
    data: {
      providerId: provider.id,
      appointmentId: params.appointmentId,
      type: params.type,
      phone: params.to,
      body: params.body,
      status: result.ok ? "sent" : "failed",
      costGrosze: result.costGrosze,
    },
  });

  if (result.ok && !params.system) {
    await prisma.provider.update({
      where: { id: provider.id },
      data: { smsUsed: { increment: 1 } },
    });
  }

  return {
    ok: result.ok,
    status: result.ok ? "sent" : "failed",
    error: result.error,
  };
}

// Wysyłka systemowa (kod logowania klienta) — poza limitem planu usługodawcy,
// bez wpisu w sms_log powiązanym z providerem.
export async function sendRawSms(to: string, body: string): Promise<boolean> {
  const smsProvider = getProvider();
  const result = await smsProvider.send({
    to,
    body,
    from: process.env.SMS_SENDER_NAME || "BookEasy",
  });
  return result.ok;
}

// --- Szablony wiadomości ---

interface ApptForSms {
  startAt: Date;
  cancelToken: string;
}

export function confirmBody(
  providerName: string,
  serviceName: string,
  appt: ApptForSms
): string {
  return (
    `${providerName}: rezerwacja potwierdzona.\n` +
    `${serviceName}, ${fmtDateHuman(appt.startAt)} o ${fmtTime(appt.startAt)}.\n` +
    `Odwołaj/zmień: ${cancelUrl(appt.cancelToken)}`
  );
}

export function reminder24Body(
  providerName: string,
  serviceName: string,
  appt: ApptForSms
): string {
  return (
    `Przypomnienie: jutro o ${fmtTime(appt.startAt)} masz wizytę (${serviceName}) — ${providerName}.\n` +
    `Nie możesz? Odwołaj: ${cancelUrl(appt.cancelToken)}`
  );
}

export function reminder2Body(
  providerName: string,
  serviceName: string,
  appt: ApptForSms
): string {
  return (
    `Do zobaczenia dziś o ${fmtTime(appt.startAt)} (${serviceName}) — ${providerName}.\n` +
    `Odwołaj: ${cancelUrl(appt.cancelToken)}`
  );
}

export function cancelBody(providerName: string, appt: ApptForSms): string {
  return `${providerName}: Twoja wizyta ${fmtDateHuman(appt.startAt)} o ${fmtTime(
    appt.startAt
  )} została odwołana.`;
}

// Powiadomienie usługodawcy o nowej rezerwacji online (na jego numer z profilu).
export function ownerNewBookingBody(params: {
  serviceName: string;
  clientName: string;
  clientPhone: string;
  startAt: Date;
  staffName?: string | null;
}): string {
  return (
    `Nowa rezerwacja online!\n` +
    `${params.serviceName}, ${fmtDateHuman(params.startAt)} o ${fmtTime(params.startAt)}` +
    (params.staffName ? ` (do: ${params.staffName})` : "") +
    `\n${params.clientName}, tel. ${params.clientPhone}`
  );
}

// SMS „wróć do nas" — reaktywacja klienta po dłuższej przerwie (PLAN.md sekcja 8 pkt 5).
export function reactivationBody(providerName: string, clientName: string, slug: string): string {
  return (
    `${clientName}, dawno się nie widzieliśmy! ${providerName} zaprasza ponownie.\n` +
    `Zarezerwuj termin online: ${bookingUrl(slug)}`
  );
}

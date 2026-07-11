import { prisma } from "./db";
import {
  addMinutes,
  warsawStartOfDay,
  warsawTimeToUtc,
  warsawWeekday,
} from "./time";
import { parseWorkingHours } from "./workingHours";
import { getGcalBusy } from "./gcal";

export interface Slot {
  startAt: Date; // UTC
  endAt: Date; // UTC
}

interface Busy {
  startAt: Date;
  endAt: Date;
}

// Zajętość i blokady dla danego dnia, zawężone do pracownika (jeśli podany).
// staffId=null → tryb solo: kolizje ze wszystkimi wizytami usługodawcy.
// staffId=<id> → kolizje tylko z wizytami tej osoby + blokady tej osoby / całego salonu.
async function loadBusy(
  providerId: string,
  dayStart: Date,
  dayEnd: Date,
  staffId: string | null
): Promise<Busy[]> {
  const [appointments, blocks] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        providerId,
        ...(staffId ? { staffId } : {}),
        status: { in: ["booked", "done", "no_show"] },
        startAt: { lt: dayEnd },
        endAt: { gt: dayStart },
      },
      select: { startAt: true, endAt: true },
    }),
    prisma.timeBlock.findMany({
      where: {
        providerId,
        ...(staffId ? { OR: [{ staffId: null }, { staffId }] } : {}),
        startAt: { lt: dayEnd },
        endAt: { gt: dayStart },
      },
      select: { startAt: true, endAt: true },
    }),
  ]);
  return [...appointments, ...blocks];
}

// Sloty liczone w locie z godzin pracy minus istniejące wizyty i blokady (PLAN.md sekcja 3).
// day = dowolna data (w UTC) należąca do dnia, dla którego chcemy sloty.
export async function computeSlots(
  providerId: string,
  day: Date,
  serviceDurationMin: number,
  staffId?: string | null
): Promise<Slot[]> {
  const provider = await prisma.provider.findUnique({ where: { id: providerId } });
  if (!provider) return [];

  const weekday = warsawWeekday(day);
  const wh = parseWorkingHours(provider.workingHours);
  const intervals = wh[String(weekday)] ?? [];
  if (intervals.length === 0) return [];

  const dayStart = warsawStartOfDay(day);
  const dayEnd = addMinutes(dayStart, 24 * 60);

  const busy = await loadBusy(providerId, dayStart, dayEnd, staffId ?? null);
  // Zajętości z kalendarza Google właściciela — traktowane jak blokada całego salonu.
  busy.push(...(await getGcalBusy(provider, dayStart, dayEnd)));
  const buffer = provider.bufferMin ?? 0;
  const step = provider.slotStepMin > 0 ? provider.slotStepMin : 15;
  const now = new Date();

  const slots: Slot[] = [];

  for (const interval of intervals) {
    const windowStart = warsawTimeToUtc(day, interval.from);
    const windowEnd = warsawTimeToUtc(day, interval.to);

    for (
      let start = windowStart;
      addMinutes(start, serviceDurationMin) <= windowEnd;
      start = addMinutes(start, step)
    ) {
      const end = addMinutes(start, serviceDurationMin);

      // Odrzuć terminy w przeszłości.
      if (start <= now) continue;

      // Kolizja z zajętością (z buforem po obu stronach wizyty).
      const overlaps = busy.some((b) => {
        const bStart = addMinutes(b.startAt, -buffer);
        const bEnd = addMinutes(b.endAt, buffer);
        return start < bEnd && end > bStart;
      });
      if (overlaps) continue;

      slots.push({ startAt: start, endAt: end });
    }
  }

  return slots;
}

// Sprawdza, czy dokładny termin jest wolny (walidacja przy zapisie — zapobiega double-bookingowi).
export async function isSlotFree(
  providerId: string,
  startAt: Date,
  endAt: Date,
  ignoreAppointmentId?: string,
  staffId?: string | null
): Promise<boolean> {
  const provider = await prisma.provider.findUnique({ where: { id: providerId } });
  if (!provider) return false;
  const buffer = provider.bufferMin ?? 0;

  const bufStart = addMinutes(startAt, -buffer);
  const bufEnd = addMinutes(endAt, buffer);

  const [appt, block] = await Promise.all([
    prisma.appointment.findFirst({
      where: {
        providerId,
        ...(staffId ? { staffId } : {}),
        status: { in: ["booked", "done", "no_show"] },
        id: ignoreAppointmentId ? { not: ignoreAppointmentId } : undefined,
        startAt: { lt: bufEnd },
        endAt: { gt: bufStart },
      },
      select: { id: true },
    }),
    prisma.timeBlock.findFirst({
      where: {
        providerId,
        ...(staffId ? { OR: [{ staffId: null }, { staffId }] } : {}),
        startAt: { lt: bufEnd },
        endAt: { gt: bufStart },
      },
      select: { id: true },
    }),
  ]);

  if (appt || block) return false;

  // Kolizja z kalendarzem Google właściciela (jak blokada całego salonu).
  const gcalBusy = await getGcalBusy(provider, bufStart, bufEnd);
  return !gcalBusy.some((b) => bufStart < b.endAt && bufEnd > b.startAt);
}

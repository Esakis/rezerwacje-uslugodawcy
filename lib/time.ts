import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";

// Cała aplikacja operuje w strefie Europe/Warsaw, a w bazie trzyma UTC (PLAN.md sekcja 3).
export const TZ = "Europe/Warsaw";

// Dzień tygodnia 0-6 (0=niedziela) w strefie warszawskiej dla danej daty UTC.
export function warsawWeekday(dateUtc: Date): number {
  return toZonedTime(dateUtc, TZ).getDay();
}

// "HH:mm" danego dnia (rok/mies/dzień z `day` w TZ) -> Date w UTC.
export function warsawTimeToUtc(day: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(":").map(Number);
  const local = toZonedTime(day, TZ);
  const y = local.getFullYear();
  const mo = String(local.getMonth() + 1).padStart(2, "0");
  const d = String(local.getDate()).padStart(2, "0");
  const hh = String(h).padStart(2, "0");
  const mm = String(m).padStart(2, "0");
  // Interpretuj "YYYY-MM-DD HH:mm" jako czas warszawski i zamień na UTC.
  return fromZonedTime(`${y}-${mo}-${d} ${hh}:${mm}:00`, TZ);
}

// Początek doby (00:00 Europe/Warsaw) dla dnia zawierającego `dateUtc`.
export function warsawStartOfDay(dateUtc: Date): Date {
  const local = toZonedTime(dateUtc, TZ);
  const y = local.getFullYear();
  const mo = String(local.getMonth() + 1).padStart(2, "0");
  const d = String(local.getDate()).padStart(2, "0");
  return fromZonedTime(`${y}-${mo}-${d} 00:00:00`, TZ);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

// Formatowanie do wyświetlania (zawsze w TZ warszawskiej).
export function fmtTime(dateUtc: Date): string {
  return formatInTimeZone(dateUtc, TZ, "HH:mm");
}

export function fmtDate(dateUtc: Date): string {
  return formatInTimeZone(dateUtc, TZ, "yyyy-MM-dd");
}

export function fmtDateHuman(dateUtc: Date): string {
  return formatInTimeZone(dateUtc, TZ, "dd.MM.yyyy");
}

export function fmtDateTime(dateUtc: Date): string {
  return formatInTimeZone(dateUtc, TZ, "dd.MM.yyyy HH:mm");
}

const WEEKDAY_PL = [
  "niedziela",
  "poniedziałek",
  "wtorek",
  "środa",
  "czwartek",
  "piątek",
  "sobota",
];

export function weekdayNamePl(weekday: number): string {
  return WEEKDAY_PL[weekday] ?? "";
}

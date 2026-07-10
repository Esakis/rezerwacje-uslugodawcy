// Godziny pracy: mapa dzień tygodnia (0-6, 0=niedziela) -> lista przedziałów.
export interface Interval {
  from: string; // "09:00"
  to: string; // "17:00"
}

export type WorkingHours = Record<string, Interval[]>;

export function parseWorkingHours(json: string): WorkingHours {
  try {
    const parsed = JSON.parse(json || "{}");
    if (parsed && typeof parsed === "object") return parsed as WorkingHours;
  } catch {
    // ignoruj
  }
  return {};
}

export function serializeWorkingHours(wh: WorkingHours): string {
  return JSON.stringify(wh);
}

// Domyślne godziny: pon-pt 9-17.
export function defaultWorkingHours(): WorkingHours {
  const wh: WorkingHours = {};
  for (let d = 1; d <= 5; d++) wh[String(d)] = [{ from: "09:00", to: "17:00" }];
  wh["0"] = [];
  wh["6"] = [];
  return wh;
}

// "09:00" -> 540 (minuty od północy)
export function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function isValidHHMM(s: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
}

// Normalizacja numeru telefonu do formatu +48XXXXXXXXX (PL domyślnie).
export function normalizePhone(input: string): string | null {
  const raw = input.replace(/[\s\-()]/g, "");
  if (/^\+\d{9,15}$/.test(raw)) return raw;
  // 9 cyfr -> zakładamy PL
  if (/^\d{9}$/.test(raw)) return `+48${raw}`;
  // 0048... lub 48...
  if (/^0048\d{9}$/.test(raw)) return `+${raw.slice(2)}`;
  if (/^48\d{9}$/.test(raw)) return `+${raw}`;
  return null;
}

// Normalizacja e-maila (konto klienta). null jeśli to nie e-mail.
export function normalizeEmail(input: string): string | null {
  const e = input.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : null;
}

// Grosze -> "80,00 zł"
export function fmtPrice(grosze: number): string {
  const zl = (grosze / 100).toFixed(2).replace(".", ",");
  return `${zl} zł`;
}

// "80" albo "80,50" -> grosze (8000 / 8050). null jeśli błędne.
export function parsePriceToGrosze(input: string): number | null {
  const cleaned = input.trim().replace(/\s/g, "").replace("zł", "").replace(",", ".");
  const val = Number(cleaned);
  if (!Number.isFinite(val) || val < 0) return null;
  return Math.round(val * 100);
}

export function fmtDuration(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

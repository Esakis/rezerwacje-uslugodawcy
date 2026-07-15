// Kategorie usługodawców — wspólny słownik dla profilu publicznego i wyszukiwarki (/szukaj).
export const CATEGORIES = [
  { id: "fryzjer", label: "Fryzjer" },
  { id: "barber", label: "Barber" },
  { id: "kosmetyka", label: "Kosmetyka" },
  { id: "paznokcie", label: "Paznokcie" },
  { id: "rzesy_brwi", label: "Rzęsy i brwi" },
  { id: "masaz", label: "Masaż" },
  { id: "fizjoterapia", label: "Fizjoterapia" },
  { id: "tatuaz", label: "Tatuaż" },
  { id: "inne", label: "Inne" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];

export function isCategoryId(v: string): v is CategoryId {
  return CATEGORIES.some((c) => c.id === v);
}

export function categoryLabel(id: string | null | undefined): string | null {
  return CATEGORIES.find((c) => c.id === id)?.label ?? null;
}

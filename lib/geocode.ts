// Geokodowanie adresu na współrzędne przez Nominatim (OpenStreetMap).
// Darmowe, bez klucza API; wymaga nagłówka User-Agent i oszczędnego użycia
// (wywołujemy tylko przy zapisie profilu usługodawcy, nie przy wyszukiwaniu).

export async function geocodeAddress(
  address: string,
  city: string
): Promise<{ lat: number; lng: number } | null> {
  const q = `${address}, ${city}, Polska`;
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "BookEasy/1.0 (rezerwacje)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ lat: string; lon: string }>;
    if (!Array.isArray(data) || data.length === 0) return null;
    const lat = Number(data[0].lat);
    const lng = Number(data[0].lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}

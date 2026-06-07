/** Free geocoding via OpenStreetMap Nominatim (use sparingly). */
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const q = encodeURIComponent(address);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=1`,
      { headers: { "User-Agent": "IQ-POS-IQOrder/1.0 (contact@iq-pos.com)" } },
    );
    if (!res.ok) return null;
    const data = await res.json() as { lat: string; lon: string }[];
    if (!data?.[0]) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

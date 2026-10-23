/**
 * Turns a typed place name (city, area, landmark) into coordinates using OpenStreetMap's
 * Nominatim service. No API key needed. Usage is kept to one request per user search.
 */

export type GeocodeResult =
  | { ok: true; lat: number; lng: number; label: string }
  | { ok: false; message: string };

interface NominatimItem {
  lat: string;
  lon: string;
  display_name: string;
}

export async function geocodePlace(query: string): Promise<GeocodeResult> {
  const q = query.trim();
  if (q.length < 3) {
    return { ok: false, message: 'Type at least 3 characters, for example a city or a landmark.' };
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(q)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const items = (await res.json()) as NominatimItem[];
    if (items.length === 0) {
      return { ok: false, message: 'No place found with that name. Try a nearby landmark or a larger town.' };
    }
    const first = items[0];
    const lat = Number(first.lat);
    const lng = Number(first.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return { ok: false, message: 'That place could not be located. Try a different name.' };
    }
    return { ok: true, lat, lng, label: first.display_name };
  } catch {
    return { ok: false, message: 'Place search is unavailable right now. Check your connection and try again.' };
  }
}
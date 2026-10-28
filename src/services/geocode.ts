/**
 * Place name to coordinates, using OpenStreetMap's Nominatim service.
 *
 * Follows Nominatim's usage policy:
 * - Only runs when the user presses Search (never per keystroke).
 * - At most one request per second from this app.
 * - Identical queries share one request, and successful results are cached for 24 hours.
 */

export type GeocodeResult = { ok: true; lat: number; lng: number; label: string } | { ok: false; message: string };

type OkResult = Extract<GeocodeResult, { ok: true }>;

interface NominatimItem {
  lat: string;
  lon: string;
  display_name: string;
}

const MIN_CHARS = 3;
const MIN_INTERVAL_MS = 1100;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 15_000;

const cache = new Map<string, { at: number; value: OkResult }>();
const inFlight = new Map<string, Promise<GeocodeResult>>();

let queue: Promise<unknown> = Promise.resolve();
let lastStart = 0;

/** Runs tasks one at a time, at least MIN_INTERVAL_MS apart. */
function throttled<T>(task: () => Promise<T>): Promise<T> {
  const run = async (): Promise<T> => {
    const wait = lastStart + MIN_INTERVAL_MS - Date.now();
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    lastStart = Date.now();
    return task();
  };
  const next = queue.then(run, run);
  queue = next.catch(() => undefined);
  return next;
}

async function lookup(query: string): Promise<GeocodeResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=en&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, { signal: controller.signal });
    if (res.status === 429) {
      return { ok: false, message: 'Place search is busy. Wait a few seconds, then press Search again.' };
    }
    if (!res.ok) {
      return { ok: false, message: 'Place search is unavailable right now. Try again in a moment.' };
    }
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
    return { ok: false, message: 'Could not reach place search. Check your connection and press Search again.' };
  } finally {
    clearTimeout(timer);
  }
}

export async function geocodePlace(query: string): Promise<GeocodeResult> {
  const q = query.trim().replace(/\s+/g, ' ');
  if (q.length < MIN_CHARS) {
    return { ok: false, message: `Type at least ${MIN_CHARS} characters, for example a city, station or landmark.` };
  }

  const key = q.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;

  const pending = inFlight.get(key);
  if (pending) return pending;

  const job = throttled(() => lookup(q)).then((result) => {
    inFlight.delete(key);
    if (result.ok) cache.set(key, { at: Date.now(), value: result });
    return result;
  });
  inFlight.set(key, job);
  return job;
}
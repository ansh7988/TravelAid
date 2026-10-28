/**
 * Nearby help from OpenStreetMap data, fetched through the public Overpass API.
 *
 * How it stays polite and reliable:
 * - One Overpass request covers every category around a point. Category filters are applied
 *   in memory, so switching chips never sends a new request.
 * - Identical searches share one in-flight request, and successful results are cached for 10 minutes.
 * - Two Overpass servers are tried in order. If the service answers "too many requests",
 *   new searches pause for a minute instead of hammering it.
 * - Only values present in the map data are returned. Missing phone, hours or address stay undefined.
 *
 * Attribution: "© OpenStreetMap contributors" must be shown wherever this data appears.
 * Callers depend only on `PlacesProvider`, so another provider can replace this file later.
 */
import type { NearbyCategory } from '../types';

export const ALL_CATEGORIES: NearbyCategory[] = [
  'hospital',
  'clinic',
  'pharmacy',
  'police',
  'fuel',
  'parking',
  'repair',
  'hotel',
  'restaurant',
];

export const SEARCH_RADIUS_METERS = 8000;
export const OSM_ATTRIBUTION = '© OpenStreetMap contributors';

/** Stable, provider-neutral record. The `id` (for example "node/123456") is safe to store later. */
export interface PlaceBase {
  id: string;
  name: string | null;
  category: NearbyCategory;
  lat: number;
  lng: number;
  phone?: string; // first number as recorded in the map data
  openingHours?: string; // exactly as recorded in the map data
  address?: string;
}

export interface Place extends PlaceBase {
  distanceMeters: number; // from the exact search point
}

export type PlacesErrorKind = 'network' | 'busy' | 'rate_limited';

export interface PlacesError {
  kind: PlacesErrorKind;
  message: string;
}

export type PlacesResult =
  | { status: 'ok'; places: Place[]; truncated: boolean }
  | ({ status: 'error' } & PlacesError);

export interface PlacesSearchParams {
  lat: number;
  lng: number;
}

export interface PlacesProvider {
  search(params: PlacesSearchParams): Promise<PlacesResult>;
}

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];
const REQUEST_TIMEOUT_MS = 30_000;
const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX_ENTRIES = 30;
const RATE_LIMIT_COOLDOWN_MS = 60 * 1000;
const MAX_ELEMENTS = 500;

/** OpenStreetMap tag filters for each category. */
const CATEGORY_FILTERS: Record<NearbyCategory, string[]> = {
  hospital: ['nwr["amenity"="hospital"]'],
  clinic: ['nwr["amenity"="clinic"]', 'nwr["amenity"="doctors"]'],
  pharmacy: ['nwr["amenity"="pharmacy"]', 'nwr["shop"="chemist"]'],
  police: ['nwr["amenity"="police"]'],
  fuel: ['nwr["amenity"="fuel"]'],
  parking: ['nwr["amenity"="parking"]'],
  // Garages and puncture / tyre shops
  repair: ['nwr["shop"="car_repair"]', 'nwr["shop"="tyres"]', 'nwr["amenity"="car_repair"]'],
  hotel: ['nwr["tourism"~"^(hotel|motel|guest_house|hostel)$"]'],
  restaurant: ['nwr["amenity"~"^(restaurant|fast_food|cafe)$"]'],
};

interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

export function distanceMeters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function categoryOf(tags: Record<string, string>): NearbyCategory | null {
  const { amenity, shop, tourism } = tags;
  if (amenity === 'hospital') return 'hospital';
  if (amenity === 'clinic' || amenity === 'doctors') return 'clinic';
  if (amenity === 'pharmacy' || shop === 'chemist') return 'pharmacy';
  if (amenity === 'police') return 'police';
  if (amenity === 'fuel') return 'fuel';
  if (amenity === 'parking') return 'parking';
  if (shop === 'car_repair' || shop === 'tyres' || amenity === 'car_repair') return 'repair';
  if (tourism && ['hotel', 'motel', 'guest_house', 'hostel'].includes(tourism)) return 'hotel';
  if (amenity && ['restaurant', 'fast_food', 'cafe'].includes(amenity)) return 'restaurant';
  return null;
}

function text(value: string | undefined): string | undefined {
  const t = value?.trim();
  return t ? t : undefined;
}

function firstPhone(raw: string | undefined): string | undefined {
  const value = text(raw);
  if (!value) return undefined;
  // Map data often lists several numbers separated by ";" or ",". Keep the first.
  return text(value.split(/[;,/]/)[0]);
}

function formatAddress(tags: Record<string, string>): string | undefined {
  const street = [text(tags['addr:housenumber']), text(tags['addr:street'])].filter(Boolean).join(' ');
  const parts = [street, text(tags['addr:suburb']), text(tags['addr:city']), text(tags['addr:postcode'])].filter(
    (p): p is string => Boolean(p),
  );
  return parts.length ? parts.join(', ') : undefined;
}

function toPlace(el: OverpassElement): PlaceBase | null {
  const tags = el.tags ?? {};
  const category = categoryOf(tags);
  if (!category) return null;
  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  return {
    id: `${el.type}/${el.id}`,
    name: text(tags.name) ?? text(tags['name:en']) ?? null,
    category,
    lat,
    lng,
    phone: firstPhone(tags.phone ?? tags['contact:phone']),
    openingHours: text(tags.opening_hours),
    address: formatAddress(tags),
  };
}

function buildQuery(lat: number, lng: number): string {
  const around = `(around:${SEARCH_RADIUS_METERS},${lat},${lng})`;
  const filters = ALL_CATEGORIES.flatMap((c) => CATEGORY_FILTERS[c]).map((f) => `${f}${around};`);
  return ['[out:json][timeout:25];', '(', ...filters, ');', `out center tags ${MAX_ELEMENTS};`].join('\n');
}

type OverpassOutcome = { ok: true; elements: OverpassElement[] } | { ok: false; kind: PlacesErrorKind };

async function requestOverpass(query: string): Promise<OverpassOutcome> {
  let saw429 = false;
  let sawServerBusy = false;

  for (const url of OVERPASS_ENDPOINTS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      });
      if (res.status === 429) {
        saw429 = true;
        continue;
      }
      if (!res.ok) {
        sawServerBusy = true;
        continue;
      }
      const json = (await res.json()) as { elements?: OverpassElement[]; remark?: string };
      if (json.remark && /runtime error|timed out|out of memory/i.test(json.remark)) {
        sawServerBusy = true;
        continue;
      }
      return { ok: true, elements: json.elements ?? [] };
    } catch {
      // Network error or timeout: try the next endpoint.
    } finally {
      clearTimeout(timer);
    }
  }

  if (saw429) return { ok: false, kind: 'rate_limited' };
  if (sawServerBusy) return { ok: false, kind: 'busy' };
  return { ok: false, kind: 'network' };
}

const MESSAGES: Record<PlacesErrorKind, string> = {
  network: 'Could not reach the map data service. Check your connection and try again.',
  busy: 'The map data service is busy right now. Try again in a moment.',
  rate_limited: 'Too many nearby searches just now. Wait about a minute, then try again.',
};

type FetchOutcome = { ok: true; places: PlaceBase[]; truncated: boolean } | { ok: false; error: PlacesError };

let cooldownUntil = 0;

async function fetchPlaces(lat: number, lng: number): Promise<FetchOutcome> {
  if (Date.now() < cooldownUntil) {
    return { ok: false, error: { kind: 'rate_limited', message: MESSAGES.rate_limited } };
  }
  const outcome = await requestOverpass(buildQuery(lat, lng));
  if (!outcome.ok) {
    if (outcome.kind === 'rate_limited') cooldownUntil = Date.now() + RATE_LIMIT_COOLDOWN_MS;
    return { ok: false, error: { kind: outcome.kind, message: MESSAGES[outcome.kind] } };
  }
  const byId = new Map<string, PlaceBase>();
  for (const el of outcome.elements) {
    const place = toPlace(el);
    if (place && !byId.has(place.id)) byId.set(place.id, place);
  }
  // Overpass returns at most MAX_ELEMENTS, and not nearest-first, so a full response may hide some places.
  return { ok: true, places: [...byId.values()], truncated: outcome.elements.length >= MAX_ELEMENTS };
}

/** Cache key rounded to about 100 m, so tiny GPS jitter reuses the same result. */
function cacheKey(lat: number, lng: number): string {
  return `${lat.toFixed(3)},${lng.toFixed(3)}`;
}

interface CacheEntry {
  at: number;
  places: PlaceBase[];
  truncated: boolean;
}

const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<FetchOutcome>>();

function readCache(key: string): CacheEntry | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return hit;
}

function writeCache(key: string, entry: Omit<CacheEntry, 'at'>): void {
  cache.set(key, { at: Date.now(), ...entry });
  while (cache.size > CACHE_MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}

export const overpassProvider: PlacesProvider = {
  async search({ lat, lng }) {
    const key = cacheKey(lat, lng);
    let entry = readCache(key);

    if (!entry) {
      let pending = inFlight.get(key);
      if (!pending) {
        pending = fetchPlaces(lat, lng).then((outcome) => {
          inFlight.delete(key);
          if (outcome.ok) writeCache(key, { places: outcome.places, truncated: outcome.truncated });
          return outcome;
        });
        inFlight.set(key, pending);
      }
      const outcome = await pending;
      if (!outcome.ok) return { status: 'error', ...outcome.error };
      entry = { at: Date.now(), places: outcome.places, truncated: outcome.truncated };
    }

    const places: Place[] = entry.places
      .map((p) => ({ ...p, distanceMeters: distanceMeters(lat, lng, p.lat, p.lng) }))
      .sort((a, b) => a.distanceMeters - b.distanceMeters);

    return { status: 'ok', places, truncated: entry.truncated };
  },
};

export const placesProvider: PlacesProvider = overpassProvider;
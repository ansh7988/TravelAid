/**
 * Nearby help search using OpenStreetMap data through the public Overpass API.
 * No API key is needed. Results come only from the map data itself. Nothing is invented.
 *
 * Attribution is required: "© OpenStreetMap contributors" is shown on the Nearby Help page.
 * Please keep usage light (one search per user action). For heavy use, host your own Overpass
 * instance or switch to a paid provider behind a server-side proxy.
 */
import type { NearbyCategory } from '../types';

export interface Place {
  id: string;
  name: string;
  category: NearbyCategory;
  lat: number;
  lng: number;
  distanceMeters: number;
  phone?: string;
  openingHours?: string; // exactly as recorded in the map data
  address?: string;
}

export type PlacesResult =
  | { status: 'ok'; places: Place[] }
  | { status: 'error'; message: string };

export interface PlacesSearchParams {
  lat: number;
  lng: number;
  category: NearbyCategory | 'all';
}

export interface PlacesProvider {
  search(params: PlacesSearchParams): Promise<PlacesResult>;
}

export const SEARCH_RADIUS_METERS = 8000;
export const OSM_ATTRIBUTION = '© OpenStreetMap contributors';

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

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
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function categoryOf(tags: Record<string, string>): NearbyCategory | null {
  const amenity = tags.amenity;
  if (amenity === 'hospital') return 'hospital';
  if (amenity === 'clinic' || amenity === 'doctors') return 'clinic';
  if (amenity === 'pharmacy' || tags.shop === 'chemist') return 'pharmacy';
  if (amenity === 'police') return 'police';
  if (amenity === 'fuel') return 'fuel';
  return null;
}

function formatAddress(tags: Record<string, string>): string | undefined {
  const street = [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ');
  const parts = [street, tags['addr:suburb'], tags['addr:city'], tags['addr:postcode']].filter(Boolean);
  return parts.length ? parts.join(', ') : undefined;
}

function buildQuery(lat: number, lng: number): string {
  const around = `(around:${SEARCH_RADIUS_METERS},${lat},${lng})`;
  return [
    '[out:json][timeout:25];',
    '(',
    `nwr["amenity"~"^(hospital|clinic|doctors|pharmacy|police|fuel)$"]${around};`,
    `nwr["shop"="chemist"]${around};`,
    ');',
    'out center tags 150;',
  ].join('');
}

async function runQuery(query: string): Promise<OverpassElement[]> {
  let lastError: unknown = new Error('No endpoint responded');
  for (const url of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as { elements?: OverpassElement[] };
      return json.elements ?? [];
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

export const overpassProvider: PlacesProvider = {
  async search({ lat, lng, category }) {
    let elements: OverpassElement[];
    try {
      elements = await runQuery(buildQuery(lat, lng));
    } catch {
      return {
        status: 'error',
        message: 'Nearby search is unavailable right now. Check your connection and try again, or use Open in Maps.',
      };
    }

    const places: Place[] = [];
    for (const el of elements) {
      const tags = el.tags ?? {};
      const cat = categoryOf(tags);
      if (!cat) continue;
      if (category !== 'all' && cat !== category) continue;

      const pLat = el.lat ?? el.center?.lat;
      const pLng = el.lon ?? el.center?.lon;
      if (pLat === undefined || pLng === undefined) continue;

      places.push({
        id: `${el.type}-${el.id}`,
        name: tags.name ?? tags['name:en'] ?? 'Name not listed in map data',
        category: cat,
        lat: pLat,
        lng: pLng,
        distanceMeters: distanceMeters(lat, lng, pLat, pLng),
        phone: tags.phone ?? tags['contact:phone'],
        openingHours: tags.opening_hours,
        address: formatAddress(tags),
      });
    }

    places.sort((a, b) => a.distanceMeters - b.distanceMeters);
    return { status: 'ok', places: places.slice(0, 40) };
  },
};

export const placesProvider: PlacesProvider = overpassProvider;
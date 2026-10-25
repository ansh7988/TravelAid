import { useEffect, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button, Card, EmptyState, Field, Notice, PageHeading, Spinner } from '../components/ui';
import { getCurrentPosition, type LocationResult } from '../services/location';
import { geocodePlace } from '../services/geocode';
import { OSM_ATTRIBUTION, placesProvider, SEARCH_RADIUS_METERS, type Place, type PlacesResult } from '../services/places';
import { INDIA_EMERGENCY_NUMBERS } from '../services/emergencyNumbers';
import { mapsDirectionsLink, mapsSearchLink, telLink } from '../services/links';
import type { NearbyCategory } from '../types';

const CATEGORIES: { value: NearbyCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All help' },
  { value: 'hospital', label: 'Hospitals' },
  { value: 'clinic', label: 'Clinics' },
  { value: 'pharmacy', label: 'Pharmacies' },
  { value: 'repair', label: 'Garage & puncture' },
  { value: 'parking', label: 'Parking' },
  { value: 'hotel', label: 'Hotels' },
  { value: 'restaurant', label: 'Restaurants' },
  { value: 'fuel', label: 'Fuel stations' },
  { value: 'police', label: 'Police' },
];

const CATEGORY_LABEL: Record<NearbyCategory, string> = {
  hospital: 'Hospital',
  clinic: 'Clinic',
  pharmacy: 'Pharmacy',
  police: 'Police station',
  fuel: 'Fuel station',
  parking: 'Parking',
  repair: 'Garage / puncture',
  hotel: 'Hotel',
  restaurant: 'Restaurant',
};

/** Words used when opening the same search in Google Maps. */
const MAPS_TERM: Record<NearbyCategory | 'all', string> = {
  all: 'help',
  hospital: 'hospital',
  clinic: 'clinic',
  pharmacy: 'pharmacy',
  police: 'police station',
  fuel: 'petrol pump',
  parking: 'parking',
  repair: 'puncture repair garage',
  hotel: 'hotel',
  restaurant: 'restaurant',
};

const LOCATION_ERROR: Record<Exclude<LocationResult, { ok: true }>['reason'], string> = {
  denied: 'Location access is off. Type a place name above, or allow location in your browser settings.',
  unsupported: 'This browser cannot share location. Type a place name above.',
  insecure: 'Location works only on a secure (https) connection. Type a place name above.',
  unavailable: 'We could not find your location. Type a place name above.',
  timeout: 'Finding your location took too long. Try again, or type a place name above.',
};

interface Origin {
  lat: number;
  lng: number;
  label: string;
}

function formatDistance(meters: number): string {
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
}

/** OSM phone fields can hold several numbers ("+91 1234; +91 5678"). Use the first one. */
function firstPhone(phone: string): string {
  const first = phone.split(/[;,/]/)[0] ?? '';
  return first.replace(/[^\d+]/g, '');
}

export default function NearbyPage() {
  const [params, setParams] = useSearchParams();
  const requested = params.get('category');
  const category: NearbyCategory | 'all' =
    requested && Object.prototype.hasOwnProperty.call(CATEGORY_LABEL, requested)
      ? (requested as NearbyCategory)
      : 'all';

  const [placeText, setPlaceText] = useState('');
  const [origin, setOrigin] = useState<Origin | null>(null);
  const [busy, setBusy] = useState<'location' | 'place' | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);
  const [result, setResult] = useState<PlacesResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // Runs when the origin, category or a retry changes.
  useEffect(() => {
    if (!origin) return;
    let cancelled = false;
    setSearching(true);
    setResult(null);
    placesProvider
      .search({ lat: origin.lat, lng: origin.lng, category })
      .then((res) => {
        if (!cancelled) setResult(res);
      })
      .catch(() => {
        if (!cancelled) setResult({ status: 'error', message: 'Something went wrong while searching.' });
      })
      .finally(() => {
        if (!cancelled) setSearching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [origin, category, attempt]);

  async function useMyLocation() {
    setBusy('location');
    setInputError(null);
    const res = await getCurrentPosition();
    setBusy(null);
    if (res.ok) setOrigin({ lat: res.lat, lng: res.lng, label: 'your location' });
    else setInputError(LOCATION_ERROR[res.reason]);
  }

  async function searchPlace(e: FormEvent) {
    e.preventDefault();
    setBusy('place');
    setInputError(null);
    const res = await geocodePlace(placeText);
    setBusy(null);
    if (res.ok) setOrigin({ lat: res.lat, lng: res.lng, label: res.label.split(',')[0] });
    else setInputError(res.message);
  }

  function chooseCategory(value: NearbyCategory | 'all') {
    setParams(value === 'all' ? {} : { category: value });
  }

  const activeLabel = CATEGORIES.find((c) => c.value === category)?.label ?? 'All help';

  return (
    <>
      <PageHeading title="Nearby Help" description="Hospitals, pharmacies, garages, parking, hotels and restaurants around you." />

      <Card>
        <form onSubmit={searchPlace} noValidate>
          <Field id="place" label="Search a place or area" error={inputError ?? undefined}>
            {(p) => (
              <input
                {...p}
                type="search"
                value={placeText}
                onChange={(e) => setPlaceText(e.target.value)}
                placeholder="e.g. Ludhiana railway station"
              />
            )}
          </Field>
          <div className="row-actions">
            <Button type="submit" disabled={busy !== null}>
              {busy === 'place' ? <Spinner label="Searching place" /> : 'Search this place'}
            </Button>
            <Button type="button" variant="secondary" onClick={useMyLocation} disabled={busy !== null}>
              {busy === 'location' ? <Spinner label="Finding your location" /> : 'Use my location'}
            </Button>
          </div>
        </form>

        <fieldset className="chip-group nearby-chips">
          <legend className="sr-only">Category</legend>
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              className={`chip ${category === c.value ? 'chip--on' : ''}`}
              aria-pressed={category === c.value}
              onClick={() => chooseCategory(c.value)}
            >
              {c.label}
            </button>
          ))}
        </fieldset>
      </Card>

      <Card>
        <h2>Emergency numbers (India)</h2>
        <ul className="list">
          {INDIA_EMERGENCY_NUMBERS.map((n) => (
            <li key={n.number} className="list-item">
              <div>
                <strong>{n.label}</strong>
                {n.note && <div className="muted small">{n.note}</div>}
              </div>
              <a className="btn btn--secondary" href={telLink(n.number)}>
                Call {n.number}
              </a>
            </li>
          ))}
        </ul>
      </Card>

      {!origin && (
        <EmptyState title="Choose where to search">
          Type a place above and press Search, or use your location. Results show help within about {SEARCH_RADIUS_METERS / 1000} km.
        </EmptyState>
      )}

      {origin && (
        <section aria-labelledby="results-h">
          <div className="section-head">
            <h2 id="results-h">
              {activeLabel} near {origin.label}
            </h2>
            <a
              className="section-link"
              href={mapsSearchLink(`${MAPS_TERM[category]} near ${origin.lat},${origin.lng}`)}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open in Maps
            </a>
          </div>

          {searching && <Spinner label="Searching nearby" />}

          {result?.status === 'error' && (
            <Notice tone="error" title="Could not load results">
              <p>{result.message}</p>
              <div className="row-actions">
                <Button variant="secondary" className="btn--sm" onClick={() => setAttempt((n) => n + 1)}>
                  Try again
                </Button>
              </div>
            </Notice>
          )}

          {result?.status === 'ok' && result.places.length === 0 && (
            <EmptyState title="No results nearby">
              Nothing matched within about {SEARCH_RADIUS_METERS / 1000} km. Try another category, or open Maps for a wider search.
            </EmptyState>
          )}

          {result?.status === 'ok' && result.places.length > 0 && (
            <ul className="place-list">
              {result.places.map((p: Place) => (
                <li key={p.id} className="place-item">
                  <div className="place-item__main">
                    <div className="place-item__title">
                      <strong>{p.name}</strong>
                      <span className="badge">{CATEGORY_LABEL[p.category]}</span>
                    </div>
                    <div className="muted small">
                      {formatDistance(p.distanceMeters)} away
                      {p.address ? ` · ${p.address}` : ''}
                    </div>
                    {p.openingHours && <div className="muted small">Hours: {p.openingHours}</div>}
                  </div>
                  <div className="place-item__actions">
                    {p.phone && (
                      <a className="btn btn--secondary btn--sm" href={telLink(firstPhone(p.phone))}>
                        Call
                      </a>
                    )}
                    <a
                      className="btn btn--primary btn--sm"
                      href={mapsDirectionsLink(`${p.lat},${p.lng}`, `${origin.lat},${origin.lng}`)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Directions
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <p className="attribution small muted">
        Map data{' '}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">
          {OSM_ATTRIBUTION}
        </a>
      </p>
    </>
  );
}
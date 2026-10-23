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
  { value: 'police', label: 'Police' },
  { value: 'fuel', label: 'Fuel stations' },
];

const CATEGORY_LABEL: Record<NearbyCategory, string> = {
  hospital: 'Hospital',
  clinic: 'Clinic',
  pharmacy: 'Pharmacy',
  police: 'Police station',
  fuel: 'Fuel station',
};

const LOCATION_ERROR: Record<Exclude<LocationResult, { ok: true }>['reason'], string> = {
  denied: 'Location permission was denied. Type a place name above instead.',
  unsupported: 'This browser cannot share location. Type a place name above instead.',
  insecure: 'Location needs a secure connection (HTTPS). Type a place name above instead.',
  unavailable: 'Your location could not be determined. Type a place name above instead.',
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

function phoneDigits(phone: string): string {
  return phone.replace(/[^\d+]/g, '');
}

export default function NearbyPage() {
  const [params, setParams] = useSearchParams();
  const category = (params.get('category') as NearbyCategory | 'all') || 'all';

  const [placeText, setPlaceText] = useState('');
  const [origin, setOrigin] = useState<Origin | null>(null);
  const [busy, setBusy] = useState<'location' | 'place' | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);
  const [result, setResult] = useState<PlacesResult | null>(null);
  const [searching, setSearching] = useState(false);

  // Runs whenever the origin or the category changes, so chips and new searches both refresh results.
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
      .finally(() => {
        if (!cancelled) setSearching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [origin, category]);

  async function useMyLocation() {
    setBusy('location');
    setInputError(null);
    const res = await getCurrentPosition();
    setBusy(null);
    if (res.ok) setOrigin({ lat: res.lat, lng: res.lng, label: 'your current location' });
    else setInputError(LOCATION_ERROR[res.reason]);
  }

  async function searchPlace(e: FormEvent) {
    e.preventDefault();
    setBusy('place');
    setInputError(null);
    const res = await geocodePlace(placeText);
    setBusy(null);
    if (res.ok) setOrigin({ lat: res.lat, lng: res.lng, label: res.label });
    else setInputError(res.message);
  }

  function chooseCategory(value: NearbyCategory | 'all') {
    setParams(value === 'all' ? {} : { category: value });
  }

  const activeLabel = CATEGORIES.find((c) => c.value === category)?.label ?? 'All help';

  return (
    <>
      <PageHeading title="Nearby Help" description="Find hospitals, clinics, pharmacies, police and fuel stations around you." />

      <Card>
        <form onSubmit={searchPlace} noValidate>
          <Field id="place" label="Search a place or area" error={inputError ?? undefined} hint="For example a city, area or landmark.">
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

        <fieldset className="chip-group" style={{ marginTop: 'var(--space-4)' }}>
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
        <p className="small muted">Your location is used only for this search and is not stored.</p>
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
              <a className="btn btn--secondary" href={telLink(n.number)}>Call {n.number}</a>
            </li>
          ))}
        </ul>
      </Card>

      {!origin && (
        <EmptyState title="Choose where to search">
          Type a place above and press Search, or use your location. Results show the nearest help within about {SEARCH_RADIUS_METERS / 1000} km.
        </EmptyState>
      )}

      {origin && (
        <section aria-labelledby="results-h">
          <div className="section-head">
            <h2 id="results-h">{activeLabel} near {origin.label}</h2>
            <a className="small" href={mapsSearchLink(`${category === 'all' ? 'hospital' : category} near ${origin.lat},${origin.lng}`)} target="_blank" rel="noopener noreferrer">
              Open in Maps
            </a>
          </div>

          {searching && <Spinner label="Searching nearby" />}

          {result?.status === 'error' && <Notice tone="error" title="Search failed">{result.message}</Notice>}

          {result?.status === 'ok' && result.places.length === 0 && (
            <EmptyState title="Nothing found nearby">
              No matching places within about {SEARCH_RADIUS_METERS / 1000} km in the map data. Try another category, or open Maps to search a wider area.
            </EmptyState>
          )}

          {result?.status === 'ok' && result.places.length > 0 && (
            <ul className="list">
              {result.places.map((p: Place) => (
                <li key={p.id} className="list-item">
                  <div>
                    <strong>{p.name}</strong>{' '}
                    <span className="badge">{CATEGORY_LABEL[p.category]}</span>
                    <div className="muted small">{formatDistance(p.distanceMeters)} away{p.address ? ` · ${p.address}` : ''}</div>
                    {p.phone && <div className="small"><a href={`tel:${phoneDigits(p.phone)}`}>{p.phone}</a></div>}
                    {p.openingHours && <div className="small muted">Hours as recorded: {p.openingHours}</div>}
                  </div>
                  <a
                    className="btn btn--ghost"
                    href={mapsDirectionsLink(`${p.lat},${p.lng}`, `${origin.lat},${origin.lng}`)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Directions
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <Notice tone="info">
        Listings come from public map data, which may be incomplete or out of date. Hours and availability are not guaranteed, so confirm before you go. For emergencies, call 112.
      </Notice>
      <p className="small muted attribution">Map data {OSM_ATTRIBUTION}</p>
    </>
  );
}
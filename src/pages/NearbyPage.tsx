import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button, Card, EmptyState, Field, Notice, PageHeading, Spinner } from '../components/ui';
import { NearbyMap, type MapOrigin } from '../components/NearbyMap';
import { getCurrentPosition, type LocationResult } from '../services/location';
import { geocodePlace } from '../services/geocode';
import { OSM_ATTRIBUTION, placesProvider, SEARCH_RADIUS_METERS, type Place, type PlacesResult } from '../services/places';
import { INDIA_EMERGENCY_NUMBERS } from '../services/emergencyNumbers';
import { mapsDirectionsLink, mapsSearchLink, telLink } from '../services/links';
import type { NearbyCategory } from '../types';
import '../styles/nearby.css';

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
  denied: 'Location access is off. Allow location in your browser settings, or type a place name.',
  unsupported: 'This browser cannot share location. Type a place name instead.',
  insecure: 'Location works only on a secure (https) connection. Type a place name instead.',
  unavailable: 'Your location could not be found. Type a place name instead.',
  timeout: 'Finding your location took too long. Try again, or type a place name.',
};

/** "All help" shows the nearest results, with a cap per category so one type cannot fill the list. */
const ALL_VIEW_LIMIT = 60;
const ALL_VIEW_PER_CATEGORY = 12;

const EMPTY_PLACES: Place[] = [];

function isNearbyCategory(value: string | null): value is NearbyCategory {
  return value !== null && Object.prototype.hasOwnProperty.call(CATEGORY_LABEL, value);
}

function formatDistance(meters: number): string {
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
}

function shortName(label: string): string {
  return label.split(',')[0].trim();
}

function limitForAll(places: Place[]): Place[] {
  const perCategory = new Map<NearbyCategory, number>();
  const out: Place[] = [];
  for (const p of places) {
    if (out.length >= ALL_VIEW_LIMIT) break;
    const used = perCategory.get(p.category) ?? 0;
    if (used >= ALL_VIEW_PER_CATEGORY) continue;
    perCategory.set(p.category, used + 1);
    out.push(p);
  }
  return out;
}

export default function NearbyPage() {
  const [params, setParams] = useSearchParams();
  const requested = params.get('category');
  const category: NearbyCategory | 'all' = isNearbyCategory(requested) ? requested : 'all';

  const [placeText, setPlaceText] = useState('');
  const [placeError, setPlaceError] = useState<string | null>(null);
  const [searchingPlace, setSearchingPlace] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const [origin, setOrigin] = useState<MapOrigin | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<PlacesResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const scrollListOnSelect = useRef(false);

  // One request per origin (and per retry). Category changes never refetch.
  useEffect(() => {
    if (!origin) return;
    let active = true;
    setLoading(true);
    setResult(null);
    setSelectedId(null);
    placesProvider
      .search({ lat: origin.lat, lng: origin.lng })
      .then((r) => {
        if (active) setResult(r);
      })
      .catch(() => {
        if (active) setResult({ status: 'error', kind: 'network', message: 'Something went wrong while searching. Try again.' });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    // Ignore responses from a search the user has already replaced.
    return () => {
      active = false;
    };
  }, [origin, attempt]);

  // Scroll the list to a place selected on the map (not when selected from the list itself).
  useEffect(() => {
    if (!selectedId || !scrollListOnSelect.current) return;
    scrollListOnSelect.current = false;
    document.getElementById(`place-${selectedId}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedId]);

  const allPlaces = useMemo(() => (result?.status === 'ok' ? result.places : EMPTY_PLACES), [result]);

  const visible = useMemo(
    () => (category === 'all' ? limitForAll(allPlaces) : allPlaces.filter((p) => p.category === category)),
    [allPlaces, category],
  );

  const activeLabel = CATEGORIES.find((c) => c.value === category)?.label ?? 'All help';

  function select(id: string, from: 'list' | 'map') {
    scrollListOnSelect.current = from === 'map';
    setSelectedId(id);
  }

  function chooseCategory(value: NearbyCategory | 'all') {
    setParams(value === 'all' ? {} : { category: value });
  }

  async function onSearch(e: FormEvent) {
    e.preventDefault();
    if (searchingPlace) return;
    const query = placeText.trim();
    if (!query) {
      setPlaceError('Type a place name, for example a city, station or landmark.');
      return;
    }
    setPlaceError(null);
    setLocationError(null);
    setSearchingPlace(true);
    const res = await geocodePlace(query);
    setSearchingPlace(false);
    if (res.ok) setOrigin({ lat: res.lat, lng: res.lng, label: shortName(res.label) });
    else setPlaceError(res.message);
  }

  async function onUseLocation() {
    if (locating) return;
    setLocating(true);
    setLocationError(null);
    setPlaceError(null);
    // Called from a click, so the browser shows its own permission prompt here.
    const res = await getCurrentPosition();
    setLocating(false);
    if (res.ok) setOrigin({ lat: res.lat, lng: res.lng, label: 'your location' });
    else setLocationError(LOCATION_ERROR[res.reason]);
  }

  function renderResults() {
    if (!origin) {
      return (
        <EmptyState title="Choose where to search">
          Search a place above, or use your location, to see help within {SEARCH_RADIUS_METERS / 1000} km.
        </EmptyState>
      );
    }

    if (loading) {
      return (
        <div className="results-loading">
          <Spinner label="Searching nearby" />
          <span>Searching nearby…</span>
        </div>
      );
    }

    if (!result) return null;

    if (result.status === 'error') {
      return (
        <Notice tone="error" title="Could not load nearby places">
          <p>{result.message}</p>
          <div className="row-actions">
            <Button variant="secondary" className="btn--sm" onClick={() => setAttempt((n) => n + 1)}>
              Try again
            </Button>
          </div>
        </Notice>
      );
    }

    if (allPlaces.length === 0) {
      return (
        <EmptyState title="Nothing listed nearby">
          The map data has no matching places within {SEARCH_RADIUS_METERS / 1000} km of {origin.label}. Try another place, or open Maps for a wider search.
        </EmptyState>
      );
    }

    if (visible.length === 0) {
      return (
        <EmptyState
          title={`No ${activeLabel.toLowerCase()} listed nearby`}
          action={
            <Button variant="secondary" className="btn--sm" onClick={() => chooseCategory('all')}>
              Show all help
            </Button>
          }
        >
          The map data has none within {SEARCH_RADIUS_METERS / 1000} km of {origin.label}.
        </EmptyState>
      );
    }

    return (
      <>
        <p className="small muted nearby-count">
          {category === 'all' && visible.length < allPlaces.length
            ? `Showing the nearest ${visible.length} of ${allPlaces.length}. Choose a category to see more.`
            : `${visible.length} ${visible.length === 1 ? 'place' : 'places'} found.`}
          {result.status === 'ok' && result.truncated && ' This area is dense, so some places may be missing. Choose a category to check further.'}
        </p>
        <ul className="place-list">
          {visible.map((p) => {
            const isSelected = p.id === selectedId;
            return (
              <li
                key={p.id}
                id={`place-${p.id}`}
                className={`place-item ${isSelected ? 'place-item--selected' : ''}`}
              >
                <button
                  type="button"
                  className="place-item__select"
                  aria-pressed={isSelected}
                  onClick={() => select(p.id, 'list')}
                >
                  <span className="place-item__title">
                    <strong>{p.name ?? 'Name not listed'}</strong>
                    <span className="badge">{CATEGORY_LABEL[p.category]}</span>
                  </span>
                  <span className="muted small">
                    {formatDistance(p.distanceMeters)} away
                    {p.address ? ` · ${p.address}` : ''}
                  </span>
                  {p.openingHours && <span className="muted small">Hours: {p.openingHours}</span>}
                </button>
                <div className="place-item__actions">
                  {p.phone && (
                    <a className="btn btn--secondary btn--sm" href={telLink(p.phone)}>
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
            );
          })}
        </ul>
      </>
    );
  }

  return (
    <>
      <PageHeading
        title="Nearby Help"
        description={`Hospitals, pharmacies, garages, parking, hotels, restaurants and fuel stations within ${SEARCH_RADIUS_METERS / 1000} km.`}
      />

      <Card>
        <form onSubmit={onSearch} noValidate>
          <Field id="place" label="Search a place or area" error={placeError ?? undefined}>
            {(p) => (
              <input
                {...p}
                type="search"
                autoComplete="off"
                value={placeText}
                onChange={(e) => setPlaceText(e.target.value)}
                placeholder="e.g. Ludhiana railway station"
              />
            )}
          </Field>
          <div className="row-actions">
            <Button type="submit" disabled={searchingPlace}>
              {searchingPlace ? <Spinner label="Searching place" /> : 'Search place'}
            </Button>
            <Button type="button" variant="secondary" onClick={onUseLocation} disabled={locating}>
              {locating ? <Spinner label="Finding your location" /> : 'Use my location'}
            </Button>
          </div>
        </form>
        {locationError && <Notice tone="warning">{locationError}</Notice>}

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

      <div className="nearby-results">
        <div className="nearby-results__map">
          <NearbyMap
            origin={origin}
            places={visible}
            selectedId={selectedId}
            onSelect={(id) => select(id, 'map')}
          />
        </div>

        <section className="nearby-results__list" aria-labelledby="results-h">
          <div className="section-head">
            <h2 id="results-h">{origin ? `${activeLabel} near ${origin.label}` : activeLabel}</h2>
            {origin && (
              <a
                className="section-link"
                href={mapsSearchLink(`${MAPS_TERM[category]} near ${origin.lat},${origin.lng}`)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open in Maps
              </a>
            )}
          </div>
          {renderResults()}
        </section>
      </div>

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

      <p className="attribution small muted">
        Map data{' '}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">
          {OSM_ATTRIBUTION}
        </a>
      </p>
    </>
  );
}
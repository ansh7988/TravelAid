import { useEffect, useRef } from 'react';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Place } from '../services/places';

export interface MapOrigin {
  lat: number;
  lng: number;
  label: string;
}

interface NearbyMapProps {
  origin: MapOrigin | null;
  places: Place[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors';
const INDIA_CENTRE: L.LatLngTuple = [22.5, 79.0];

const ORIGIN_ICON = L.divIcon({
  className: 'nb-marker-wrap',
  html: '<span class="nb-origin"></span>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function markerIcon(category: Place['category'], selected: boolean): L.DivIcon {
  const size = selected ? 30 : 22;
  return L.divIcon({
    className: 'nb-marker-wrap',
    html: `<span class="nb-marker nb-marker--${category}${selected ? ' nb-marker--selected' : ''}"></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export function NearbyMap({ origin, places, selectedId, onSelect }: NearbyMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const onSelectRef = useRef(onSelect);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  // Create the map once and tear it down on unmount.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const map = L.map(container, { scrollWheelZoom: false, maxZoom: 18 });
    L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 19 }).addTo(map);
    map.setView(INDIA_CENTRE, 5);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    // Keep the map sized correctly when the layout changes (rotation, sidebar, tablet widths).
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => map.invalidateSize()) : null;
    observer?.observe(container);

    return () => {
      observer?.disconnect();
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  // Redraw markers whenever the origin, visible places or selection changes.
  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    layer.clearLayers();

    if (origin) {
      L.marker([origin.lat, origin.lng], { icon: ORIGIN_ICON, interactive: false, keyboard: false }).addTo(layer);
    }
    for (const p of places) {
      const selected = p.id === selectedId;
      const marker = L.marker([p.lat, p.lng], {
        icon: markerIcon(p.category, selected),
        title: p.name ?? undefined,
        zIndexOffset: selected ? 1000 : 0,
      });
      marker.on('click', () => onSelectRef.current(p.id));
      marker.addTo(layer);
    }
  }, [origin, places, selectedId]);

  // Fit the view to the origin and visible places when the search or filter changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !origin) return;
    const points: L.LatLngTuple[] = [[origin.lat, origin.lng], ...places.map((p): L.LatLngTuple => [p.lat, p.lng])];
    if (points.length === 1) {
      map.setView(points[0], 15);
    } else {
      map.fitBounds(L.latLngBounds(points), { padding: [36, 36], maxZoom: 16 });
    }
  }, [origin, places]);

  // Pan to a selected place without changing the zoom.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedId) return;
    const place = places.find((p) => p.id === selectedId);
    if (place) map.panTo([place.lat, place.lng]);
  }, [selectedId]);

  return <div ref={containerRef} className="nearby-map" role="region" aria-label="Map of nearby places" />;
}
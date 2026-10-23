/**
 * Browser geolocation wrapper. Must only be called from a user gesture.
 * Requires a secure context (HTTPS or localhost).
 */
export type LocationResult =
  | { ok: true; lat: number; lng: number; accuracy: number; timestamp: number }
  | { ok: false; reason: 'unsupported' | 'denied' | 'unavailable' | 'timeout' | 'insecure' };

export function getCurrentPosition(): Promise<LocationResult> {
  if (!window.isSecureContext) return Promise.resolve({ ok: false, reason: 'insecure' });
  if (!('geolocation' in navigator)) return Promise.resolve({ ok: false, reason: 'unsupported' });

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          ok: true,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp,
        }),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) resolve({ ok: false, reason: 'denied' });
        else if (err.code === err.TIMEOUT) resolve({ ok: false, reason: 'timeout' });
        else resolve({ ok: false, reason: 'unavailable' });
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  });
}

export function formatCoords(lat: number, lng: number): string {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

export function mapsPinLink(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`;
}
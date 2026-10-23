/**
 * Local prototype storage.
 *
 * Holds trusted contacts, trips, profile (non-secret, non-medical by default) and settings
 * in this browser's localStorage. Nothing here is sent to a server.
 *
 * Limitations: data is per-browser and per-origin, can be cleared by the user or browser,
 * is not encrypted, and is not shared between devices. Passwords, tokens and medical
 * details are NEVER stored here.
 *
 * Production: replace with a service implementing the same interfaces backed by Supabase
 * (authenticated, row-level security per user).
 */
import type { Settings, Trip, TrustedContact, UserProfile } from '../types';

const KEYS = {
  contacts: 'travelaid.contacts.v1',
  trips: 'travelaid.trips.v1',
  profile: 'travelaid.profile.v1',
  settings: 'travelaid.settings.v1',
} as const;

export const DEFAULT_SETTINGS: Settings = {
  shareLocationWithContacts: false,
  notificationsEnabled: false,
};

function read<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    // Corrupt or blocked storage: fall back rather than crash the app.
    return fallback;
  }
}

function write<T>(key: string, value: T): { ok: true } | { ok: false; error: string } {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return { ok: true };
  } catch {
    return { ok: false, error: 'Could not save on this device. Storage may be full or disabled.' };
  }
}

export const contactStore = {
  list: (): TrustedContact[] => read<TrustedContact[]>(KEYS.contacts, []),
  save: (contacts: TrustedContact[]) => write(KEYS.contacts, contacts),
};

export const tripStore = {
  list: (): Trip[] => read<Trip[]>(KEYS.trips, []),
  save: (trips: Trip[]) => write(KEYS.trips, trips),
};

export const profileStore = {
  get: (): UserProfile => read<UserProfile>(KEYS.profile, { fullName: '', phone: '', medicalConsent: false }),
  save: (profile: UserProfile) => write(KEYS.profile, profile),
};

export const settingsStore = {
  get: (): Settings => ({ ...DEFAULT_SETTINGS, ...read<Partial<Settings>>(KEYS.settings, {}) }),
  save: (settings: Settings) => write(KEYS.settings, settings),
};

export function clearAllLocalData(): void {
  Object.values(KEYS).forEach((k) => window.localStorage.removeItem(k));
}

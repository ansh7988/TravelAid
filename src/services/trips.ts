import type { Trip, TripStatus } from '../types';

export interface TripInput {
  origin: string;
  destination: string;
  departureAt: string; // datetime-local value
  expectedArrivalAt?: string;
  contactIds: string[];
}

export type TripErrors = Partial<Record<keyof TripInput, string>>;

export function validateTrip(input: TripInput): TripErrors {
  const errors: TripErrors = {};
  if (!input.origin.trim()) errors.origin = 'Enter where the trip starts.';
  if (!input.destination.trim()) errors.destination = 'Enter where the trip ends.';
  if (!input.departureAt) errors.departureAt = 'Enter a departure date and time.';
  if (input.expectedArrivalAt && input.departureAt) {
    if (new Date(input.expectedArrivalAt) <= new Date(input.departureAt)) {
      errors.expectedArrivalAt = 'Expected arrival must be after departure.';
    }
  }
  return errors;
}

export function createTrip(input: TripInput): Trip {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    origin: input.origin.trim(),
    destination: input.destination.trim(),
    departureAt: new Date(input.departureAt).toISOString(),
    expectedArrivalAt: input.expectedArrivalAt ? new Date(input.expectedArrivalAt).toISOString() : undefined,
    contactIds: input.contactIds,
    status: 'planned',
    createdAt: now,
    updatedAt: now,
  };
}

/** Status transitions. Starting/checking in/completing record real user actions only. */
export const TRANSITIONS: Record<TripStatus, TripStatus[]> = {
  planned: ['in_progress', 'cancelled'],
  in_progress: ['completed'],
  completed: [],
  cancelled: [],
};

export function transition(trip: Trip, to: TripStatus): Trip {
  if (!TRANSITIONS[trip.status].includes(to)) return trip;
  const now = new Date().toISOString();
  const patch: Partial<Trip> = { status: to, updatedAt: now };
  if (to === 'in_progress') patch.startedAt = now;
  if (to === 'completed') patch.completedAt = now;
  return { ...trip, ...patch };
}

export function checkIn(trip: Trip): Trip {
  if (trip.status !== 'in_progress') return trip;
  const now = new Date().toISOString();
  return { ...trip, checkedInAt: now, updatedAt: now };
}

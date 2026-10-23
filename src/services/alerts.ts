/**
 * Alert preparation. Builds the message text and the device links. It never sends anything
 * and never reports delivery. Real sending requires a server-side provider (see README, Integration notes).
 */
import type { EmergencyType, TrustedContact } from '../types';
import { smsLink, whatsappLink, EMERGENCY_NUMBER } from './links';
import { formatCoords, mapsPinLink } from './location';

export const EMERGENCY_TYPE_LABELS: Record<EmergencyType, string> = {
  medical: 'Medical help needed',
  accident: 'Accident',
  theft: 'Theft or robbery',
  lost: 'Lost or unsafe location',
  road: 'Road breakdown or danger',
  other: 'Other emergency',
};

/** A location captured on the device. `ageMs` decides whether it is labelled current or last known. */
export interface CapturedLocation {
  lat: number;
  lng: number;
  timestamp: number;
}

export const CURRENT_LOCATION_MAX_AGE_MS = 60_000;

export interface AlertInput {
  type: EmergencyType;
  userName: string;
  location?: CapturedLocation; // only included when the user consented and it was really obtained
  note?: string;
  now?: number;
}

export function describeLocation(loc: CapturedLocation, now = Date.now()): string {
  const age = now - loc.timestamp;
  const freshness = age <= CURRENT_LOCATION_MAX_AGE_MS ? 'current' : 'last known';
  const time = new Date(loc.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  return `${formatCoords(loc.lat, loc.lng)} (${freshness}, taken at ${time}) ${mapsPinLink(loc.lat, loc.lng)}`;
}

export function buildAlertMessage(input: AlertInput): string {
  const now = input.now ?? Date.now();
  const stamp = new Date(now).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  const lines = [
    `TravelAid alert from ${input.userName || 'a traveller'}.`,
    `Situation: ${EMERGENCY_TYPE_LABELS[input.type]}.`,
    `Sent from TravelAid at ${stamp}.`,
  ];
  if (input.location) lines.push(`Location: ${describeLocation(input.location, now)}`);
  else lines.push('Location: not included.');
  if (input.note?.trim()) lines.push(`Note: ${input.note.trim()}`);
  lines.push(`If this is life-threatening, call ${EMERGENCY_NUMBER} now.`);
  return lines.join('\n');
}

export function contactLinks(contact: TrustedContact, message: string) {
  return {
    whatsapp: whatsappLink(contact.phone, message),
    sms: smsLink(contact.phone, message),
    call: `tel:${contact.phone.replace(/[^\d+]/g, '')}`,
  };
}
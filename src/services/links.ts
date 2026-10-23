/**
 * Device-supported links. None of these send anything automatically; they only open
 * the phone dialler, SMS composer, WhatsApp chat or maps app, where the user reviews and sends.
 */
import { normalisePhone } from '../utils/validation';

export const EMERGENCY_NUMBER = '112';

export function telLink(phone: string): string {
  return `tel:${normalisePhone(phone)}`;
}

export function smsLink(phone: string, body: string): string {
  // Many devices expect ?body= ; iOS uses &body=. Use the common form.
  return `sms:${normalisePhone(phone)}?body=${encodeURIComponent(body)}`;
}

export function whatsappLink(phone: string, text: string): string {
  // wa.me expects digits only, with country code, no +.
  const digits = normalisePhone(phone).replace(/\D/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export function mapsDirectionsLink(destination: string, origin?: string): string {
  const base = 'https://www.google.com/maps/dir/?api=1';
  const dest = `&destination=${encodeURIComponent(destination)}`;
  const org = origin ? `&origin=${encodeURIComponent(origin)}` : '';
  return base + dest + org;
}

export function mapsSearchLink(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

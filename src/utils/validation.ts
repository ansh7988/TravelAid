import type { TrustedContact } from '../types';

/** Keep digits and a leading +. Returns normalised string. */
export function normalisePhone(input: string): string {
  const trimmed = input.trim();
  const plus = trimmed.startsWith('+') ? '+' : '';
  return plus + trimmed.replace(/\D/g, '');
}

export function isValidPhone(input: string): boolean {
  const n = normalisePhone(input);
  const digits = n.replace(/^\+/, '');
  return digits.length >= 8 && digits.length <= 15;
}

export interface ContactInput {
  name: string;
  relationship: string;
  phone: string;
}

export type ContactErrors = Partial<Record<keyof ContactInput | 'duplicate', string>>;

export function validateContact(input: ContactInput, existing: TrustedContact[], editingId?: string): ContactErrors {
  const errors: ContactErrors = {};
  if (!input.name.trim()) errors.name = 'Enter the contact’s name.';
  else if (input.name.trim().length > 60) errors.name = 'Keep the name under 60 characters.';
  if (!input.relationship.trim()) errors.relationship = 'Enter how they are related to you, for example “Mother”.';
  if (!input.phone.trim()) errors.phone = 'Enter a phone number.';
  else if (!isValidPhone(input.phone)) errors.phone = 'Enter 8–15 digits, optionally starting with +country code.';
  else {
    const n = normalisePhone(input.phone);
    const dup = existing.some((c) => c.id !== editingId && normalisePhone(c.phone) === n);
    if (dup) errors.duplicate = 'A contact with this phone number already exists.';
  }
  return errors;
}

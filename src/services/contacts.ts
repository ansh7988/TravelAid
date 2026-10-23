import type { TrustedContact } from '../types';

/**
 * Contact priority rules.
 * - Storage array order is the priority order (index 0 = contacted first).
 * - At most one contact is primary. The alert order puts the primary first, then the rest in order.
 *   The list screen shows storage order with a "Primary" badge, so moving items stays predictable.
 */
export function alertOrder(contacts: TrustedContact[]): TrustedContact[] {
  const primary = contacts.filter((c) => c.isPrimary);
  const rest = contacts.filter((c) => !c.isPrimary);
  return [...primary, ...rest];
}

export function setPrimary(contacts: TrustedContact[], id: string): TrustedContact[] {
  return contacts.map((c) => ({ ...c, isPrimary: c.id === id }));
}

export function moveContact(contacts: TrustedContact[], id: string, direction: -1 | 1): TrustedContact[] {
  const index = contacts.findIndex((c) => c.id === id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= contacts.length) return contacts;
  const next = [...contacts];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/** Removes a contact and keeps exactly-one-primary consistent if the primary was removed. */
export function removeContact(contacts: TrustedContact[], id: string): TrustedContact[] {
  const removed = contacts.find((c) => c.id === id);
  const rest = contacts.filter((c) => c.id !== id);
  if (removed?.isPrimary && rest.length > 0) {
    return rest.map((c, i) => ({ ...c, isPrimary: i === 0 }));
  }
  return rest;
}
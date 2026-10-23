/**
 * Messaging service boundary.
 *
 * Prototype status:
 * - No accounts backend is connected. Nobody can be looked up, connected or messaged.
 * - Family groups are stored on this device only. They have no members yet.
 * - No message is sent anywhere. End-to-end encryption is NOT YET IMPLEMENTED.
 *
 * The real implementation will be a Supabase-backed service (authentication, PostgreSQL with
 * row-level security, Realtime). Pages depend only on this interface, so swapping it in is contained.
 */

export type MessagingFailure = {
  ok: false;
  reason: 'backend_not_connected' | 'invalid' | 'storage';
  message: string;
};

export type MessagingResult<T> = { ok: true; value: T } | MessagingFailure;

export interface FamilyGroup {
  id: string;
  name: string;
  createdAt: string;
}

export interface MessagingService {
  /** Look up another user by their TravelAid user ID. Never by phone number or email. */
  lookupUser(userId: string): Promise<MessagingResult<never>>;
  /** Send a connection request to another user. */
  sendConnectionRequest(userId: string): Promise<MessagingResult<never>>;
  /** Groups stored on this device. */
  listGroups(): FamilyGroup[];
  createGroup(name: string): MessagingResult<FamilyGroup>;
  deleteGroup(id: string): MessagingResult<true>;
}

const GROUPS_KEY = 'travelaid.groups.v1';

const NOT_CONNECTED =
  'Finding and connecting with other TravelAid users needs the accounts backend, which is not connected in this prototype. Nothing was sent to anyone.';

function readGroups(): FamilyGroup[] {
  try {
    const raw = window.localStorage.getItem(GROUPS_KEY);
    return raw ? (JSON.parse(raw) as FamilyGroup[]) : [];
  } catch {
    return [];
  }
}

function writeGroups(groups: FamilyGroup[]): MessagingResult<true> {
  try {
    window.localStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
    return { ok: true, value: true };
  } catch {
    return { ok: false, reason: 'storage', message: 'Could not save on this device. Storage may be full or disabled.' };
  }
}

export const prototypeMessagingService: MessagingService = {
  async lookupUser() {
    return { ok: false, reason: 'backend_not_connected', message: NOT_CONNECTED };
  },

  async sendConnectionRequest() {
    return { ok: false, reason: 'backend_not_connected', message: NOT_CONNECTED };
  },

  listGroups() {
    return readGroups();
  },

  createGroup(name) {
    const clean = name.trim();
    if (clean.length < 2 || clean.length > 40) {
      return { ok: false, reason: 'invalid', message: 'Group name must be 2 to 40 characters.' };
    }
    const group: FamilyGroup = { id: crypto.randomUUID(), name: clean, createdAt: new Date().toISOString() };
    const saved = writeGroups([...readGroups(), group]);
    return saved.ok ? { ok: true, value: group } : saved;
  },

  deleteGroup(id) {
    return writeGroups(readGroups().filter((g) => g.id !== id));
  },
};
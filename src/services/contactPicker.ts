/**
 * Phone contact picker (browser Contact Picker API).
 *
 * - Only available on some mobile browsers (Chrome on Android) in a secure context.
 * - Opens the phone's own contact chooser. The app only receives the contact the user picks.
 * - The app never reads the whole contact list, and it does not ask for contacts permission up front.
 * - Must be called from a user tap.
 */

export interface PickedContact {
  name: string;
  phone: string;
}

export type PickResult = { ok: true; contact: PickedContact } | { ok: false; message: string };

interface ContactsApi {
  select: (properties: string[], options: { multiple: boolean }) => Promise<Array<{ name?: string[]; tel?: string[] }>>;
}

export function isContactPickerSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.isSecureContext &&
    typeof navigator !== 'undefined' &&
    'contacts' in navigator &&
    'ContactsManager' in window
  );
}

export async function pickPhoneContact(): Promise<PickResult> {
  if (!isContactPickerSupported()) {
    return { ok: false, message: 'Phone contacts cannot be opened in this browser. Type the details instead.' };
  }

  try {
    const api = (navigator as unknown as { contacts: ContactsApi }).contacts;
    const picked = await api.select(['name', 'tel'], { multiple: false });
    const first = picked[0];
    const phone = first?.tel?.[0];
    if (!first || !phone) {
      return { ok: false, message: 'That contact has no phone number. Choose another, or type the number.' };
    }
    return { ok: true, contact: { name: first.name?.[0] ?? '', phone } };
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return { ok: false, message: 'Contact selection was cancelled.' };
    }
    return { ok: false, message: 'Could not open your contacts. Please type the details instead.' };
  }
}
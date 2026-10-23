import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, Field, Notice, PageHeading, LinkButton } from '../components/ui';
import { usePersistentState } from '../hooks/usePersistentState';
import { clearAllLocalData, profileStore, settingsStore } from '../services/storage';
import { EMERGENCY_NUMBER } from '../services/links';
import { isValidPhone } from '../utils/validation';
import type { UserProfile } from '../types';

export function ProfilePage() {
  const { value: profile, update, error } = usePersistentState(profileStore);
  const [draft, setDraft] = useState<UserProfile>(profile);
  const [saved, setSaved] = useState(false);
  const [phoneErr, setPhoneErr] = useState<string | undefined>();

  function save() {
    if (draft.phone && !isValidPhone(draft.phone)) {
      setPhoneErr('Enter 8–15 digits, optionally starting with +country code.');
      return;
    }
    setPhoneErr(undefined);
    const clean: UserProfile = draft.medicalConsent
      ? draft
      : { ...draft, bloodGroup: undefined, allergies: undefined }; // no medical data kept without consent
    update(clean);
    setDraft(clean);
    setSaved(true);
  }

  return (
    <>
      <PageHeading title="My Profile" description="Stored only on this device." />
      {error && <Notice tone="error">{error}</Notice>}
      {saved && !error && <Notice tone="success">Profile saved on this device.</Notice>}

      <Card>
        <h2>Personal details</h2>
        <div className="form">
          <Field id="fn" label="Full name">
            {(p) => <input {...p} value={draft.fullName} onChange={(e) => setDraft({ ...draft, fullName: e.target.value })} />}
          </Field>
          <Field id="ph" label="Your phone number" error={phoneErr}>
            {(p) => <input {...p} type="tel" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />}
          </Field>
        </div>
      </Card>

      <Card>
        <h2>Optional emergency medical information</h2>
        <label className="checkbox">
          <input type="checkbox" checked={draft.medicalConsent} onChange={(e) => setDraft({ ...draft, medicalConsent: e.target.checked })} />
          I agree to store this information on this device, and understand it is not encrypted.
        </label>
        {draft.medicalConsent && (
          <div className="form">
            <Field id="bg" label="Blood group (optional)">
              {(p) => <input {...p} value={draft.bloodGroup ?? ''} onChange={(e) => setDraft({ ...draft, bloodGroup: e.target.value })} />}
            </Field>
            <Field id="al" label="Allergies or conditions (optional)">
              {(p) => <textarea {...p} rows={2} value={draft.allergies ?? ''} onChange={(e) => setDraft({ ...draft, allergies: e.target.value })} />}
            </Field>
          </div>
        )}
        <p className="small muted">Leave this unticked if you prefer not to share medical details. You can still use all emergency features.</p>
      </Card>

      <div className="row-actions">
        <Button onClick={save}>Save profile</Button>
      </div>

      <Card>
        <h2>Shortcuts</h2>
        <div className="row-actions">
          <LinkButton to="/family" variant="secondary">Manage trusted contacts</LinkButton>
          <LinkButton to="/settings" variant="secondary">Privacy & permissions</LinkButton>
        </div>
      </Card>
    </>
  );
}

export function SettingsPage() {
  const { value: settings, update, error } = usePersistentState(settingsStore);
  const [confirmClear, setConfirmClear] = useState(false);
  const [cleared, setCleared] = useState(false);

  return (
    <>
      <PageHeading title="Settings" />
      {error && <Notice tone="error">{error}</Notice>}
      <Card>
        <h2>Location sharing</h2>
        <label className="checkbox">
          <input type="checkbox" checked={settings.shareLocationWithContacts} onChange={(e) => update({ ...settings, shareLocationWithContacts: e.target.checked })} />
          Offer my location in alert messages (you still review each message before sending)
        </label>
        <p className="small muted">Location is requested only when you press a location button, and it is never tracked continuously in this version.</p>
      </Card>
      <Card>
        <h2>Notifications</h2>
        <label className="checkbox">
          <input type="checkbox" checked={settings.notificationsEnabled} onChange={(e) => update({ ...settings, notificationsEnabled: e.target.checked })} />
          Save my reminder preference
        </label>
        <p className="small muted">Saved on this device only. Reminders are not generated yet in this version, and nothing is sent when the app is closed.</p>
      </Card>
      <Card>
        <h2>Your data on this device</h2>
        <p className="small">Contacts, trips and profile are kept in this browser's local storage. Clearing site data removes them.</p>
        <Button variant="danger" onClick={() => setConfirmClear(true)}>Delete all local TravelAid data</Button>
        {cleared && <Notice tone="success">Local data was deleted. Reload the page to start fresh.</Notice>}
      </Card>
      {confirmClear && (
        <Card>
          <p><strong>Delete everything saved on this device?</strong> This cannot be undone.</p>
          <div className="row-actions">
            <Button variant="ghost" onClick={() => setConfirmClear(false)}>Cancel</Button>
            <Button variant="danger" onClick={() => { clearAllLocalData(); setConfirmClear(false); setCleared(true); }}>Delete</Button>
          </div>
        </Card>
      )}
    </>
  );
}

export function HelpPage() {
  return (
    <>
      <PageHeading title="About & Help" />
      <Card>
        <h2>About TravelAid</h2>
        <p>TravelAid helps travellers find nearby help, reach emergency services and share trip details with trusted people.</p>
      </Card>
      <Card>
        <h2>Emergency-use disclaimer</h2>
        <Notice tone="warning">
          TravelAid is an aid, not an emergency service. It does not dispatch ambulances or contact emergency services for you. In a life-threatening situation, call <strong>{EMERGENCY_NUMBER}</strong> immediately.
        </Notice>
      </Card>
      <Card>
        <h2>Privacy</h2>
        <p>This version stores your data only on this device. It does not send your information to a server, and nothing is shared with other people unless you choose to message them yourself.</p>
        <p className="small"><Link to="/settings">Manage privacy settings</Link></p>
      </Card>
      <Card>
        <h2>Help and contact</h2>
        <p className="muted">Support contact details are not configured in this prototype. Add your organisation's support details before publishing.</p>
      </Card>
    </>
  );
}

export function NotFoundPage() {
  return (
    <>
      <PageHeading title="Page not found" />
      <p>That page does not exist.</p>
      <LinkButton to="/" variant="primary">Go to Home</LinkButton>
    </>
  );
}

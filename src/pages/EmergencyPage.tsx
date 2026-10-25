import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, EmptyState, Notice, PageHeading } from '../components/ui';
import { EMERGENCY_NUMBER, telLink } from '../services/links';
import { buildAlertMessage, contactLinks, EMERGENCY_TYPE_LABELS, type CapturedLocation } from '../services/alerts';
import { getCurrentPosition } from '../services/location';
import { alertOrder } from '../services/contacts';
import { contactStore, profileStore } from '../services/storage';
import { usePersistentState } from '../hooks/usePersistentState';
import type { EmergencyType } from '../types';

const STEPS = [
  'Move to a safe place if you can.',
  'Call 112 and say where you are and what has happened.',
  'Follow the instructions of the person you speak to.',
  'Alert your trusted contacts below if they should know.',
];

export default function EmergencyPage() {
  const [type, setType] = useState<EmergencyType>('medical');
  const [includeLocation, setIncludeLocation] = useState(false);
  const [location, setLocation] = useState<CapturedLocation | null>(null);
  const [locMsg, setLocMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const { value: contacts } = usePersistentState(contactStore);
  const { value: profile } = usePersistentState(profileStore);

  const message = buildAlertMessage({
    type,
    userName: profile.fullName,
    location: includeLocation && location ? location : undefined,
    note,
  });

  async function captureLocation() {
    setBusy(true);
    setLocMsg('Getting your location…');
    const res = await getCurrentPosition();
    setBusy(false);
    if (res.ok) {
      setLocation({ lat: res.lat, lng: res.lng, timestamp: res.timestamp });
      setIncludeLocation(true);
      setLocMsg(`Location captured (accuracy about ${Math.round(res.accuracy)} m).`);
    } else {
      setLocation(null);
      setIncludeLocation(false);
      setLocMsg('Location is not available. The message will say location is not included.');
    }
  }

  return (
    <>
      <PageHeading title="Emergency Centre" description="Clear steps and fast ways to get help." />

      <Card className="sos-card">
        <h2>Call emergency services</h2>
        <p>Call <strong>{EMERGENCY_NUMBER}</strong> (India emergency number) if anyone is in danger.</p>
        <a className="sos__call sos__call--large" href={telLink(EMERGENCY_NUMBER)}>Call {EMERGENCY_NUMBER}</a>
        <p className="small muted">Opens your phone's dialler.</p>
      </Card>

      <Card>
        <h2>What is happening?</h2>
        <fieldset className="chip-group">
          <legend className="sr-only">Emergency type</legend>
          {(Object.keys(EMERGENCY_TYPE_LABELS) as EmergencyType[]).map((t) => (
            <button key={t} type="button" className={`chip ${type === t ? 'chip--on' : ''}`} aria-pressed={type === t} onClick={() => setType(t)}>
              {EMERGENCY_TYPE_LABELS[t]}
            </button>
          ))}
        </fieldset>
        <ol className="steps">
          {STEPS.map((s) => <li key={s}>{s}</li>)}
        </ol>
      </Card>

      <Card>
        <h2>Location (optional)</h2>
        <div className="row-actions">
          <Button variant="secondary" onClick={captureLocation} disabled={busy}>
            {location ? 'Refresh my location' : 'Get my location'}
          </Button>
          {location && (
            <label className="checkbox">
              <input type="checkbox" checked={includeLocation} onChange={(e) => setIncludeLocation(e.target.checked)} />
              Include location in the message
            </label>
          )}
        </div>
        {locMsg && <p className="small" role="status">{locMsg}</p>}
      </Card>

      <Card>
        <h2>Prepare a trusted-contact alert</h2>
        <label className="field">
          <span>Short note (optional)</span>
          <textarea rows={2} maxLength={280} value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <pre className="message-preview" aria-label="Alert message preview">{message}</pre>

        {contacts.length === 0 ? (
          <EmptyState title="No trusted contacts yet" action={<Link className="btn btn--secondary" to="/family">Add a contact</Link>}>
            Add a contact to prepare alerts for them.
          </EmptyState>
        ) : (
          <ol className="list" aria-label="Contacts in alert order">
            {alertOrder(contacts).map((c) => {
              const links = contactLinks(c, message);
              return (
                <li key={c.id} className="list-item">
                  <div>
                    <strong>{c.name}</strong>{' '}
                    {c.isPrimary && <span className="badge">Primary</span>}
                    <div className="muted small">{c.relationship} · {c.phone}</div>
                  </div>
                  <div className="row-actions">
                    <a className="btn btn--ghost" href={links.whatsapp} target="_blank" rel="noopener noreferrer">WhatsApp</a>
                    <a className="btn btn--ghost" href={links.sms}>SMS</a>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
        <Notice tone="info">
          WhatsApp and SMS open with this message, so you can review it and send it yourself.
        </Notice>
      </Card>
    </>
  );
}
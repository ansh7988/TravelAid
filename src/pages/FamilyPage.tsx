import { useState, type FormEvent } from 'react';
import { Button, Card, Dialog, EmptyState, Field, Notice, PageHeading, Spinner } from '../components/ui';
import { usePersistentState } from '../hooks/usePersistentState';
import { contactStore, profileStore } from '../services/storage';
import { getCurrentPosition, type LocationResult } from '../services/location';
import { isContactPickerSupported, pickPhoneContact } from '../services/contactPicker';
import { buildAlertMessage, contactLinks, EMERGENCY_TYPE_LABELS, type CapturedLocation } from '../services/alerts';
import { alertOrder, moveContact, removeContact, setPrimary } from '../services/contacts';
import { validateContact, normalisePhone, type ContactErrors, type ContactInput } from '../utils/validation';
import type { EmergencyType, TrustedContact } from '../types';

const EMPTY: ContactInput = { name: '', relationship: '', phone: '' };

const LOCATION_ERRORS: Record<Exclude<LocationResult, { ok: true }>['reason'], string> = {
  denied: 'Location permission was denied. The message will say that location is not included.',
  unsupported: 'This browser cannot share location. You can still send the message without it.',
  insecure: 'Location needs HTTPS. You can still send the message without it.',
  unavailable: 'Your location could not be determined. You can still send the message without it.',
  timeout: 'Finding your location took too long. Try again or send without it.',
};

export default function FamilyPage() {
  const { value: contacts, update, error: storeError } = usePersistentState(contactStore);
  const { value: profile } = usePersistentState(profileStore);

  const [form, setForm] = useState<ContactInput>(EMPTY);
  const pickerSupported = isContactPickerSupported();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<ContactErrors>({});
  const [toDelete, setToDelete] = useState<TrustedContact | null>(null);
  const [status, setStatus] = useState<{ tone: 'success' | 'info'; text: string } | null>(null);

  const [emergencyType, setEmergencyType] = useState<EmergencyType>('medical');
  const [note, setNote] = useState('');
  const [location, setLocation] = useState<CapturedLocation | null>(null);
  const [locState, setLocState] = useState<{ busy: boolean; error?: string }>({ busy: false });
  const [includeLocation, setIncludeLocation] = useState(false);

  const message = buildAlertMessage({
    type: emergencyType,
    userName: profile.fullName,
    location: includeLocation && location ? location : undefined,
    note,
  });

  function flash(text: string, tone: 'success' | 'info' = 'success') {
    setStatus({ tone, text });
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const errs = validateContact(form, contacts, editingId ?? undefined);
    setErrors(errs);
    if (Object.keys(errs).length) return;

    const clean = {
      name: form.name.trim(),
      relationship: form.relationship.trim(),
      phone: normalisePhone(form.phone),
    };

    if (editingId) {
      update(contacts.map((c) => (c.id === editingId ? { ...c, ...clean } : c)));
      flash('Contact updated.');
    } else {
      const contact: TrustedContact = {
        id: crypto.randomUUID(),
        ...clean,
        isPrimary: contacts.length === 0, // first contact becomes primary automatically
        createdAt: new Date().toISOString(),
      };
      update([...contacts, contact]);
      flash(contact.isPrimary ? 'Contact added as your primary contact.' : 'Contact added.');
    }
    setForm(EMPTY);
    setEditingId(null);
  }

  function startEdit(c: TrustedContact) {
    setEditingId(c.id);
    setForm({ name: c.name, relationship: c.relationship, phone: c.phone });
    setErrors({});
    setStatus(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY);
    setErrors({});
  }

  async function pickFromPhone() {
    const res = await pickPhoneContact();
    if (res.ok) {
      setForm({
        name: res.contact.name || form.name,
        relationship: form.relationship,
        phone: res.contact.phone,
      });
      setErrors({});
      flash('Contact filled in. Check the details, add a relationship, then press Add.', 'info');
    } else {
      flash(res.message, 'info');
    }
  }

  function confirmDelete() {
    if (!toDelete) return;
    update(removeContact(contacts, toDelete.id));
    flash(`${toDelete.name} removed.`);
    setToDelete(null);
  }

  async function captureLocation() {
    setLocState({ busy: true });
    const res = await getCurrentPosition();
    if (res.ok) {
      setLocation({ lat: res.lat, lng: res.lng, timestamp: res.timestamp });
      setIncludeLocation(true);
      setLocState({ busy: false });
    } else {
      setLocation(null);
      setIncludeLocation(false);
      setLocState({ busy: false, error: LOCATION_ERRORS[res.reason] });
    }
  }

  const ordered = alertOrder(contacts);
  const primary = contacts.find((c) => c.isPrimary);

  return (
    <>
      <PageHeading
        title="Family Safety"
        description="Choose who hears from you first. Messages open in WhatsApp or SMS for you to review and send."
      />

      {storeError && <Notice tone="error" title="Changes not saved">{storeError}</Notice>}
      {status && <Notice tone={status.tone === 'success' ? 'success' : 'info'}>{status.text}</Notice>}

      <div className="split">
        <Card className="split__form">
          <h2>{editingId ? 'Edit contact' : 'Add a trusted contact'}</h2>
          {pickerSupported && !editingId && (
            <div className="row-actions picker-row">
              <Button type="button" variant="secondary" onClick={pickFromPhone}>Pick from phone contacts</Button>
            </div>
          )}
          <form onSubmit={onSubmit} noValidate className="form">
            <Field id="c-name" label="Name" error={errors.name}>
              {(p) => <input {...p} value={form.name} autoComplete="off" onChange={(e) => setForm({ ...form, name: e.target.value })} />}
            </Field>
            <Field id="c-rel" label="Relationship" error={errors.relationship} hint="For example: Mother, Partner, Friend">
              {(p) => <input {...p} value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })} />}
            </Field>
            <Field id="c-phone" label="Phone number" error={errors.phone ?? errors.duplicate} hint="Include the country code, for example +91 98765 43210">
              {(p) => <input {...p} type="tel" inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />}
            </Field>
            <div className="row-actions">
              <Button type="submit">{editingId ? 'Save changes' : 'Add contact'}</Button>
              {editingId && <Button type="button" variant="ghost" onClick={cancelEdit}>Cancel</Button>}
            </div>
          </form>
        </Card>

        <Card className="split__preview">
          <h2>Emergency message preview</h2>
          <Field id="etype" label="What is happening?">
            {(p) => (
              <select {...p} value={emergencyType} onChange={(e) => setEmergencyType(e.target.value as EmergencyType)}>
                {(Object.keys(EMERGENCY_TYPE_LABELS) as EmergencyType[]).map((t) => (
                  <option key={t} value={t}>{EMERGENCY_TYPE_LABELS[t]}</option>
                ))}
              </select>
            )}
          </Field>
          <Field id="note" label="Short note (optional)">
            {(p) => <textarea {...p} rows={2} maxLength={280} value={note} onChange={(e) => setNote(e.target.value)} />}
          </Field>

          <div className="location-box">
            <div className="row-actions">
              <Button variant="secondary" onClick={captureLocation} disabled={locState.busy}>
                {locState.busy ? <Spinner label="Getting location" /> : location ? 'Refresh my location' : 'Get my location'}
              </Button>
              {location && (
                <label className="checkbox">
                  <input type="checkbox" checked={includeLocation} onChange={(e) => setIncludeLocation(e.target.checked)} />
                  Include location
                </label>
              )}
            </div>
            {location && (
              <p className="small muted" role="status">
                Location captured at {new Date(location.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}.
              </p>
            )}
            {locState.error && <p className="small field__error" role="alert">{locState.error}</p>}
          </div>

          <pre className="message-preview" aria-label="Message that will be sent">{message}</pre>
          <p className="small muted">Review the message. Nothing is sent until you press a button below and send it yourself.</p>
        </Card>
      </div>

      <section aria-labelledby="contacts-h">
        <div className="section-head">
          <h2 id="contacts-h">Trusted contacts</h2>
          {primary && <span className="muted small">Primary: {primary.name}</span>}
        </div>

        {contacts.length === 0 ? (
          <EmptyState title="No trusted contacts yet">
            Add at least one person who should hear from you in an emergency. Your first contact becomes primary.
          </EmptyState>
        ) : (
          <ol className="contact-list" aria-label="Contacts in alert order">
            {contacts.map((c, index) => {
              const links = contactLinks(c, message);
              const alertPosition = ordered.findIndex((x) => x.id === c.id) + 1;
              return (
                <li key={c.id} className="contact-item">
                  <div className="contact-item__main">
                    <div className="contact-item__name">
                      <strong>{c.name}</strong>
                      {c.isPrimary && <span className="badge">Primary</span>}
                    </div>
                    <div className="muted small">{c.relationship} · {c.phone}</div>
                    <div className="muted small">Alert order: {alertPosition}</div>
                  </div>

                  <div className="contact-item__actions">
                    <a className="btn btn--ghost btn--sm" href={links.whatsapp} target="_blank" rel="noopener noreferrer">WhatsApp</a>
                    <a className="btn btn--ghost btn--sm" href={links.sms}>SMS</a>
                    <a className="btn btn--ghost btn--sm" href={links.call}>Call</a>
                  </div>

                  <div className="contact-item__manage">
                    {!c.isPrimary && (
                      <Button variant="ghost" className="btn--sm" onClick={() => { update(setPrimary(contacts, c.id)); flash(`${c.name} is now primary.`); }}>
                        Make primary
                      </Button>
                    )}
                    <Button variant="ghost" className="btn--sm" disabled={index === 0} onClick={() => update(moveContact(contacts, c.id, -1))} aria-label={`Move ${c.name} up`}>↑</Button>
                    <Button variant="ghost" className="btn--sm" disabled={index === contacts.length - 1} onClick={() => update(moveContact(contacts, c.id, 1))} aria-label={`Move ${c.name} down`}>↓</Button>
                    <Button variant="ghost" className="btn--sm" onClick={() => startEdit(c)}>Edit<span className="sr-only"> {c.name}</span></Button>
                    <Button variant="ghost" className="btn--sm" onClick={() => setToDelete(c)}>Remove<span className="sr-only"> {c.name}</span></Button>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
        {contacts.length > 1 && (
          <p className="small muted">Alert order is the primary contact first, then the rest in the order shown.</p>
        )}
      </section>

      <Dialog
        open={!!toDelete}
        title="Remove this contact?"
        onClose={() => setToDelete(null)}
        footer={<>
          <Button variant="ghost" onClick={() => setToDelete(null)}>Cancel</Button>
          <Button variant="danger" onClick={confirmDelete}>Remove</Button>
        </>}
      >
        <p>{toDelete?.name} will be removed from this device. This cannot be undone.</p>
      </Dialog>
    </>
  );
}
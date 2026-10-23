import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button, Card, Dialog, EmptyState, Field, Notice, PageHeading, LinkButton } from '../components/ui';
import { usePersistentState } from '../hooks/usePersistentState';
import { contactStore, tripStore } from '../services/storage';
import { checkIn, createTrip, transition, validateTrip, type TripInput, type TripErrors } from '../services/trips';
import { mapsDirectionsLink } from '../services/links';
import type { Trip, TripStatus } from '../types';

const STATUS_LABEL: Record<TripStatus, string> = {
  planned: 'Planned',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—');

export function TripsListPage() {
  const { value: trips, error } = usePersistentState(tripStore);
  const sorted = [...trips].sort((a, b) => b.departureAt.localeCompare(a.departureAt));
  const active = sorted.filter((t) => t.status === 'planned' || t.status === 'in_progress');
  const past = sorted.filter((t) => t.status === 'completed' || t.status === 'cancelled');

  return (
    <>
      <PageHeading title="My Trips" description="Plan journeys and keep the details handy." actions={<LinkButton variant="primary" to="/trips/new">Plan a trip</LinkButton>} />
      {error && <Notice tone="error">{error}</Notice>}
      {trips.length === 0 ? (
        <EmptyState title="No trips yet" action={<LinkButton to="/trips/new" variant="primary">Plan your first trip</LinkButton>}>
          Trip history appears here once you create a trip.
        </EmptyState>
      ) : (
        <>
          <TripList title="Upcoming and in progress" trips={active} empty="No upcoming trips." />
          <TripList title="History" trips={past} empty="No completed or cancelled trips." />
        </>
      )}
    </>
  );
}

function TripList({ title, trips, empty }: { title: string; trips: Trip[]; empty: string }) {
  return (
    <section aria-label={title}>
      <h2>{title}</h2>
      {trips.length === 0 ? <p className="muted">{empty}</p> : (
        <ul className="list">
          {trips.map((t) => (
            <li key={t.id} className="list-item">
              <div>
                <Link to={`/trips/${t.id}`}><strong>{t.origin} → {t.destination}</strong></Link>
                <div className="small muted">Departs {fmt(t.departureAt)} · {STATUS_LABEL[t.status]}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const EMPTY_INPUT: TripInput = { origin: '', destination: '', departureAt: '', expectedArrivalAt: '', contactIds: [] };

export function TripFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { value: trips, update, error: storeError } = usePersistentState(tripStore);
  const { value: contacts } = usePersistentState(contactStore);
  const existing = id ? trips.find((t) => t.id === id) : undefined;
  const [form, setForm] = useState<TripInput>(() =>
    existing
      ? { origin: existing.origin, destination: existing.destination, departureAt: existing.departureAt.slice(0, 16), expectedArrivalAt: existing.expectedArrivalAt?.slice(0, 16) ?? '', contactIds: existing.contactIds }
      : EMPTY_INPUT,
  );
  const [errors, setErrors] = useState<TripErrors>({});

  if (id && !existing) {
    return <EmptyState title="Trip not found">It may have been removed. <Link to="/trips">Back to My Trips</Link></EmptyState>;
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const errs = validateTrip(form);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    if (existing) {
      const updated: Trip = {
        ...existing,
        origin: form.origin.trim(),
        destination: form.destination.trim(),
        departureAt: new Date(form.departureAt).toISOString(),
        expectedArrivalAt: form.expectedArrivalAt ? new Date(form.expectedArrivalAt).toISOString() : undefined,
        contactIds: form.contactIds,
        updatedAt: new Date().toISOString(),
      };
      update(trips.map((t) => (t.id === existing.id ? updated : t)));
      navigate(`/trips/${existing.id}`);
    } else {
      const trip = createTrip(form);
      update([...trips, trip]);
      navigate(`/trips/${trip.id}`);
    }
  }

  return (
    <>
      <PageHeading title={existing ? 'Edit trip' : 'Plan a trip'} />
      {storeError && <Notice tone="error">{storeError}</Notice>}
      <Card>
        <form onSubmit={onSubmit} noValidate className="form">
          <Field id="origin" label="Starting point" error={errors.origin}>
            {(p) => <input {...p} value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })} />}
          </Field>
          <Field id="dest" label="Destination" error={errors.destination}>
            {(p) => <input {...p} value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} />}
          </Field>
          <Field id="dep" label="Departure" error={errors.departureAt}>
            {(p) => <input {...p} type="datetime-local" value={form.departureAt} onChange={(e) => setForm({ ...form, departureAt: e.target.value })} />}
          </Field>
          <Field id="arr" label="Expected arrival (optional)" error={errors.expectedArrivalAt}>
            {(p) => <input {...p} type="datetime-local" value={form.expectedArrivalAt} onChange={(e) => setForm({ ...form, expectedArrivalAt: e.target.value })} />}
          </Field>
          {contacts.length > 0 && (
            <fieldset className="checklist">
              <legend>Trusted contacts for this trip</legend>
              {contacts.map((c) => (
                <label key={c.id} className="checkbox">
                  <input
                    type="checkbox"
                    checked={form.contactIds.includes(c.id)}
                    onChange={(e) => setForm({ ...form, contactIds: e.target.checked ? [...form.contactIds, c.id] : form.contactIds.filter((x) => x !== c.id) })}
                  />
                  {c.name} <span className="muted small">({c.relationship})</span>
                </label>
              ))}
            </fieldset>
          )}
          <div className="row-actions">
            <Button type="submit">{existing ? 'Save trip' : 'Create trip'}</Button>
            <LinkButton to={existing ? `/trips/${existing.id}` : '/trips'} variant="ghost">Cancel</LinkButton>
          </div>
        </form>
      </Card>
    </>
  );
}

export function TripDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { value: trips, update, error } = usePersistentState(tripStore);
  const trip = trips.find((t) => t.id === id);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const { value: contacts } = usePersistentState(contactStore);

  if (!trip) {
    return <EmptyState title="Trip not found">It may have been removed. <Link to="/trips">Back to My Trips</Link></EmptyState>;
  }

  const replace = (next: Trip) => update(trips.map((t) => (t.id === next.id ? next : t)));
  const linkedContacts = contacts.filter((c) => trip.contactIds.includes(c.id));

  return (
    <>
      <PageHeading
        title={`${trip.origin} → ${trip.destination}`}
        description={`Status: ${STATUS_LABEL[trip.status]}`}
        actions={trip.status === 'planned' || trip.status === 'in_progress' ? <LinkButton to={`/trips/${trip.id}/edit`}>Edit</LinkButton> : undefined}
      />
      {error && <Notice tone="error">{error}</Notice>}

      <Card>
        <dl className="details">
          <dt>Departure</dt><dd>{fmt(trip.departureAt)}</dd>
          <dt>Expected arrival</dt><dd>{fmt(trip.expectedArrivalAt)}</dd>
          <dt>Started</dt><dd>{fmt(trip.startedAt)}</dd>
          <dt>Last check-in</dt><dd>{fmt(trip.checkedInAt)}</dd>
          <dt>Completed</dt><dd>{fmt(trip.completedAt)}</dd>
        </dl>
        <a className="btn btn--ghost" href={mapsDirectionsLink(trip.destination, trip.origin)} target="_blank" rel="noopener noreferrer">Directions in Maps</a>
      </Card>

      <Card>
        <h2>Trip actions</h2>
        <p className="small muted">These record your own actions. TravelAid does not track your location during a trip.</p>
        <div className="row-actions">
          {trip.status === 'planned' && <Button onClick={() => replace(transition(trip, 'in_progress'))}>Start trip</Button>}
          {trip.status === 'in_progress' && <Button variant="secondary" onClick={() => replace(checkIn(trip))}>Record check-in</Button>}
          {trip.status === 'in_progress' && <Button onClick={() => replace(transition(trip, 'completed'))}>Complete trip</Button>}
          {trip.status === 'planned' && <Button variant="ghost" onClick={() => setConfirmCancel(true)}>Cancel trip</Button>}
        </div>
      </Card>

      <Card>
        <h2>Trusted contacts for this trip</h2>
        {linkedContacts.length === 0 ? <p className="muted">No contacts linked. <Link to={`/trips/${trip.id}/edit`}>Edit trip</Link> to add some.</p> : (
          <ul>{linkedContacts.map((c) => <li key={c.id}>{c.name} ({c.relationship})</li>)}</ul>
        )}
      </Card>

      <Dialog
        open={confirmCancel}
        title="Cancel this trip?"
        onClose={() => setConfirmCancel(false)}
        footer={<>
          <Button variant="ghost" onClick={() => setConfirmCancel(false)}>Keep trip</Button>
          <Button variant="danger" onClick={() => { replace(transition(trip, 'cancelled')); setConfirmCancel(false); navigate('/trips'); }}>Cancel trip</Button>
        </>}
      >
        <p>The trip will move to your history as cancelled.</p>
      </Dialog>
    </>
  );
}

import { Link } from 'react-router-dom';
import { EmptyState, LinkButton } from '../components/ui';
import { SOSButton } from '../components/SOSButton';
import { Icon, type IconName } from '../components/Icons';
import { usePersistentState } from '../hooks/usePersistentState';
import { contactStore, profileStore, tripStore } from '../services/storage';
import { EMERGENCY_NUMBER } from '../services/links';

interface QuickItem {
  to: string;
  title: string;
  text: string;
  icon: IconName;
  tone: 'green' | 'gold' | 'sage';
}

const QUICK: QuickItem[] = [
  { to: '/nearby', title: 'Nearby help', text: 'Find help around you', icon: 'pin', tone: 'green' },
  { to: '/nearby?category=hospital', title: 'Hospitals', text: 'Hospitals and clinics', icon: 'cross', tone: 'gold' },
  { to: '/nearby?category=pharmacy', title: 'Pharmacies', text: 'Medical stores nearby', icon: 'capsule', tone: 'sage' },
  { to: '/family', title: 'Family safety', text: 'Trusted contacts and alerts', icon: 'shield', tone: 'green' },
  { to: '/trips', title: 'My trips', text: 'Plan and manage journeys', icon: 'route', tone: 'gold' },
];

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

function StatTile({
  icon,
  label,
  value,
  cta,
  to,
}: {
  icon: IconName;
  label: string;
  value: string;
  cta?: string;
  to?: string;
}) {
  return (
    <article className="stat-tile">
      <span className="stat-tile__icon" aria-hidden="true">
        <Icon name={icon} size={18} />
      </span>
      <div className="stat-tile__body">
        <span className="stat-tile__label">{label}</span>
        <span className="stat-tile__value">{value}</span>
      </div>
      {cta && to && (
        <Link className="stat-tile__cta" to={to}>
          {cta}
        </Link>
      )}
    </article>
  );
}

export default function HomePage() {
  const { value: contacts } = usePersistentState(contactStore);
  const { value: trips } = usePersistentState(tripStore);
  const { value: profile } = usePersistentState(profileStore);

  const firstName = profile.fullName.trim().split(/\s+/)[0] ?? '';
  const primary = contacts.find((c) => c.isPrimary);
  const planned = trips
    .filter((t) => t.status === 'planned')
    .sort((a, b) => a.departureAt.localeCompare(b.departureAt));
  const inProgress = trips.find((t) => t.status === 'in_progress');
  const focusTrip = inProgress ?? planned[0];

  return (
    <div className="home">
      <section className="hero" aria-labelledby="hero-h">
        <div className="hero__copy">
          <span className="eyebrow-pill">
            <Icon name="shield" size={14} />
            {firstName ? `Welcome back, ${firstName}` : 'Travel safe, always'}
          </span>
          <h1 id="hero-h" className="hero__title">
            Help on the road<span className="hero__cross" aria-hidden="true" />
            <br />
            <span className="hero__title-light">wherever</span> you are
          </h1>
          <p className="hero__lead">
            Find hospitals, pharmacies and police nearby, reach emergency services in one tap, and keep the people
            you trust informed while you travel.
          </p>
          <div className="hero__actions">
            <LinkButton to="/nearby" variant="primary" className="btn--lg">
              <Icon name="pin" size={18} />
              Find nearby help
            </LinkButton>
            <LinkButton to="/emergency" variant="secondary" className="btn--lg">
              Emergency Centre
            </LinkButton>
          </div>
        </div>

        <div className="hero__panel emergency-panel" aria-labelledby="emergency-h">
          <span className="emergency-panel__icon" aria-hidden="true">
            <Icon name="hands" size={26} />
          </span>
          <div className="emergency-panel__copy">
            <h2 id="emergency-h">Need urgent help?</h2>
            <p>Open the Emergency Centre for clear steps, or call {EMERGENCY_NUMBER} directly.</p>
          </div>
          <SOSButton />
        </div>
      </section>

      <section className="home__stats" aria-label="Your safety summary">
        <StatTile
          icon="users"
          label="Trusted contacts"
          value={String(contacts.length)}
          cta={contacts.length === 0 ? 'Add' : undefined}
          to="/family"
        />
        <StatTile
          icon="shield"
          label="Primary contact"
          value={primary ? primary.name : 'Not chosen'}
          cta={!primary && contacts.length > 0 ? 'Choose' : undefined}
          to="/family"
        />
        <StatTile
          icon="route"
          label="Planned trips"
          value={String(planned.length)}
          cta={planned.length === 0 ? 'Plan' : undefined}
          to="/trips/new"
        />
      </section>

      {contacts.length === 0 && (
        <section className="prompt" aria-label="Next step">
          <div className="prompt__icon" aria-hidden="true">
            <Icon name="plus" size={20} />
          </div>
          <div className="prompt__body">
            <h2>Add your first trusted contact</h2>
            <p>They can receive your emergency message from Family Safety. Nothing is sent until you choose to send it.</p>
          </div>
          <LinkButton to="/family" variant="primary">
            Add contact
          </LinkButton>
        </section>
      )}

      <section className="home__section" aria-labelledby="quick-h">
        <div className="section-head section-head--stacked">
          <span className="eyebrow">Quick access</span>
          <h2 id="quick-h">Everything you need, one tap away</h2>
        </div>
        <ul className="quick-tiles">
          {QUICK.map((q) => (
            <li key={q.title}>
              <Link to={q.to} className="quick-tile">
                <span className={`quick-tile__icon quick-tile__icon--${q.tone}`} aria-hidden="true">
                  <Icon name={q.icon} size={20} />
                </span>
                <span className="quick-tile__title">{q.title}</span>
                <span className="quick-tile__text">{q.text}</span>
                <span className="quick-tile__more" aria-hidden="true">
                  Open <span className="quick-tile__arrow">→</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="home__section" aria-labelledby="trip-h">
        <div className="section-head">
          <div>
            <span className="eyebrow">Your journeys</span>
            <h2 id="trip-h">Trips</h2>
          </div>
          <Link className="section-link" to="/trips">
            All trips
          </Link>
        </div>
        {focusTrip ? (
          <article className="trip-card">
            <div className="trip-card__route">
              <div className="trip-card__stop">
                <span className="trip-card__dot" aria-hidden="true" />
                <span>{focusTrip.origin}</span>
              </div>
              <span className="trip-card__line" aria-hidden="true" />
              <div className="trip-card__stop">
                <span className="trip-card__dot trip-card__dot--end" aria-hidden="true" />
                <span>{focusTrip.destination}</span>
              </div>
            </div>
            <div className="trip-card__meta">
              <span className={`status-pill ${focusTrip.status === 'in_progress' ? 'status-pill--live' : ''}`}>
                {focusTrip.status === 'in_progress' ? 'In progress' : 'Planned'}
              </span>
              <span className="muted small">Departs {formatWhen(focusTrip.departureAt)}</span>
            </div>
            <LinkButton to={`/trips/${focusTrip.id}`} variant="secondary" className="btn--sm">
              Open trip
            </LinkButton>
          </article>
        ) : (
          <EmptyState
            title="No trips planned"
            action={
              <LinkButton to="/trips/new" variant="primary">
                Plan a trip
              </LinkButton>
            }
          >
            Save a journey to keep its details in one place.
          </EmptyState>
        )}
      </section>
    </div>
  );
}
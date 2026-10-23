import { Link } from 'react-router-dom';
import { Card, EmptyState, LinkButton, Notice, PageHeading } from '../components/ui';
import { SOSButton } from '../components/SOSButton';
import { Icon, type IconName } from '../components/Icons';
import { usePersistentState } from '../hooks/usePersistentState';
import { contactStore, profileStore, tripStore } from '../services/storage';
import { EMERGENCY_NUMBER } from '../services/links';

const QUICK: { to: string; title: string; text: string; icon: IconName }[] = [
  { to: '/nearby', title: 'Nearby help', text: 'Find help around you', icon: 'pin' },
  { to: '/nearby?category=hospital', title: 'Hospitals', text: 'Hospitals and clinics', icon: 'cross' },
  { to: '/nearby?category=pharmacy', title: 'Pharmacies', text: 'Medical stores nearby', icon: 'capsule' },
  { to: '/trips', title: 'My trips', text: 'Plan and manage journeys', icon: 'route' },
  { to: '/family', title: 'Family safety', text: 'Trusted contacts and alerts', icon: 'shield' },
];

export default function HomePage() {
  const { value: contacts } = usePersistentState(contactStore);
  const { value: trips } = usePersistentState(tripStore);
  const { value: profile } = usePersistentState(profileStore);

  const firstName = profile.fullName.trim().split(/\s+/)[0];
  const primary = contacts.find((c) => c.isPrimary);
  const plannedTrips = trips.filter((t) => t.status === 'planned');
  const activeTrip = trips.find((t) => t.status === 'in_progress');
  const nextTrip = [...plannedTrips].sort((a, b) => a.departureAt.localeCompare(b.departureAt))[0];

  return (
    <>
      <PageHeading
        title={firstName ? `Hello, ${firstName}` : 'Welcome to TravelAid'}
        description="Get help quickly, and keep the people you trust informed."
      />

      <div className="home-stack">
        <Card className="sos-card home-sos">
          <div>
            <h2>Need urgent help?</h2>
            <p>Open the Emergency Centre for clear steps, or call {EMERGENCY_NUMBER} directly.</p>
          </div>
          <SOSButton />
        </Card>

        <div className="stat-grid" aria-label="Summary">
          <div className="stat">
            <span className="stat__label">Trusted contacts</span>
            <span className="stat__value">{contacts.length}</span>
          </div>
          <div className="stat">
            <span className="stat__label">Primary contact</span>
            <span className="stat__value">{primary ? primary.name : 'Not set'}</span>
          </div>
          <div className="stat">
            <span className="stat__label">Planned trips</span>
            <span className="stat__value">{plannedTrips.length}</span>
          </div>
        </div>

        {contacts.length === 0 && (
          <Notice tone="warning" title="Add a trusted contact">
            Trusted contacts receive your alerts. <Link to="/family">Add one in Family Safety</Link>.
          </Notice>
        )}
      </div>

      <section className="quick-grid" aria-labelledby="quick-h">
        <div className="section-head">
          <h2 id="quick-h">Quick access</h2>
        </div>
        <ul className="quick-list">
          {QUICK.map((q) => (
            <li key={q.title}>
              <Link to={q.to} className="quick-card">
                <span className="quick-card__icon">
                  <Icon name={q.icon} size={20} />
                </span>
                <span className="quick-card__body">
                  <strong>{q.title}</strong>
                  <span>{q.text}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="trip-h">
        <div className="section-head">
          <h2 id="trip-h">Your trips</h2>
          <Link className="small" to="/trips">View all</Link>
        </div>
        {activeTrip ? (
          <Card>
            <p><strong>In progress:</strong> {activeTrip.origin} → {activeTrip.destination}</p>
            <LinkButton to={`/trips/${activeTrip.id}`} variant="secondary" className="btn--sm">View trip</LinkButton>
          </Card>
        ) : nextTrip ? (
          <Card>
            <p><strong>Next planned:</strong> {nextTrip.origin} → {nextTrip.destination}</p>
            <LinkButton to={`/trips/${nextTrip.id}`} variant="secondary" className="btn--sm">View trip</LinkButton>
          </Card>
        ) : (
          <EmptyState title="No trips planned" action={<LinkButton to="/trips/new" variant="primary">Plan a trip</LinkButton>}>
            Plan a journey to keep its details in one place.
          </EmptyState>
        )}
      </section>
    </>
  );
}
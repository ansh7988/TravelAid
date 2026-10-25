import { useState, type FormEvent } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Button, Card, Dialog, EmptyState, Field, Notice, PageHeading } from '../components/ui';
import { usePersistentState } from '../hooks/usePersistentState';
import { contactStore } from '../services/storage';
import { prototypeMessagingService, type FamilyGroup, type MessagingResult } from '../services/messaging';

const TABS = [
  { to: '/messages', label: 'Chats', end: true },
  { to: '/messages/groups', label: 'Family Groups', end: false },
  { to: '/messages/requests', label: 'Requests', end: false },
  { to: '/messages/contacts', label: 'Contacts', end: false },
];

export function MessagingLayout() {
  return (
    <>
      <PageHeading title="Messages" description="Private chats and family groups." />
      <p className="privacy-note">
        Saved on this device only. End-to-end encryption is not yet in place, so don't share sensitive details here.
      </p>
      <nav className="msg-tabs" aria-label="Messaging sections">
        {TABS.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end}>
            {t.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </>
  );
}

export function ChatsPage() {
  return (
    <EmptyState title="No chats yet">
      Chats appear after you connect with another TravelAid user and they accept. Connecting needs the accounts backend, which is not set up yet.
    </EmptyState>
  );
}

export function RequestsPage() {
  return (
    <EmptyState title="No connection requests">
      Incoming and outgoing requests will show here once accounts are connected. You can accept, reject, cancel or remove connections, and block or report users.
    </EmptyState>
  );
}

export function GroupsPage() {
  const [groups, setGroups] = useState<FamilyGroup[]>(() => prototypeMessagingService.listGroups());
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<FamilyGroup | null>(null);

  function refresh() {
    setGroups(prototypeMessagingService.listGroups());
  }

  function onCreate(e: FormEvent) {
    e.preventDefault();
    const res: MessagingResult<FamilyGroup> = prototypeMessagingService.createGroup(name);
    if (res.ok) {
      setName('');
      setError(null);
      setStatus(`Group "${res.value.name}" created on this device.`);
      refresh();
    } else {
      setError(res.message);
    }
  }

  function onDelete() {
    if (!toDelete) return;
    const res = prototypeMessagingService.deleteGroup(toDelete.id);
    if (res.ok) {
      setStatus(`"${toDelete.name}" deleted from this device.`);
      refresh();
    } else {
      setError(res.message);
    }
    setToDelete(null);
  }

  return (
    <>
      {status && <Notice tone="success">{status}</Notice>}
      <Card>
        <h2>Create a family group</h2>
        <form onSubmit={onCreate} noValidate className="form">
          <Field id="gname" label="Group name" error={error ?? undefined} hint="For example: Family, Trip to Shimla">
            {(p) => <input {...p} value={name} onChange={(e) => setName(e.target.value)} />}
          </Field>
          <div className="row-actions">
            <Button type="submit">Create group</Button>
          </div>
        </form>
        <p className="small muted">Groups are stored on this device only. Adding members needs the accounts backend.</p>
      </Card>

      <section aria-labelledby="groups-h">
        <h2 id="groups-h">Your groups</h2>
        {groups.length === 0 ? (
          <EmptyState title="No family groups yet">Create one above to set up a group for your family.</EmptyState>
        ) : (
          <ul className="list">
            {groups.map((g) => (
              <li key={g.id} className="list-item">
                <div>
                  <strong>{g.name}</strong>
                  <div className="muted small">
                    Created {new Date(g.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })} · Members: none yet · Stored on this device only
                  </div>
                </div>
                <Button variant="ghost" className="btn--sm" onClick={() => setToDelete(g)}>
                  Delete<span className="sr-only"> {g.name}</span>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Dialog
        open={!!toDelete}
        title="Delete this group?"
        onClose={() => setToDelete(null)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setToDelete(null)}>Cancel</Button>
            <Button variant="danger" onClick={onDelete}>Delete</Button>
          </>
        }
      >
        <p>"{toDelete?.name}" will be removed from this device. This cannot be undone.</p>
      </Dialog>
    </>
  );
}

export function ContactsPage() {
  const { value: contacts } = usePersistentState(contactStore);
  const [userId, setUserId] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  async function onLookup(e: FormEvent) {
    e.preventDefault();
    const id = userId.trim();
    if (!id) {
      setMessage('Enter a TravelAid user ID.');
      return;
    }
    const res = await prototypeMessagingService.lookupUser(id);
    setMessage(res.ok ? 'User found.' : res.message);
  }

  return (
    <>
      <Card>
        <h2>Find a TravelAid user</h2>
        <form onSubmit={onLookup} noValidate className="form">
          <Field id="uid" label="TravelAid user ID" hint="Search by user ID only. Phone numbers and emails are never shown in search.">
            {(p) => <input {...p} value={userId} autoComplete="off" onChange={(e) => setUserId(e.target.value)} />}
          </Field>
          <div className="row-actions">
            <Button type="submit">Find user</Button>
          </div>
        </form>
        {message && <Notice tone="info">{message}</Notice>}
      </Card>

      <section aria-labelledby="trusted-h">
        <h2 id="trusted-h">Your trusted contacts</h2>
        {contacts.length === 0 ? (
          <EmptyState title="No trusted contacts yet">Add trusted contacts in Family Safety first.</EmptyState>
        ) : (
          <ul className="list">
            {contacts.map((c) => (
              <li key={c.id} className="list-item">
                <div>
                  <strong>{c.name}</strong>
                  <div className="muted small">{c.relationship}</div>
                </div>
                <span className="small muted">Not connected</span>
              </li>
            ))}
          </ul>
        )}
        <p className="small muted">
          Trusted contacts are stored on this device. To chat with them on TravelAid, they need an account and must accept a connection.
        </p>
      </section>
    </>
  );
}
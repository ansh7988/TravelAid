import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePersistentState } from '../hooks/usePersistentState';
import { profileStore } from '../services/storage';

/** Initials from the saved name. With no name saved, shows a neutral outline icon, never a made-up identity. */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  return parts.slice(0, 2).map((p) => p[0].toUpperCase()).join('');
}

function UserOutline() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true" focusable="false">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  );
}

export function ProfileMenu() {
  const { value: profile } = usePersistentState(profileStore);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const initials = initialsOf(profile.fullName);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="profile-menu" ref={wrapRef}>
      <button
        ref={triggerRef}
        type="button"
        className="profile-menu__trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="profile-menu-panel"
        aria-label={profile.fullName ? `Account menu for ${profile.fullName}` : 'Account menu'}
        onClick={() => setOpen((v) => !v)}
      >
        {initials || <UserOutline />}
      </button>
      {open && (
        <ul className="profile-menu__panel" id="profile-menu-panel" role="menu">
          <li className="profile-menu__head" role="none">
            <strong>{profile.fullName || 'Your account'}</strong>
            <span>{profile.fullName ? 'Saved on this device' : 'Add your name in My Profile'}</span>
          </li>
          <li role="none">
            <Link role="menuitem" to="/profile" onClick={() => setOpen(false)}>My Profile</Link>
          </li>
          <li role="none">
            <Link role="menuitem" to="/settings" onClick={() => setOpen(false)}>Settings</Link>
          </li>
          <li role="none">
            <Link role="menuitem" to="/help" onClick={() => setOpen(false)}>About & Help</Link>
          </li>
        </ul>
      )}
    </div>
  );
}
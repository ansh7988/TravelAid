import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { SOSButton } from '../components/SOSButton';
import { ProfileMenu } from '../components/ProfileMenu';
import { Logo } from '../components/Logo';
import { Icon, type IconName } from '../components/Icons';
import { EMERGENCY_NUMBER, telLink } from '../services/links';

interface NavItem {
  to: string;
  label: string;
  icon: IconName;
  end?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { to: '/', label: 'Home', icon: 'home', end: true },
      { to: '/nearby', label: 'Nearby Help', icon: 'pin' },
    ],
  },
  {
    title: 'Safety',
    items: [
      { to: '/emergency', label: 'Emergency Centre', icon: 'alert' },
      { to: '/family', label: 'Family Safety', icon: 'shield' },
      { to: '/messages', label: 'Messages', icon: 'chat' },
    ],
  },
  {
    title: 'Travel',
    items: [{ to: '/trips', label: 'My Trips', icon: 'route' }],
  },
  {
    title: 'Account',
    items: [
      { to: '/profile', label: 'My Profile', icon: 'user' },
      { to: '/settings', label: 'Settings', icon: 'sliders' },
      { to: '/help', label: 'About & Help', icon: 'info' },
    ],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap((s) => s.items);

const BOTTOM_NAV: NavItem[] = [
  { to: '/', label: 'Home', icon: 'home', end: true },
  { to: '/nearby', label: 'Nearby', icon: 'pin' },
  { to: '/family', label: 'Family', icon: 'users' },
  { to: '/messages', label: 'Messages', icon: 'chat' },
  { to: '/trips', label: 'Trips', icon: 'route' },
];

function titleFor(pathname: string): string {
  const match = NAV_ITEMS.find((n) => (n.end ? pathname === n.to : pathname.startsWith(n.to)));
  return match?.label ?? 'TravelAid';
}

export function AppLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();
  const title = titleFor(location.pathname);

  // Close the drawer whenever the route changes.
  useEffect(() => setDrawerOpen(false), [location.pathname]);

  // Escape closes the drawer.
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  return (
    <div className="app">
      <a href="#main" className="skip-link">
        Skip to content
      </a>

      <aside id="sidebar" className={`sidebar ${drawerOpen ? 'sidebar--open' : ''}`} aria-label="Main navigation">
        <div className="brand">
          <Logo />
        </div>

        <nav aria-label="Sections" className="sidebar__nav">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title} className="nav-group">
              <p className="nav-group__title">{section.title}</p>
              <ul className="nav-list">
                {section.items.map((item) => (
                  <li key={item.to}>
                    <NavLink to={item.to} end={item.end} className="nav-link">
                      <Icon name={item.icon} size={18} />
                      <span>{item.label}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="sidebar__foot">
          <span className="sidebar__foot-icon" aria-hidden="true">
            <Icon name="phone" size={16} />
          </span>
          <div className="sidebar__foot-text">
            <strong>Emergency: {EMERGENCY_NUMBER}</strong>
            <span>Works across India</span>
          </div>
          <a className="sidebar__foot-call" href={telLink(EMERGENCY_NUMBER)} aria-label={`Call ${EMERGENCY_NUMBER}`}>
            Call
          </a>
        </div>
      </aside>

      {drawerOpen && (
        <button type="button" className="scrim" aria-label="Close menu" onClick={() => setDrawerOpen(false)} />
      )}

      <div className="main-col">
        <header className="header">
          <button
            type="button"
            className="icon-btn menu-btn"
            aria-label="Open menu"
            aria-expanded={drawerOpen}
            aria-controls="sidebar"
            onClick={() => setDrawerOpen(true)}
          >
            <Icon name="menu" size={20} />
          </button>
          <h2 className="header__title">{title}</h2>
          <div className="header__sos">
            <SOSButton compact />
          </div>
          <ProfileMenu />
        </header>

        <main id="main" className="content" tabIndex={-1}>
          <Outlet />
        </main>

        <nav className="bottom-nav" aria-label="Primary">
          {BOTTOM_NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className="bottom-nav__item">
              <Icon name={item.icon} size={22} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
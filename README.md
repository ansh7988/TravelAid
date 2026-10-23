# TravelAid — Smart Travel Safety & Emergency Assistance

A React + Vite + TypeScript prototype of a travel-safety web app, built as an installable PWA.
It runs locally with no paid services, no accounts and no secret keys.

> **Not an emergency service.** TravelAid does not dispatch ambulances or contact emergency services.
> In an emergency in India, call **112**.

## Quick start

Requirements: Node.js 18.18+ (20 or 22 recommended) and npm.

```bash
npm install
npm run dev        # development server at http://localhost:5173
npm run build      # type-check, then production build into dist/
npm run preview    # serve the production build at http://localhost:4173
npm run typecheck  # TypeScript project check only
```

Scripts are defined in `package.json`.

## Project structure

```
public/                  Static assets served as-is
  manifest.webmanifest   PWA manifest (name, colours, icons, start_url)
  sw.js                  Service worker (app shell + offline page only)
  offline.html           Offline fallback page
  icons/icon.svg         App icon
src/
  components/            Reusable UI: SOS button, dialogs, fields, notices, cards, error boundary
  layouts/AppLayout.tsx  Sidebar, mobile drawer, header, bottom navigation
  pages/                 One file per area: Home, Nearby, Emergency, Family, Trips, Profile, Settings, Help
  services/              Business logic and platform boundaries (no React)
    storage.ts           Local prototype storage (localStorage)
    links.ts             tel:, sms:, WhatsApp and Maps links
    alerts.ts            Builds alert text; never sends
    location.ts          Browser geolocation wrapper
    places.ts            Nearby-search interface; no provider configured
    trips.ts             Trip validation and status transitions
  hooks/                 usePersistentState (React state synced to a store)
  utils/validation.ts    Contact and phone validation
  types/index.ts         Shared domain types
  pwa/register.ts        Service worker registration (production, secure contexts only)
  styles/                tokens.css (design tokens), global.css, app.css
```

## Design

Colours are defined once in `src/styles/tokens.css`:

| Token | Hex | Use |
|---|---|---|
| `--color-brand` | `#315744` | Brand, navigation, headings, selected states |
| `--color-bg` | `#FAFAF6` | Main background |
| `--color-sage` | `#EAF1E9` | Sidebar and secondary surfaces |
| `--color-yellow` | `#F3E8B2` | Helpful highlights (warning notices) |
| `--color-danger` | `#B83A3A` | SOS and genuinely urgent actions only |
| `--color-surface` | `#FFFFFF` | Cards and content |
| `--color-text` | `#26352B` | Body text |

Layout: a fixed sidebar on desktop; below 900px the sidebar becomes a drawer. Below 768px a bottom
navigation bar shows Home, Nearby, Trips, Family and Profile. The SOS action is always in the header.

## Feature status

| Feature | Status | Notes |
|---|---|---|
| Routing, app shell, sidebar, mobile drawer, bottom navigation | Implemented | Nested routes work on refresh in dev and with a static host that serves `index.html` for unknown paths |
| Home: SOS, quick access, trusted-contact reminder, trip summary | Implemented | Trip summary appears only when real trip data exists |
| Emergency Centre: 112 call link, emergency type, steps, optional location, alert preview | Implemented | Calling never waits on maps, auth or any API |
| Family Safety: add, edit, remove contacts with validation and duplicate check | Implemented, prototype-only | Stored on this device |
| WhatsApp and SMS alert links | Implemented | Opens the app with a prefilled message. The user reviews and sends. TravelAid does not know whether it was delivered |
| Trips: create, edit, view, start, check-in, complete, cancel | Implemented, prototype-only | Records the user's own actions. No live tracking |
| Profile: personal details, optional medical info with explicit consent | Implemented, prototype-only | Medical fields are discarded unless consent is ticked |
| Settings: location and notification preferences, delete local data | Implemented, prototype-only | The notification preference is saved, but no reminders are generated yet |
| Browser geolocation | Implemented | Requested only on button press; requires HTTPS or localhost |
| Nearby Help: search, categories, directions | Interface built, needs configuration | No places provider is configured, so the app shows a setup notice and manual Maps search. No facilities or phone numbers are invented |
| Offline support: shell, offline page | Implemented | See the offline section |
| Installable PWA (manifest, icons, service worker) | Implemented | Installability is confirmed by the browser, not by this project |
| Accounts and sign-in | Planned | Requires Supabase or another auth provider |
| Cloud sync of contacts, trips and profile | Planned | Requires a backend with row-level security |
| Server-side SMS or WhatsApp sending with delivery confirmation | Planned | Requires a messaging provider (for example Twilio or WhatsApp Business API) |
| Live location updates during trips | Planned | Not implemented. The app does not show a moving location marker |
| Ambulance dispatch or automatic emergency-service contact | Not planned in this project | Requires an authorised operational integration |
| Android app | Planned | See migration notes below |

## Local data: how it works and its limits

Contacts, trips, profile (name, phone, and optional medical fields if consented) and settings are saved
in the browser's `localStorage` under keys starting with `travelaid.`.

- Data stays on this device and this browser. It does not sync between devices.
- Clearing site data, using a private window, or a browser policy can remove it.
- It is not encrypted. Anyone with access to this browser profile can read it.
- Passwords, authentication secrets and payment details are never stored.
- The Settings page has a "Delete all local TravelAid data" action.

## Offline behaviour

After one successful online visit, the service worker caches the app shell (`/`), `offline.html` and the
icon. Built JavaScript and CSS (`/assets/*`) are cached when first loaded.

| Works offline (after first load) | Needs connectivity |
|---|---|
| Opening the app shell and all pages | Nearby search and place results |
| Viewing and editing contacts, trips, profile, settings (local) | Opening Maps, directions and map links |
| Calling 112 (the phone's dialler uses the mobile network, not the internet) | WhatsApp (needs internet); SMS depends on the carrier |
| Preparing alert text | Any future backend or sign-in |

Personal, contact, trip, medical and location data is never placed in the service worker cache.

## Verification status

- The source was checked for syntax errors (all `.ts`/`.tsx` files parse).
- `npm install`, `npm run build` and in-browser testing were **not** run in the environment where this
  project was generated, because the npm registry was blocked there. Run `npm install` and `npm run build`
  first. Expect to fix any type errors the first build reports.
- No `package-lock.json` is included, because it is created by the first `npm install`.

## Testing

Automated tests are not included in this version. Recommended manual checks:

1. `npm run build` completes with no errors.
2. `npm run preview`, then open each route from the sidebar and the bottom navigation.
3. Refresh on a nested route, for example `/trips/new`. It should load.
4. Family Safety: add a contact with an invalid phone (for example `12`) and confirm the error appears; add the same number twice and confirm the duplicate message; edit and remove a contact (removal asks for confirmation).
5. Trips: create a trip with arrival before departure (validation error); start, check in, complete; cancel a planned trip.
6. Responsive: check at 320px, 375px, 430px, a tablet width (about 768px) and desktop. There should be no horizontal scrolling.
7. Keyboard: Tab through the sidebar, forms and dialogs. Focus should be visible, and Escape should close the drawer and dialogs.
8. PWA: in Chrome DevTools > Application, confirm the manifest loads and the service worker registers (production build served over `localhost`).

## Integration notes

**Maps and nearby places.** `src/services/places.ts` defines the `PlacesProvider` interface. The default is
`notConfiguredProvider`. To connect a real source, implement the interface, for example with
OpenStreetMap Overpass (free, requires attribution and rate-limit compliance) or Google Places (paid,
requires attribution and a billing account). Do not put a paid provider key in a `VITE_` variable, because
Vite embeds it in the public bundle. Call the provider through a server-side function you control.

**Messaging.** WhatsApp and SMS use device links (`wa.me`, `sms:`). Automatic sending requires a server-side
provider, and the UI must show what the provider actually reports, not an assumed "sent" state.

**Backend (Supabase, recommended).** Replace the functions in `src/services/storage.ts` with a repository
that implements the same shape, backed by Supabase Auth and PostgreSQL tables for contacts, trips and profile.
Every table needs row-level security so a user can read only their own rows. Keep the Supabase anon key
public-only; never ship a service-role key to the browser. No SQL is needed to run this prototype.

**Location.** Geolocation is wrapped in `src/services/location.ts`. Continuous tracking is not implemented.
Background tracking is not reliable in a browser, so it needs a native app.

## Android migration path

1. Keep `src/services` as the platform boundary. Pages call services only, not `localStorage`, `navigator` or `tel:` directly where avoidable.
2. Wrap the built web app with Capacitor. This reuses the UI and gives access to native location, calling, SMS and notifications through plugins.
3. Replace the storage service with an encrypted local database (for example SQLite via a Capacitor plugin) for offline-first data.
4. Add native background location and foreground-service alerts for trips, with the required Android permission explanations and Play Store declarations.
5. Move authentication and sync to Supabase, using the same repository interfaces.

## Production checklist

- Add real support and legal contact details to the Help page (none are invented here).
- Review the privacy notice with legal advice before publishing.
- Generate PNG icons (192px and 512px) for broader platform support; `icon.svg` is the only icon currently shipped.
- Choose and configure a places provider, or keep the manual Maps fallback.
- Add automated tests for the `services/` layer.
- Serve over HTTPS; geolocation and the service worker require a secure context.

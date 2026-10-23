/**
 * Registers the service worker in production builds only, and only in secure contexts
 * (HTTPS or localhost). The worker caches the app shell and the offline page, never
 * contacts, trips, profile, location or any API responses.
 */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD) return;
  if (!('serviceWorker' in navigator) || !window.isSecureContext) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Registration failure is non-fatal: the app still works online.
    });
  });
}

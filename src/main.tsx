import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Manage PWA Service Worker:
// In development, unregister service workers to avoid stale cache traps during active code iterations.
// In production, register the network-first service worker.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    if (import.meta.env.DEV) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister().then((success) => {
            if (success) console.log('[PWA] Unregistered development service worker');
          });
        }
      });
    } else {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((reg) => {
          console.log('[PWA] Service Worker active with scope:', reg.scope);
          // If a new worker is installed, ensure it activates immediately
          reg.onupdatefound = () => {
            const installing = reg.installing;
            if (installing) {
              installing.onstatechange = () => {
                if (installing.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('[PWA] New version detected; refreshing caches.');
                  window.location.reload();
                }
              };
            }
          };
        })
        .catch((err) => {
          console.warn('[PWA] Service Worker registration fallback:', err);
        });
    }
  });
}

createRoot(document.getElementById('root')!).render(<App />);

import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Register PWA Service Worker in both development/preview and production
// so Android Chrome WebAPK and desktop PWA installation criteria are always satisfied.
if ('serviceWorker' in navigator) {
  const registerPwaServiceWorker = () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .then((reg) => {
        reg.update().catch(() => {});
        reg.onupdatefound = () => {
          const installing = reg.installing;
          if (installing) {
            installing.onstatechange = () => {
              if (installing.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[PWA] Updated service worker installed.');
              }
            };
          }
        };
      })
      .catch((err) => {
        console.warn('[PWA] Service Worker registration warning:', err);
      });
  };

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    registerPwaServiceWorker();
  } else {
    window.addEventListener('DOMContentLoaded', registerPwaServiceWorker);
  }
}

createRoot(document.getElementById('root')!).render(<App />);

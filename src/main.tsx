import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Register PWA Service Worker for Samsung Internet, Chrome, and Android WebAPK
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        console.log('[PWA] Service Worker active with scope:', reg.scope);
      })
      .catch((err) => {
        console.warn('[PWA] Service Worker registration fallback:', err);
      });
  });
}

createRoot(document.getElementById('root')!).render(<App />);

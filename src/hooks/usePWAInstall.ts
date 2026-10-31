import { useEffect, useState, useCallback } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

declare global {
  interface Window {
    __deferredPwaPrompt?: BeforeInstallPromptEvent | null;
  }
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(() => {
    if (typeof window !== 'undefined' && window.__deferredPwaPrompt) {
      return window.__deferredPwaPrompt;
    }
    return null;
  });
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isSamsung, setIsSamsung] = useState(false);
  const [isSamsungBrowser, setIsSamsungBrowser] = useState(false);
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);
  const [swStatus, setSwStatus] = useState<'ACTIVE_CONTROLLING' | 'REGISTERED' | 'REGISTERING' | 'UNAVAILABLE'>('REGISTERING');
  const [manifestVerified, setManifestVerified] = useState<boolean>(true);

  const checkServiceWorkerAndManifest = useCallback(async () => {
    if (typeof window === 'undefined') return;

    // 1. Verify Service Worker state
    if ('serviceWorker' in navigator) {
      try {
        let reg = await navigator.serviceWorker.getRegistration('/');
        if (!reg) {
          reg = await navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' });
        }
        if (reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        if (navigator.serviceWorker.controller || reg.active) {
          setSwStatus('ACTIVE_CONTROLLING');
        } else {
          setSwStatus('REGISTERED');
        }
      } catch {
        setSwStatus('UNAVAILABLE');
      }
    } else {
      setSwStatus('UNAVAILABLE');
    }

    // 2. Verify Manifest with credentials
    try {
      const res = await fetch('/manifest.webmanifest', { credentials: 'include' });
      if (res.ok) {
        const json = await res.json();
        setManifestVerified(Boolean(json && json.name && Array.isArray(json.icons) && json.icons.length >= 2));
      }
    } catch {
      // Keep default true if offline
    }
  }, []);

  useEffect(() => {
    // Detect standalone mode (already installed PWA)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: minimal-ui)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    // Detect if running inside an iframe (e.g. AI Studio preview wrapper)
    try {
      setIsInIframe(window.self !== window.top);
    } catch {
      setIsInIframe(true);
    }

    // Detect mobile platform & device brand
    const userAgent = (window.navigator.userAgent || '').toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    const isAndroidDevice = /android/.test(userAgent);
    const isSamsungDevice = /samsung|sm-[a-z0-9]+|gt-[a-z0-9]+/i.test(userAgent);
    const isSamsungBrowserApp = /samsungbrowser/i.test(userAgent);
    const inApp = /fban|fbav|instagram|line|micromessenger|gsa|linkedinapp|twitter|threads|whatsapp|wv\)/i.test(userAgent);

    setIsIOS(isIOSDevice);
    setIsAndroid(isAndroidDevice);
    setIsSamsung(isSamsungDevice || isSamsungBrowserApp);
    setIsSamsungBrowser(isSamsungBrowserApp);
    setIsInAppBrowser(inApp);

    // Pick up early-captured prompt from index.html if available
    if (window.__deferredPwaPrompt) {
      setDeferredPrompt(window.__deferredPwaPrompt);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      window.__deferredPwaPrompt = promptEvent;
      setDeferredPrompt(promptEvent);
    };

    const handleCustomPromptReady = () => {
      if (window.__deferredPwaPrompt) {
        setDeferredPrompt(window.__deferredPwaPrompt);
      }
    };

    const handleAppInstalled = () => {
      window.__deferredPwaPrompt = null;
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('jarvis:pwa-prompt-ready', handleCustomPromptReady);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('jarvis:pwa-installed', handleAppInstalled);

    checkServiceWorkerAndManifest();

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('jarvis:pwa-prompt-ready', handleCustomPromptReady);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('jarvis:pwa-installed', handleAppInstalled);
    };
  }, [checkServiceWorkerAndManifest]);

  const install = async (): Promise<boolean> => {
    const activePrompt = deferredPrompt || window.__deferredPwaPrompt;
    if (!activePrompt) return false;
    try {
      await activePrompt.prompt();
      const { outcome } = await activePrompt.userChoice;
      if (outcome === 'accepted') {
        window.__deferredPwaPrompt = null;
        setIsInstalled(true);
        setDeferredPrompt(null);
        return true;
      }
    } catch (err) {
      console.warn('Install prompt error:', err);
    }
    return false;
  };

  const repairAndRefreshSw = async () => {
    if (!('serviceWorker' in navigator)) return;
    try {
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' });
      await reg.update();
      if (reg.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
      await checkServiceWorkerAndManifest();
    } catch (err) {
      console.warn('[PWA] Repair SW error:', err);
    }
  };

  return {
    isInstallable: !!(deferredPrompt || (typeof window !== 'undefined' && window.__deferredPwaPrompt)),
    isInstalled,
    isIOS,
    isAndroid,
    isSamsung,
    isSamsungBrowser,
    isInAppBrowser,
    isInIframe,
    swStatus,
    manifestVerified,
    install,
    repairAndRefreshSw,
    deferredPrompt,
  };
}

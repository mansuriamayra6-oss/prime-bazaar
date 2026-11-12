import { useEffect, useState, useCallback } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

// Module-level store ensures `beforeinstallprompt` is captured even before any modal opens
let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;
let globalIsInstalled = false;
let globalSwReady = false;
let globalManifestValid = false;
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

export function setGlobalSwReady(ready: boolean) {
  globalSwReady = ready;
  notifyListeners();
}

async function verifyManifestAndSW() {
  if (typeof window === 'undefined') return;

  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.getRegistration('/');
      if (reg && (reg.active || reg.waiting || reg.installing)) {
        globalSwReady = true;
      }
    } catch {
      // ignore
    }
  }

  try {
    const res = await fetch('/manifest.webmanifest', { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      if (data && data.name && Array.isArray(data.icons) && data.icons.length >= 2) {
        globalManifestValid = true;
      }
    }
  } catch {
    // ignore
  }

  notifyListeners();
}

if (typeof window !== 'undefined') {
  globalIsInstalled =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true;

  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    globalDeferredPrompt = e as BeforeInstallPromptEvent;
    notifyListeners();
  });

  window.addEventListener('appinstalled', () => {
    globalIsInstalled = true;
    globalDeferredPrompt = null;
    notifyListeners();
  });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      globalSwReady = true;
      notifyListeners();
    });
  }

  verifyManifestAndSW();
}

export function usePWAInstall() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const update = () => setTick((t) => t + 1);
    listeners.add(update);

    if (!globalSwReady || !globalManifestValid) {
      verifyManifestAndSW();
    }

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayMode = (e: MediaQueryListEvent) => {
      if (e.matches) {
        globalIsInstalled = true;
        notifyListeners();
      }
    };
    mediaQuery.addEventListener?.('change', handleDisplayMode);

    return () => {
      listeners.delete(update);
      mediaQuery.removeEventListener?.('change', handleDisplayMode);
    };
  }, []);

  const userAgent =
    typeof window !== 'undefined' ? window.navigator.userAgent.toLowerCase() : '';
  const isIOS = /iphone|ipad|ipod/.test(userAgent);
  const isAndroid = /android/.test(userAgent);

  let isInIframe = false;
  if (typeof window !== 'undefined') {
    try {
      isInIframe = window.self !== window.top;
    } catch {
      isInIframe = true;
    }
  }

  const recheckReadiness = useCallback(async () => {
    await verifyManifestAndSW();
  }, []);

  const install = useCallback(async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    if (!globalDeferredPrompt) {
      return 'unavailable';
    }
    try {
      await globalDeferredPrompt.prompt();
      const { outcome } = await globalDeferredPrompt.userChoice;
      if (outcome === 'accepted') {
        globalIsInstalled = true;
        globalDeferredPrompt = null;
        notifyListeners();
        return 'accepted';
      }
      return 'dismissed';
    } catch (err) {
      console.error('[PWA] Install prompt failed:', err);
      return 'unavailable';
    }
  }, []);

  return {
    isInstallable: !!globalDeferredPrompt,
    isInstalled: globalIsInstalled,
    isIOS,
    isAndroid,
    isInIframe,
    swReady: globalSwReady,
    manifestValid: globalManifestValid,
    recheckReadiness,
    install,
  };
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

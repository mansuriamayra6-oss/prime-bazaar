import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { setGlobalSwReady } from './hooks/usePWAInstall';

if (typeof window !== 'undefined') {
  const isBrowserExtensionError = (source?: string, message?: string) => {
    const src = source || '';
    const msg = message || '';
    return (
      src.startsWith('chrome-extension://') ||
      src.startsWith('moz-extension://') ||
      src.startsWith('safari-extension://') ||
      msg.includes('Failed to connect to MetaMask') ||
      msg.includes('nkbihfbeogaeaoehlefnkodbefgpgknn')
    );
  };

  window.addEventListener(
    'error',
    (event) => {
      if (isBrowserExtensionError(event.filename, event.message)) {
        event.preventDefault();
      }
    },
    true
  );

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const message =
      typeof reason === 'string'
        ? reason
        : reason?.message || String(reason || '');
    const stack = typeof reason?.stack === 'string' ? reason.stack : '';
    if (isBrowserExtensionError(stack, `${message} ${stack}`)) {
      event.preventDefault();
    }
  });
}

if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('/sw.js', { scope: '/' })
    .then((registration) => {
      if (registration.active || registration.installing || registration.waiting) {
        setGlobalSwReady(true);
      }
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'activated' || worker.state === 'installed') {
            setGlobalSwReady(true);
          }
        });
      });
    })
    .catch((error) => {
      console.warn('[PWA] Service Worker registration error:', error);
    });
}

createRoot(document.getElementById('root')!).render(<App />);

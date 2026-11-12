import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { setGlobalSwReady } from './hooks/usePWAInstall';

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

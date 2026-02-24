'use client';

/**
 * SwRegister.tsx
 * Registers the service worker and wires up Background Sync.
 * Rendered once in app/layout.tsx — returns null (no UI).
 */

import { useEffect } from 'react';

declare global {
  interface Window {
    __swRegistration?: ServiceWorkerRegistration;
  }
}

export default function SwRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    // Register SW
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        window.__swRegistration = reg;
        console.log('[SW] Registered — scope:', reg.scope);

        // Listen for messages from the SW (background-sync trigger)
        navigator.serviceWorker.addEventListener('message', (e) => {
          if (e.data?.type === 'SW_SYNC_REQUESTED') {
            // Dispatch a custom event that AppStoreProvider listens to
            window.dispatchEvent(new CustomEvent('sw-sync'));
          }
        });
      })
      .catch((err) => console.warn('[SW] Registration failed:', err));

    // Register a Background Sync tag when the user goes online
    const requestSync = async () => {
      const reg = window.__swRegistration;
      if (!reg) return;
      try {
        // @ts-ignore — BackgroundSync API not in all TS lib types yet
        if ('sync' in reg) await reg.sync.register('synplix-sync');
      } catch {
        // Fallback: dispatch native online event — AppStore handles it
        window.dispatchEvent(new Event('online'));
      }
    };

    window.addEventListener('online', requestSync);
    return () => window.removeEventListener('online', requestSync);
  }, []);

  return null;
}

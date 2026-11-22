'use client';

import { useSyncExternalStore } from 'react';

function subscribe(notify) {
  window.addEventListener('online', notify);
  window.addEventListener('offline', notify);
  return () => {
    window.removeEventListener('online', notify);
    window.removeEventListener('offline', notify);
  };
}

export default function OfflineBanner() {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
  return online ? null : (
    <p className="offline-banner" role="status">You're offline. Changes will be retried when you're back.</p>
  );
}

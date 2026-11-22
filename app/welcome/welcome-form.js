'use client';

import dynamic from 'next/dynamic';
import { useRef, useState } from 'react';
import { Pending, RequestError } from '@/components/request-feedback';
import { readJson } from '@/lib/client-requests';

const LocationMap = dynamic(() => import('./location-map'), {
  ssr: false,
  loading: () => <div className="neighbourhood-map location-map" role="status">Loading map…</div>,
});

export default function WelcomeForm({ demo, defaultName = '' }) {
  const [name, setName] = useState(defaultName);
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(null);
  const busy = useRef(false);

  async function save(demoIdentity, event) {
    event?.preventDefault();
    if (busy.current) return;
    busy.current = true;
    setPending(demoIdentity ? 'demo' : 'create');
    setError(null);
    try {
      await readJson('/api/welcome', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(demoIdentity ? { demo: true } : { name, ...location }),
      });
      window.location.assign('/post');
    } catch (failure) {
      if (failure.code === 'ALREADY_ONBOARDED') {
        window.location.assign('/post');
        return;
      }
      setError(failure);
    } finally {
      busy.current = false;
      setPending(null);
    }
  }

  return (
    <form className="panel settings-panel" onSubmit={(event) => save(false, event)} noValidate>
      <fieldset className="grid gap-4" disabled={Boolean(pending)}>
        <label>Display name<input value={name} maxLength={100} autoComplete="name" onChange={(event) => setName(event.target.value)} /></label>
        <div>
          <p className="eyebrow mb-2">Your area</p>
          <p className="muted mb-2 text-sm">Select a point on the map or move the map and use its centre.</p>
          <LocationMap value={location} onChange={setLocation} />
          <p className="muted mt-2 text-sm" role="status">{location ? `Area selected (${location.lat.toFixed(4)}, ${location.lng.toFixed(4)})` : 'Choose your area to continue.'}</p>
        </div>
        <RequestError error={error} retry={() => save(pending === 'demo')} />
        <button type="submit" className="primary settings-save">{pending === 'create' ? <Pending>Setting up…</Pending> : 'Create account'}</button>
        {demo && (
          <button type="button" className="secondary" onClick={() => save(true)}>
            {pending === 'demo' ? <Pending>Linking…</Pending> : 'Use a demo identity'}
          </button>
        )}
      </fieldset>
    </form>
  );
}

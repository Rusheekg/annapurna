'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { Pending, RequestError } from '@/components/request-feedback';
import { readJson } from '@/lib/client-requests';

const LocationMap = dynamic(() => import('./location-map'), {
  ssr: false,
  loading: () => <div className="neighbourhood-map location-map" role="status">Loading map…</div>,
});

const roles = { donor: 'Donor', receiver: 'Receiver', volunteer: 'Volunteer' };

export default function WelcomeForm({ demo }) {
  const router = useRouter();
  const [role, setRole] = useState('donor');
  const [linking, setLinking] = useState(false);
  const [demoId, setDemoId] = useState('');
  const [name, setName] = useState('');
  const [location, setLocation] = useState(null);
  const [dailyNeed, setDailyNeed] = useState('');
  const [chilled, setChilled] = useState(false);
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const demoAccounts = demo?.[role] ?? [];
  const chooseDemo = linking && demoAccounts.length > 0;

  async function save(event) {
    event?.preventDefault();
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      await readJson('/api/welcome', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chooseDemo ? { role, demoId: Number(demoId) } : {
          role, name, ...location, dailyNeed: Number(dailyNeed), canStoreChilled: chilled,
        }),
      });
      window.location.assign('/workspace');
    } catch (failure) {
      if (failure.code === 'ALREADY_ONBOARDED') {
        window.location.assign('/workspace');
        return;
      }
      setError(failure);
      if (failure.code === 'DEMO_UNAVAILABLE') {
        setDemoId('');
        router.refresh();
      }
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  return (
    <form className="panel settings-panel" onSubmit={save} noValidate>
      <fieldset className="grid gap-4" disabled={pending}>
        <label>Role
          <select value={role} onChange={(event) => {
            setRole(event.target.value);
            setDemoId('');
            setError(null);
          }}>
            {Object.entries(roles).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </label>
        {demo && (demoAccounts.length ? (
          <label>Organisation setup
            <select value={chooseDemo ? 'demo' : 'create'} onChange={(event) => {
              setLinking(event.target.value === 'demo');
              setError(null);
            }}>
              <option value="create">Create your own organisation</option>
              <option value="demo">Link a demo organisation</option>
            </select>
          </label>
        ) : <p className="muted" role="status">All demo organisations are taken. Create your own instead.</p>)}
        {chooseDemo ? (
          <label>Demo organisation
            <select value={demoId} onChange={(event) => setDemoId(event.target.value)}>
              <option value="">Choose an organisation</option>
              {demoAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
            </select>
          </label>
        ) : (
          <>
            <label>Organisation name<input value={name} maxLength={100} onChange={(event) => setName(event.target.value)} /></label>
            {role === 'receiver' && (
              <>
                <label>Daily need (meals)<input type="number" min="1" step="1" value={dailyNeed} onChange={(event) => setDailyNeed(event.target.value)} /></label>
                <label className="auth-checkbox"><input type="checkbox" checked={chilled} onChange={(event) => setChilled(event.target.checked)} />Can store chilled food</label>
              </>
            )}
            <div>
              <p className="eyebrow mb-2">Organisation location</p>
              <p className="muted mb-2 text-sm">Select a point on the map or move the map and use its centre.</p>
              <LocationMap value={location} onChange={setLocation} />
              <p className="muted mt-2 text-sm" role="status">{location ? `Location selected (${location.lat.toFixed(4)}, ${location.lng.toFixed(4)})` : 'Choose your location to continue.'}</p>
            </div>
          </>
        )}
        <RequestError error={error} retry={save} />
        <button type="submit" className="primary settings-save">{pending ? <Pending>Setting up…</Pending> : 'Create account'}</button>
      </fieldset>
    </form>
  );
}

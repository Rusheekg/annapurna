'use client';

import dynamic from 'next/dynamic';
import { useRef, useState } from 'react';
import { Pending, RequestError } from '@/components/request-feedback';
import { readJson } from '@/lib/client-requests';

const LocationMap = dynamic(() => import('@/app/welcome/location-map'), {
  ssr: false,
  loading: () => <div className="neighbourhood-map location-map" role="status">Loading map…</div>,
});

// "Who are you receiving for?" The location starts at the user's own area.
export default function ReceiverSetup({ area, demoReceivers }) {
  const [linking, setLinking] = useState(false);
  const [demoId, setDemoId] = useState('');
  const [name, setName] = useState('');
  const [people, setPeople] = useState('');
  const [chilled, setChilled] = useState(false);
  const [location, setLocation] = useState(area);
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const chooseDemo = linking && demoReceivers?.length > 0;

  async function save(event) {
    event?.preventDefault();
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      await readJson('/api/receiving', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chooseDemo ? { demoId: Number(demoId) } : {
          name, dailyNeed: Number(people), canStoreChilled: chilled, ...location,
        }),
      });
      window.location.assign('/receive');
    } catch (failure) {
      if (failure.code === 'ALREADY_RECEIVING') {
        window.location.assign('/receive');
        return;
      }
      setError(failure);
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  return (
    <form className="panel settings-panel" onSubmit={save} noValidate>
      <fieldset className="grid gap-4" disabled={pending}>
        {demoReceivers && (demoReceivers.length ? (
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
              {demoReceivers.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
            </select>
          </label>
        ) : (
          <>
            <label>Organisation name<input value={name} maxLength={100} onChange={(event) => setName(event.target.value)} /></label>
            <label>People served daily<input type="number" min="1" step="1" value={people} onChange={(event) => setPeople(event.target.value)} /></label>
            <label className="auth-checkbox"><input type="checkbox" checked={chilled} onChange={(event) => setChilled(event.target.checked)} />Can store chilled food</label>
            <div>
              <p className="eyebrow mb-2">Where you receive</p>
              <p className="muted mb-2 text-sm">Starts at your area. Select another point on the map to change it.</p>
              <LocationMap value={location} onChange={setLocation} />
            </div>
          </>
        )}
        <RequestError error={error} retry={save} />
        <button type="submit" className="primary settings-save">{pending ? <Pending>Saving…</Pending> : 'Start receiving'}</button>
      </fieldset>
    </form>
  );
}

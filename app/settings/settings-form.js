'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { networkError, readJson } from '@/lib/client-requests';
import { Pending, RequestError } from '@/components/request-feedback';
import { assumptionFields, demoAssumptionNote } from '@/lib/impact-assumptions';

const defaults = { kg_per_meal: 0.4, co2e_per_kg: 2.5, avg_speed_kmph: 15 };

export default function SettingsForm({ initialValues }) {
  const router = useRouter();
  const [values, setValues] = useState(initialValues);
  const [pending, setPending] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const busy = useRef(false);

  async function save(nextValues, resetting = false) {
    if (busy.current) return;
    busy.current = true;
    setPending(resetting ? 'reset' : 'save');
    setError('');
    setNotice('');
    try {
      const data = await readJson('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextValues),
      });
      setValues(data);
      setNotice(resetting ? 'Assumptions reset to defaults.' : 'Assumptions saved.');
      router.refresh();
    } catch (failure) {
      setError({ ...(failure.code ? failure : networkError(true)), retry: () => save(nextValues, resetting) });
    } finally {
      busy.current = false;
      setPending(null);
    }
  }

  function reset() {
    if (window.confirm('Reset the shared assumptions to 0.4 kg per meal, 2.5 kg CO₂e per kg of food, and 15 km/h?')) {
      save(defaults, true);
    }
  }

  return (
    <form className="panel settings-panel" noValidate onSubmit={(event) => {
      event.preventDefault();
      save(Object.fromEntries(assumptionFields.map(([key]) => [key, Number(values[key])])));
    }}>
      <fieldset disabled={Boolean(pending)} className="grid gap-5">
        {assumptionFields.map(([key, label, description]) => (
          <div key={key}>
            <label htmlFor={key}>{label}</label>
            <input id={key} type="number" min="0" step="any" required inputMode="decimal"
              aria-invalid={error?.field === key || undefined}
              aria-describedby={error?.field === key ? `${key}-hint ${key}-error` : `${key}-hint`} value={values[key]}
              onChange={(event) => {
                setNotice('');
                setError(null);
                setValues((current) => ({ ...current, [key]: event.target.value }));
              }} />
            <p id={`${key}-hint`} className="muted mt-1 text-sm">{description}</p>
            {error?.field === key && <RequestError id={`${key}-error`} error={error} />}
          </div>
        ))}
        <div className="flex flex-wrap gap-3">
          <button className="primary settings-save" type="submit">{pending === 'save' ? <Pending>Saving…</Pending> : 'Save assumptions'}</button>
          <button className="secondary settings-save" type="button" onClick={reset}>
            {pending === 'reset' ? <Pending>Resetting…</Pending> : 'Reset to defaults'}
          </button>
        </div>
      </fieldset>
      <p className="muted mt-4 text-sm">{demoAssumptionNote}</p>
      {error && !error.field && <RequestError error={error} retry={error.retry} />}
      {notice && <p className="notice mt-3" role="status">{notice}</p>}
    </form>
  );
}

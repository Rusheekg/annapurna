'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

const fields = [
  ['kg_per_meal', 'Kg per meal', 'Used to estimate food weight from the portion count on new posts.'],
  ['co2e_per_kg', 'Kg CO₂e per kg of food', 'Applied to all delivered food in the impact estimate.'],
  ['avg_speed_kmph', 'Average travel speed (km/h)', 'Used to estimate travel time when matching food to receivers.'],
];

export default function SettingsForm({ initialValues }) {
  const router = useRouter();
  const [values, setValues] = useState(initialValues);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function save(event) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(fields.map(([key]) => [key, Number(values[key])]))),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setValues(data);
      setNotice('Assumptions saved.');
      router.refresh();
    } catch (failure) {
      setError(failure.message || 'Could not save assumptions. Try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="panel settings-panel" onSubmit={save}>
      <fieldset disabled={saving} className="grid gap-5">
        {fields.map(([key, label, description]) => (
          <div key={key}>
            <label htmlFor={key}>{label}</label>
            <input id={key} type="number" min="0" step="any" required inputMode="decimal"
              aria-describedby={`${key}-hint`} value={values[key]}
              onChange={(event) => {
                setNotice('');
                setValues((current) => ({ ...current, [key]: event.target.value }));
              }} />
            <p id={`${key}-hint`} className="muted mt-1 text-sm">{description}</p>
          </div>
        ))}
        <button className="primary settings-save" type="submit">{saving ? 'Saving…' : 'Save assumptions'}</button>
      </fieldset>
      {error && <p className="error mt-3" role="alert">{error}</p>}
      {notice && <p className="notice mt-3" role="status">{notice}</p>}
    </form>
  );
}

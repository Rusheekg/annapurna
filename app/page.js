'use client';

import { useEffect, useState } from 'react';
import { allergens, foods, storageLabels } from '../lib/listings';

const roles = { donor: 'Donor', receiver: 'Receiver', volunteer: 'Volunteer' };
const selectionKey = 'annapurna.selection';

async function readJson(url, options) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Request failed.');
  return data;
}

function DonorListings({ donorId, kgPerMeal }) {
  const [listings, setListings] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let loading = false;
    async function refresh() {
      if (loading) return;
      loading = true;
      try {
        const data = await readJson('/api/listings?donorId=' + donorId, { signal: controller.signal });
        if (controller.signal.aborted) return;
        setListings(data);
        setLoaded(true);
        setError('');
      } catch (failure) {
        if (!controller.signal.aborted) setError(failure.message);
      } finally {
        loading = false;
      }
    }
    refresh();
    const timer = setInterval(refresh, 5000);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [donorId, revision]);

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <PostForm donorId={donorId} kgPerMeal={kgPerMeal} onPosted={() => setRevision((value) => value + 1)} />
      <section className="panel min-w-0" aria-labelledby="listings-title">
        <h2 id="listings-title">My listings</h2>
        {error && <p className="error" role="alert">{error}</p>}
        {!loaded && !error && <p>Loading listings...</p>}
        {loaded && !listings.length && <p>No surplus posted yet.</p>}
        {listings.length > 0 && (
          <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Listings table">
            <table>
              <thead><tr><th scope="col">Food</th><th scope="col">Quantity</th><th scope="col">Pickup by</th><th scope="col">Status</th></tr></thead>
              <tbody>
                {listings.map((listing) => (
                  <tr key={listing.id}>
                    <td>
                      <strong>{listing.food_items}</strong><br />
                      <small>{listing.veg ? 'Veg' : 'Non-veg'} · {storageLabels[listing.storage]}</small>
                      {listing.allergens.length > 0 && <small className="block">Allergens: {listing.allergens.join(', ')}</small>}
                    </td>
                    <td>{listing.portions} portions<br /><small>{Number(listing.quantity_kg)} kg</small></td>
                    <td><time dateTime={listing.pickup_by}>{formatDate(listing.pickup_by)}</time></td>
                    <td><span className="status" data-status={listing.status}>{listing.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function localInputTime(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function initialForm() {
  const now = new Date();
  return {
    selectedFoods: [], extraFood: '', veg: true, portions: '', storage: 'hot',
    selectedAllergens: [], cookedAt: localInputTime(now),
    pickupBy: localInputTime(new Date(now.getTime() + 7200000)),
  };
}

function Chips({ label, options, selected, onChange }) {
  return (
    <fieldset>
      <legend>{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button key={option} type="button" className="chip" aria-pressed={selected.includes(option)}
            onClick={() => onChange(selected.includes(option)
              ? selected.filter((item) => item !== option)
              : [...selected, option])}>
            {option}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function PostForm({ donorId, kgPerMeal, onPosted }) {
  const [form, setForm] = useState(initialForm);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const update = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));

  async function post(event) {
    event.preventDefault();
    if (posting) return;
    setError('');
    setNotice('');
    const foodItems = [...form.selectedFoods, form.extraFood.trim()].filter(Boolean).join(', ');
    if (!foodItems) {
      setError('Choose a food item or enter one.');
      return;
    }
    setPosting(true);
    try {
      await readJson('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          donorId, foodItems, veg: form.veg, portions: Number(form.portions),
          storage: form.storage, allergens: form.selectedAllergens,
          cookedAt: new Date(form.cookedAt).toISOString(),
          pickupBy: new Date(form.pickupBy).toISOString(),
        }),
      });
      setForm(initialForm());
      setNotice('Surplus posted.');
      onPosted();
    } catch (failure) {
      setError(failure.message);
    } finally {
      setPosting(false);
    }
  }

  return (
    <section className="panel min-w-0" aria-labelledby="post-title">
      <h2 id="post-title">Post surplus</h2>
      <form onSubmit={post}>
        <fieldset disabled={posting} className="grid gap-4">
          <Chips label="Food items" options={foods} selected={form.selectedFoods} onChange={(value) => update('selectedFoods', value)} />
          <label>Other food items<input value={form.extraFood} maxLength={400} onChange={(event) => update('extraFood', event.target.value)} /></label>
          <div className="grid grid-cols-2 gap-3">
            <label>Food type<select value={String(form.veg)} onChange={(event) => update('veg', event.target.value === 'true')}>
              <option value="true">Veg</option><option value="false">Non-veg</option>
            </select></label>
            <label>Storage<select value={form.storage} onChange={(event) => update('storage', event.target.value)}>
              {Object.entries(storageLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select></label>
          </div>
          <label>Portions<input type="number" min="1" max="2147483647" step="1" required value={form.portions}
            onChange={(event) => update('portions', event.target.value)} />
            <small className="block">Estimated weight · <output aria-live="polite">{(Number(form.portions) * kgPerMeal).toLocaleString(undefined, { maximumFractionDigits: 3 })} kg</output></small>
          </label>
          <Chips label="Allergens" options={allergens} selected={form.selectedAllergens} onChange={(value) => update('selectedAllergens', value)} />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <label>Cooked at<input type="datetime-local" required value={form.cookedAt} onChange={(event) => update('cookedAt', event.target.value)} /></label>
            <label>Pickup by<input type="datetime-local" required value={form.pickupBy} onChange={(event) => update('pickupBy', event.target.value)} /></label>
          </div>
          <button type="submit" className="primary">{posting ? 'Posting...' : 'Post surplus'}</button>
        </fieldset>
        {error && <p className="error mt-3" role="alert">{error}</p>}
        {notice && <p className="mt-3 text-green-800" role="status">{notice}</p>}
      </form>
    </section>
  );
}

export default function Home() {
  const [people, setPeople] = useState(null);
  const [selection, setSelection] = useState({ role: 'donor', id: null });
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    readJson('/api/people', { signal: controller.signal }).then((data) => {
      if (controller.signal.aborted) return;
      let saved;
      try { saved = JSON.parse(localStorage.getItem(selectionKey)); } catch {}
      const role = saved && Object.hasOwn(roles, saved.role) ? saved.role : 'donor';
      const id = data[role].find((person) => person.id === saved?.id)?.id ?? data[role][0]?.id;
      setSelection({ role, id });
      setPeople(data);
    }).catch((failure) => {
      if (!controller.signal.aborted) setError(failure.message);
    });
    return () => controller.abort();
  }, []);

  function changeSelection(role, id) {
    const next = { role, id };
    setSelection(next);
    try { localStorage.setItem(selectionKey, JSON.stringify(next)); } catch {}
  }

  return (
    <>
      <header>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-8">
          <div className="brand">Annapurna</div>
          {people && (
            <div className="grid w-full grid-cols-[minmax(0,1fr)_minmax(0,1.7fr)] gap-3 sm:w-auto">
              <label>View as<select value={selection.role} onChange={(event) => {
                const role = event.target.value;
                changeSelection(role, people[role][0]?.id);
              }}>
                {Object.entries(roles).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select></label>
              <label>{roles[selection.role]} account<select value={selection.id ?? ''} onChange={(event) => changeSelection(selection.role, Number(event.target.value))}>
                {people[selection.role].map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
              </select></label>
            </div>
          )}
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-8">
        <h1>{roles[selection.role]} workspace</h1>
        {error && <p className="error" role="alert">{error}</p>}
        {!people && !error && <p>Loading demo accounts...</p>}
        {people && selection.role === 'donor' && selection.id && (
          <DonorListings key={selection.id} donorId={selection.id} kgPerMeal={people.kgPerMeal} />
        )}
        {people && !selection.id && <p>No demo accounts are available for this role.</p>}
        {people && selection.id && selection.role !== 'donor' && (
          <section className="panel">
            <h2>{people[selection.role].find((person) => person.id === selection.id)?.name}</h2>
            <p>{selection.role === 'receiver' ? 'Listing offers' : 'Pickup jobs'} arrive in Milestone 2.</p>
          </section>
        )}
      </main>
      <footer className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-8">Demo uses synthetic data. No real addresses or personal details.</footer>
    </>
  );
}

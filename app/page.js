'use client';

import Image from 'next/image';
import { Clock3, Tags, ShieldCheck } from 'lucide-react';
import HomeLiveFeed from '@/components/home-live-feed';
import { LiveNotificationFeed } from '@/components/ui/live-notification-feed';
import { readImpact, readWorkspaceListings } from './feed-data';
import { useEffect, useRef, useState } from 'react';
import { allergens, foods, maxPortions, storageLabels } from '../lib/listings';

const roles = { donor: 'Donor', receiver: 'Receiver', volunteer: 'Volunteer' };
const selectionKey = 'annapurna.selection';

async function readJson(url, options) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Request failed.');
  return data;
}

const deliverySteps = ['Posted', 'Claimed', 'Collected', 'Delivered'];
const timestampFields = ['created_at', 'claimed_at', 'collected_at', 'delivered_at'];
const pickupGuidance = {
  hot: 'Keep hot until handover',
  room_temp: 'Serve within about 2 hours of cooking',
  chilled: 'Keep chilled until handover',
};
const workspaceActions = {
  Claim: { action: 'claim', change: (accountId) => ({ status: 'claimed', receiver_id: accountId }) },
  'Request volunteer': { action: 'requestVolunteer', change: () => ({ pickup_method: 'volunteer' }) },
  'We’ll collect ourselves': { action: 'collectOurselves', change: () => ({ pickup_method: 'self' }) },
  Accept: { action: 'accept', change: (accountId) => ({ volunteer_id: accountId }) },
  'Mark collected': { action: 'collect', change: () => ({ status: 'collected' }) },
  'Mark delivered': { action: 'deliver', change: () => ({ status: 'delivered' }) },
};

function actionsForListing(listing, role, accountId, pickupOpen) {
  if (role === 'receiver') {
    if (listing.status === 'posted' && pickupOpen) return [{ label: 'Claim', done: 'Claimed' }];
    if (listing.receiver_id !== accountId) return [];
    if (listing.status === 'claimed' && pickupOpen && !listing.pickup_method) {
      return [{ label: 'Request volunteer' }, { label: 'We’ll collect ourselves' }];
    }
    if (listing.pickup_method !== 'self') return [];
  } else if (role === 'volunteer') {
    if (listing.status === 'claimed' && pickupOpen && !listing.volunteer_id) {
      return [{ label: 'Accept', done: 'Accepted' }];
    }
    if (listing.volunteer_id !== accountId) return [];
  } else {
    return [];
  }

  if (listing.status === 'claimed' && pickupOpen) return [{ label: 'Mark collected' }];
  if (listing.status === 'collected') return [{ label: 'Mark delivered' }];
  return [];
}

function listingNotification(listing, role, accountId, pending) {
  const expired = listing.status === 'expired';
  const pickup = new Date(listing.pickup_by);
  const minutes = Math.ceil((pickup.getTime() - Date.now()) / 60000);
  const active = listing.status === 'posted' || listing.status === 'claimed';
  const pickupLabel = `Pickup by ${formatDate(pickup)}` +
    (active ? minutes > 0 ? ` (${minutes} min left)` : ' (window closed)' : '');
  const details = [
    `${listing.portions} portions`,
    `${Number(listing.quantity_kg)} kg`,
    listing.veg ? 'Veg' : 'Non-veg',
    storageLabels[listing.storage],
    `Allergens: ${listing.allergens.join(', ') || 'None listed'}`,
    pickupLabel,
  ];
  if (role === 'receiver') {
    details.push(pickupGuidance[listing.storage]);
    if (listing.pickup_method === 'volunteer') {
      details.push(listing.volunteer_id ? 'Volunteer assigned' : 'Volunteer requested');
    }
    if (listing.pickup_method === 'self') details.push('Self pickup');
  }
  if (role === 'volunteer') {
    details.unshift(`${Number(listing.pickup_distance_km).toFixed(1)} km to pickup`,
      `Deliver to ${listing.receiver_name}`);
    if (listing.status === 'claimed' && listing.volunteer_id === accountId) details.push('Accepted');
  }
  if (pending) details.push('Saving…');

  const timeline = deliverySteps.flatMap((label, index) => {
    const value = listing[timestampFields[index]];
    return value ? [{ label, dateTime: new Date(value).toISOString(), text: formatDate(value) }] : [];
  });
  if (expired && listing.expired_at) {
    timeline.push({ label: 'Expired', dateTime: new Date(listing.expired_at).toISOString(), text: formatDate(listing.expired_at) });
  }

  return {
    id: String(listing.id),
    kind: 'delivery',
    app: listing.donor_name || 'Annapurna',
    title: listing.food_items,
    body: listing.match_reason || details.join(' · '),
    details: listing.match_reason ? details.join(' · ') : undefined,
    timeline,
    actions: pending ? [] : actionsForListing(listing, role, accountId, minutes > 0),
    status: listing.status,
    accent: active && minutes > 0 && minutes <= 30 ? 'var(--amber)' : 'var(--forest)',
    steps: expired ? ['Expired'] : deliverySteps,
    step: expired ? 0 : deliverySteps.findIndex((step) => step.toLowerCase() === listing.status),
  };
}

const workspaceFeeds = {
  donor: ['My listings', 'No surplus posted yet.'],
  receiver: ['Listing offers', 'No offers for this account yet.'],
  volunteer: ['Pickup jobs', 'No pickup jobs are available for this account.'],
};

function WorkspaceFeed({ role, accountId, revision = 0 }) {
  const [listings, setListings] = useState(null);
  const [error, setError] = useState('');
  const [actionErrors, setActionErrors] = useState({});
  const [optimistic, setOptimistic] = useState({});
  const inFlight = useRef(new Set());
  const writeVersion = useRef(0);
  const [title, empty] = workspaceFeeds[role];

  useEffect(() => {
    const controller = new AbortController();
    let loading = false;
    async function refresh() {
      if (loading) return;
      loading = true;
      const version = writeVersion.current;
      try {
        const data = role === 'donor'
          ? await readJson('/api/listings?donorId=' + accountId, { signal: controller.signal })
          : await readWorkspaceListings(role, accountId);
        if (controller.signal.aborted || version !== writeVersion.current) return;
        if (!data) throw new Error('Could not load ' + title.toLowerCase() + '.');
        setListings(data);
        setError('');
      } catch (failure) {
        if (!controller.signal.aborted && version === writeVersion.current) setError(failure.message);
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
  }, [role, accountId, revision, title]);

  async function act(id, label) {
    const { action, change } = workspaceActions[label];
    if (inFlight.current.has(id)) return;
    inFlight.current.add(id);
    writeVersion.current += 1;
    setOptimistic((previous) => ({ ...previous, [id]: change(accountId) }));
    setActionErrors((previous) => ({ ...previous, [id]: '' }));

    try {
      const listing = await readJson('/api/listings/transition', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, listingId: Number(id), accountId, role }),
      });
      setListings((previous) => previous.map((item) => item.id === listing.id ? { ...item, ...listing } : item));
    } catch (failure) {
      setActionErrors((previous) => ({
        ...previous,
        [id]: `Could not complete “${label}”. ${failure.message}`,
      }));
    } finally {
      writeVersion.current += 1;
      inFlight.current.delete(id);
      setOptimistic(({ [id]: pending, ...others }) => others);
    }
  }

  return (
    <section className="min-w-0" aria-label={title}>
      {error && <p className="error mb-3" role="alert">{error}</p>}
      {Object.entries(actionErrors).map(([id, message]) => message && (
        <p key={id} className="error mb-3" role="alert">{message}</p>
      ))}
      {listings ? (
        <LiveNotificationFeed title={title}
          items={listings.slice().reverse().map((listing) => {
            const pending = optimistic[listing.id];
            return listingNotification({ ...listing, ...pending }, role, accountId, Boolean(pending));
          })}
          onAction={act}
          emptyMessage={empty} autoplay={false} height="420px" className="workspace-feed" />
      ) : (
        <div className="panel">
          <h2>{title}</h2>
          {!error && <p className="muted">Loading…</p>}
        </div>
      )}
    </section>
  );
}

function DonorListings({ donorId, kgPerMeal }) {
  const [revision, setRevision] = useState(0);
  return (
    <div className="workspace-grid">
      <PostForm donorId={donorId} kgPerMeal={kgPerMeal} onPosted={() => setRevision((value) => value + 1)} />
      <WorkspaceFeed role="donor" accountId={donorId} revision={revision} />
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
      const listing = await readJson('/api/listings', {
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
      setNotice(listing.message ?? 'Surplus posted.');
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
          <label>Portions<input type="number" min="1" max={maxPortions} step="1" required value={form.portions}
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
        {notice && <p className="mt-3 notice" role="status">{notice}</p>}
      </form>
    </section>
  );
}

const trustItems = [
  [Clock3, 'Time-limited pickups', 'Every listing has a pickup-by countdown'],
  [Tags, 'Allergen labels', 'Shown on every listing'],
  [ShieldCheck, 'Synthetic data', 'No real addresses or people'],
];

const howItWorks = [
  ['Post', 'Hostel messes share what’s left, how many portions are available and when to pick them up.'],
  ['Match', 'Nearby shelters and community kitchens receive offers that fit their needs.'],
  ['Deliver', 'Volunteers collect the food and bring it to the receiving kitchen.'],
];

function Landing({ onPost }) {
  const [impact, setImpact] = useState(undefined);

  useEffect(() => {
    let active = true;
    readImpact().then((data) => {
      if (active) setImpact(data);
    }).catch(() => {
      if (active) setImpact(null);
    });
    return () => { active = false; };
  }, []);

  return (
    <main>
      <section className="hero" aria-labelledby="hero-title">
        <div className="container hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">Food rescue, hostel to shelter</p>
            <h1 id="hero-title">Where surplus<br className="desktop-break" />{' '}finds <em>purpose</em>.</h1>
            <p className="hero-description">Annapurna connects surplus food from hostel messes to nearby shelters and community kitchens before it spoils.</p>
            <div className="hero-actions">
              <button className="primary" onClick={onPost}>Post surplus</button>
              <a className="secondary" href="#impact">See impact</a>
            </div>
            <dl id="impact" className="stats" aria-label="Annapurna impact" tabIndex={-1}>
              {[[impact?.meals, 'Meals served'], [impact?.kg, 'Kg saved']].map(([value, label]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value == null ? '—' : Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</dd>
                </div>
              ))}
            </dl>
            {impact === null && <p className="muted mt-2" role="status">Impact totals are temporarily unavailable.</p>}
          </div>
          <div className="hero-feed">
            <span className="feed-circle" aria-hidden="true" />
            <Image className="feed-mark" src="/brand/logo-mark.png" width={120} height={120} alt="" />
            <HomeLiveFeed />
          </div>
        </div>
        <div className="gold-rule" aria-hidden="true" />
      </section>
      <section className="trust-strip" aria-label="Pickup information">
        <ul className="container trust-grid">
          {trustItems.map(([Icon, title, description]) => (
            <li key={title}>
              <Icon size={18} strokeWidth={1.5} aria-hidden="true" />
              <div><strong>{title}</strong><p>{description}</p></div>
            </li>
          ))}
        </ul>
      </section>
      <section className="container how-section" aria-labelledby="how-title">
        <h2 id="how-title">How it <em>works</em>.</h2>
        <ol className="steps-grid">
          {howItWorks.map(([title, description], index) => (
            <li key={title}>
              <span className="step-number">{String(index + 1).padStart(2, '0')}</span>
              <h3>{title}</h3><p>{description}</p>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}

export default function Home() {
  const [people, setPeople] = useState(null);
  const [selection, setSelection] = useState({ role: 'donor', id: null });
  const [showWorkspace, setShowWorkspace] = useState(false);
  const [error, setError] = useState('');
  const requestedRole = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    readJson('/api/people', { signal: controller.signal }).then((data) => {
      if (controller.signal.aborted) return;
      let saved;
      try { saved = JSON.parse(localStorage.getItem(selectionKey)); } catch {}
      setSelection((current) => {
        if (current.id !== null) return current;
        const savedRole = Object.hasOwn(roles, saved?.role) ? saved.role : current.role;
        const role = requestedRole.current ?? savedRole;
        return { role, id: data[role].find((person) => person.id === saved?.id)?.id ?? data[role][0]?.id };
      });
      setPeople(data);
    }).catch((failure) => {
      if (!controller.signal.aborted) setError(failure.message);
    });
    return () => controller.abort();
  }, []);

  function openWorkspace(role, id) {
    requestedRole.current = role;
    if (people) {
      const next = { role, id };
      setSelection(next);
      try { localStorage.setItem(selectionKey, JSON.stringify(next)); } catch {}
    }
    setShowWorkspace(true);
    window.scrollTo(0, 0);
  }

  return (
    <>
      <header>
        <p className="announcement">Synthetic demo data · Annapurna does not certify food safety</p>
        <div className="container masthead">
          <a href="/" className="brand" onClick={(event) => {
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            event.preventDefault();
            setShowWorkspace(false);
            window.scrollTo(0, 0);
          }}>
            <Image src="/brand/logo-mark.png" width={40} height={40} alt="" />
            <span>Annapurna{!showWorkspace && <small>Where surplus finds purpose.</small>}</span>
          </a>
          <div className="role-switcher">
            <label>View as<select value={showWorkspace ? selection.role : ''} onChange={(event) => {
              const role = event.target.value;
              openWorkspace(role, role === selection.role ? selection.id : people[role][0]?.id);
            }} disabled={!people}>
              <option value="" disabled>Choose a role</option>
              {Object.entries(roles).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select></label>
            {people && (
              <label>{showWorkspace ? roles[selection.role] : 'Demo'} account
                <select value={selection.id ?? ''} onChange={(event) => openWorkspace(selection.role, Number(event.target.value))}>
                  {people[selection.role].map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
                </select>
              </label>
            )}
          </div>
        </div>
      </header>
      {showWorkspace ? (
        <main className="container workspace">
          <h1>{roles[selection.role]} <em>workspace</em></h1>
          {error && <p className="error" role="alert">{error}</p>}
          {!people && !error && <p>Loading demo accounts…</p>}
          {people && !selection.id && <p>No demo accounts are available for this role.</p>}
          {people && selection.id && (selection.role === 'donor' ? (
            <DonorListings key={selection.id} donorId={selection.id} kgPerMeal={people.kgPerMeal} />
          ) : (
            <>
              <p className="eyebrow workspace-account">{people[selection.role].find((person) => person.id === selection.id)?.name}</p>
              <WorkspaceFeed key={`${selection.role}-${selection.id}`} role={selection.role} accountId={selection.id} />
            </>
          ))}
        </main>
      ) : (
        <Landing onPost={() => openWorkspace('donor', selection.role === 'donor' ? selection.id : people?.donor[0]?.id)} />
      )}
      <footer className="container site-footer">Demo uses synthetic data. No real addresses or personal details.</footer>
    </>
  );
}

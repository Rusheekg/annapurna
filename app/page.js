'use client';

import Image from 'next/image';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Clock3, Tags, ShieldCheck } from 'lucide-react';
import HomeLiveFeed from '@/components/home-live-feed';
import SiteHeader from '@/components/site-header';
import { LiveNotificationFeed } from '@/components/ui/live-notification-feed';
import { readImpact } from './feed-data';
import { listingNotification, readJson, useAccountListings, workspaceFeeds } from '@/components/account-listings';
import NotificationBell, { selectionKey } from '@/components/notification-bell';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { allergens, foods, maxPortions, safetyNotice, storageLabels } from '../lib/listings';

const NeighbourhoodMap = dynamic(() => import('@/components/neighbourhood-map'), {
  ssr: false,
  loading: () => <p className="muted mt-6" role="status">Loading map…</p>,
});

const roles = { donor: 'Donor', receiver: 'Receiver', volunteer: 'Volunteer' };

function WorkspaceFeed({ role, accountId, listingsState }) {
  const { listings, error, actionErrors, optimistic, act } = listingsState;
  const [title, empty] = workspaceFeeds[role];

  return (
    <section className="min-w-0" aria-label={title}>
      {role === 'receiver' && <p className="safety-banner mb-3">{safetyNotice}</p>}
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

function DonorListings({ donorId, kgPerMeal, listingsState, onPosted }) {
  return (
    <div className="workspace-grid">
      <PostForm donorId={donorId} kgPerMeal={kgPerMeal} onPosted={onPosted} />
      <WorkspaceFeed role="donor" accountId={donorId} listingsState={listingsState} />
    </div>
  );
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

function repeatForm(listing) {
  const foodItems = listing.food_items.split(', ');
  const selectedFoods = [];
  while (foods.includes(foodItems[0]) && !selectedFoods.includes(foodItems[0])) {
    selectedFoods.push(foodItems.shift());
  }
  return {
    ...initialForm(),
    selectedFoods,
    extraFood: foodItems.join(', '),
    veg: listing.veg,
    portions: String(listing.portions),
    storage: listing.storage,
    selectedAllergens: listing.allergens,
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
  const [repeating, setRepeating] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const update = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));

  async function repeatLastPost() {
    setError('');
    setNotice('');
    setRepeating(true);
    try {
      const [listing] = await readJson('/api/listings?donorId=' + donorId);
      if (listing) setForm(repeatForm(listing));
      setNotice(listing ? 'Last post copied. Review the details and pickup times before posting.' : 'No previous post to repeat.');
    } catch (failure) {
      setError(failure.message);
    } finally {
      setRepeating(false);
    }
  }

  async function post(event) {
    event.preventDefault();
    if (posting || repeating) return;
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
      <button type="button" className="secondary mb-4" disabled={posting || repeating} onClick={repeatLastPost}>
        {repeating ? 'Loading last post…' : "Repeat yesterday's post"}
      </button>
      <form onSubmit={post}>
        <fieldset disabled={posting || repeating} className="grid gap-4">
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
              <Link className="secondary" href="/impact">See impact</Link>
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
          <div className="hero-emblem">
            <Image src="/brand/logo-mark.png" width={320} height={320} alt="" loading="eager" />
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
        <div>
          <h2 id="how-title">How it <em>works</em>.</h2>
          <ol className="how-steps" role="list">
            {howItWorks.map(([title, description]) => (
              <li key={title}>
                <h3>{title}</h3><p>{description}</p>
              </li>
            ))}
          </ol>
        </div>
        <div className="how-feed">
          <p className="eyebrow">Right now, live near you</p>
          <HomeLiveFeed />
        </div>
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
  const focusControl = useRef(null);

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

  function openWorkspace(role, id, control) {
    requestedRole.current = role;
    if (people) {
      if (control && control === document.activeElement && (role !== selection.role || id !== selection.id)) {
        focusControl.current = control.name;
      }
      const next = { role, id };
      setSelection(next);
      try { localStorage.setItem(selectionKey, JSON.stringify(next)); } catch {}
    }
    setShowWorkspace(true);
    window.scrollTo(0, 0);
  }

  return <AccountView key={`${selection.role}:${selection.id}`} {...{
    people, selection, showWorkspace, setShowWorkspace, error, openWorkspace, focusControl,
  }} />;
}

function AccountView({ people, selection, showWorkspace, setShowWorkspace, error, openWorkspace, focusControl }) {
  const [revision, setRevision] = useState(0);
  const listingsState = useAccountListings(selection.role, selection.id, revision);
  const controls = useRef(null);

  useLayoutEffect(() => {
    if (!focusControl.current) return;
    controls.current?.querySelector(`select[name="${focusControl.current}"]`)?.focus({ preventScroll: true });
    focusControl.current = null;
  }, [focusControl]);

  return (
    <>
      <SiteHeader tagline={!showWorkspace} notificationBell={
        <NotificationBell role={selection.role} accountId={selection.id} listingsState={listingsState} loading={!people && !error} />
      } onBrandClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        setShowWorkspace(false);
        window.scrollTo(0, 0);
      }}>
        <div className="role-switcher" ref={controls}>
          <label>View as<select name="role" value={showWorkspace ? selection.role : ''} onChange={(event) => {
            const role = event.target.value;
            openWorkspace(role, role === selection.role ? selection.id : people[role][0]?.id, event.currentTarget);
          }} disabled={!people}>
            <option value="" disabled>Choose a role</option>
            {Object.entries(roles).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select></label>
          {people && (
            <label>{showWorkspace ? roles[selection.role] : 'Demo'} account
              <select name="account" value={selection.id ?? ''} onChange={(event) => openWorkspace(selection.role, Number(event.target.value), event.currentTarget)}>
                {people[selection.role].map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
              </select>
            </label>
          )}
        </div>
      </SiteHeader>
      {showWorkspace ? (
        <main className="container workspace">
          <h1>{roles[selection.role]} <em>workspace</em></h1>
          {error && <p className="error" role="alert">{error}</p>}
          {!people && !error && <p>Loading demo accounts…</p>}
          {people && !selection.id && <p>No demo accounts are available for this role.</p>}
          {people && selection.id && (selection.role === 'donor' ? (
            <DonorListings donorId={selection.id} kgPerMeal={people.kgPerMeal} listingsState={listingsState}
              onPosted={() => setRevision((value) => value + 1)} />
          ) : (
            <>
              <p className="eyebrow workspace-account">{people[selection.role].find((person) => person.id === selection.id)?.name}</p>
              <WorkspaceFeed role={selection.role} accountId={selection.id} listingsState={listingsState} />
            </>
          ))}
          {people && selection.id && <NeighbourhoodMap key={selection.role === 'volunteer' ? selection.id : 'all'}
            volunteerId={selection.role === 'volunteer' ? selection.id : null} />}
        </main>
      ) : (
        <Landing onPost={() => openWorkspace('donor', selection.role === 'donor' ? selection.id : people?.donor[0]?.id)} />
      )}
    </>
  );
}

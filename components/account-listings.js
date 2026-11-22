'use client';

import { useEffect, useRef, useState } from 'react';
import { readWorkspaceListings } from '@/app/feed-data';
import { handlingGuidance, minutesUntil, safetyNotice, storageLabels } from '@/lib/listings';
import { networkError, readJson } from '@/lib/client-requests';

const deliverySteps = ['Posted', 'Claimed', 'Collected', 'Delivered'];
const timestampFields = ['created_at', 'claimed_at', 'collected_at', 'delivered_at'];
const workspaceActions = {
  Claim: { action: 'claim', change: (accountId) => ({ status: 'claimed', receiver_id: accountId }) },
  'Request volunteer': { action: 'requestVolunteer', change: () => ({ pickup_method: 'volunteer' }) },
  'We’ll collect ourselves': { action: 'collectOurselves', change: () => ({ pickup_method: 'self' }) },
  Accept: { action: 'accept', change: (accountId) => ({ volunteer_id: accountId }) },
  'Mark collected': { action: 'collect', change: () => ({ status: 'collected' }) },
  'Mark delivered': { action: 'deliver', change: () => ({ status: 'delivered' }) },
};

const pendingLabels = {
  Claim: 'Claiming…',
  'Request volunteer': 'Requesting…',
  'We’ll collect ourselves': 'Saving…',
  Accept: 'Accepting…',
  'Mark collected': 'Marking collected…',
  'Mark delivered': 'Marking delivered…',
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

export function listingNotification(listing, role, accountId, pending) {
  const expired = listing.status === 'expired';
  const pickup = new Date(listing.pickup_by);
  const minutes = minutesUntil(listing.pickup_by);
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
    handlingGuidance(listing.storage, listing.cooked_at, active),
  ];
  if (role === 'receiver') {
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
    safetyNotice,
    warning: expired ? 'Expired — do not send this food.' : undefined,
    priority: role === 'volunteer' && listing.priority_pickup && !listing.volunteer_id && listing.status === 'claimed'
      ? 'Priority pickup' : undefined,
    timeline,
    actions: pending ? pending.actions.map((action) => ({
      ...action,
      disabled: true,
      pendingText: action.label === pending.label ? pendingLabels[pending.label] : undefined,
    })) : actionsForListing(listing, role, accountId, minutes > 0),
    status: listing.status,
    accent: active && minutes > 0 && minutes <= 30 ? 'var(--amber)' : 'var(--forest)',
    steps: expired ? ['Expired'] : deliverySteps,
    step: expired ? 0 : deliverySteps.findIndex((step) => step.toLowerCase() === listing.status),
  };
}

export const workspaceFeeds = {
  donor: ['My listings', 'No surplus posted yet.'],
  receiver: ['Listing offers', 'No offers for this account yet.'],
  volunteer: ['Pickup jobs', 'No assigned jobs or open pickups within 5 km.'],
};

export function useAccountListings(role, accountId, revision = 0) {
  const [listings, setListings] = useState(null);
  const [error, setError] = useState('');
  const [actionErrors, setActionErrors] = useState({});
  const [optimistic, setOptimistic] = useState({});
  const [refreshVersion, refresh] = useState(0);
  const inFlight = useRef(new Set());
  const hasLoaded = useRef(false);
  const writeVersion = useRef(0);

  useEffect(() => {
    if (!accountId) return;
    const controller = new AbortController();
    let loading = false;
    async function refresh() {
      if (loading || !navigator.onLine) return;
      loading = true;
      const version = writeVersion.current;
      try {
        const data = role === 'donor'
          ? await readJson('/api/listings?donorId=' + accountId, { signal: controller.signal })
          : await readWorkspaceListings(role, accountId);
        if (controller.signal.aborted || version !== writeVersion.current) return;
        if (data?.error) throw data.error;
        if (!data) throw networkError();
        hasLoaded.current = true;
        setListings(data);
        setError('');
      } catch (failure) {
        if (!controller.signal.aborted && version === writeVersion.current && navigator.onLine &&
            (!hasLoaded.current || failure.code === 'NOT_FOUND')) {
          setError(failure.code ? failure : networkError());
        }
      } finally {
        loading = false;
      }
    }
    refresh();
    const timer = setInterval(refresh, 5000);
    window.addEventListener('online', refresh);
    return () => {
      controller.abort();
      clearInterval(timer);
      window.removeEventListener('online', refresh);
    };
  }, [role, accountId, revision, refreshVersion]);

  async function act(id, label) {
    const { action, change } = workspaceActions[label];
    if (inFlight.current.has(id)) return;
    inFlight.current.add(id);
    writeVersion.current += 1;
    const current = listings?.find((item) => String(item.id) === id);
    if (current) {
      setOptimistic((previous) => ({
        ...previous,
        [id]: { change: change(accountId), label, actions: actionsForListing(current, role, accountId, true) },
      }));
    }
    setActionErrors(({ [id]: previousError, ...remaining }) => remaining);

    try {
      const listing = await readJson('/api/listings/transition', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, listingId: Number(id), accountId, role }),
      });
      setListings((previous) => previous.map((item) => item.id === listing.id ? { ...item, ...listing } : item));
      return true;
    } catch (failure) {
      setActionErrors((previous) => ({
        ...previous,
        [id]: { error: failure.code ? failure : networkError(true), label },
      }));
    } finally {
      writeVersion.current += 1;
      inFlight.current.delete(id);
      setOptimistic(({ [id]: pending, ...others }) => others);
    }
  }

  return { listings, error, actionErrors, optimistic, act, retry: () => refresh((value) => value + 1) };
}

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

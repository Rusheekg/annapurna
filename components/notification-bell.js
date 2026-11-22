'use client';

import { Bell, X } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { listingNotification, useAccountListings } from './account-listings';
import { LiveNotificationFeed } from './ui/live-notification-feed';
import { FeedSkeleton, RequestError } from './request-feedback';

function readStoredIds(key) {
  try {
    const ids = JSON.parse(localStorage.getItem(key));
    if (Array.isArray(ids)) return new Set(ids.filter((id) => typeof id === 'string'));
  } catch {}
  return new Set();
}

function statusTime(listing) {
  return listing[`${listing.status}_at`] ?? listing.created_at;
}

const roleOrder = ['donor', 'receiver', 'volunteer'];

// One bell for the whole account: sources maps each of the user's records to its listings state.
export default function NotificationBell({ userId, sources }) {
  const storageKey = `annapurna.notifications.read.${userId}`;
  const [readIds, setReadIds] = useState(() => readStoredIds(storageKey));
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const id = useId();
  const root = useRef(null);
  const trigger = useRef(null);
  const closeButton = useRef(null);
  const icon = useRef(null);
  const seen = useRef(null);
  const latestReadIds = useRef(readIds);
  const active = roleOrder.filter((role) => sources[role]);
  const loaded = active.some((role) => sources[role].listings);
  const error = active.map((role) => sources[role].error).find(Boolean) || '';
  const actionErrors = Object.fromEntries(active.flatMap((role) => Object.entries(sources[role].actionErrors)
    .map(([id, failure]) => [`${role}:${id}`, failure])));
  const retry = () => active.forEach((role) => sources[role].retry());

  const { items, targets } = useMemo(() => {
    const targets = {};
    const items = roleOrder.flatMap((role) => {
      const source = sources[role];
      if (!source?.listings) return [];
      const visible = source.listings.filter(({ status }) => {
        if (role === 'receiver') return status === 'posted';
        if (role === 'volunteer') return status === 'claimed' || status === 'collected';
        return true;
      });
      // The feed takes oldest first. Volunteer jobs retain the workspace's priority order.
      if (role === 'donor') visible.sort((a, b) => Date.parse(statusTime(a)) - Date.parse(statusTime(b)));
      else visible.reverse();
      return visible.map((listing) => {
        const pending = source.optimistic[listing.id];
        const item = listingNotification({ ...listing, ...pending?.change }, role, source.accountId, pending);
        item.id = role === 'donor' ? `donor:${listing.id}:${listing.status}` : `${role}:${listing.id}`;
        targets[item.id] = { role, listingId: String(listing.id) };
        return item;
      });
    });
    return { items, targets };
  }, [sources]);
  const unread = items.filter((item) => !readIds.has(item.id)).length;

  useEffect(() => {
    if (!loaded) return;
    const previous = seen.current;
    const next = new Set(previous);
    for (const { id } of items) next.add(id);
    seen.current = next;
    if (!previous || next.size === previous.size || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    icon.current?.animate(
      [0, 16, -12, 7, -3, 0].map((angle) => ({ transform: `rotate(${angle}deg)` })),
      { duration: 650, easing: 'ease-out' },
    );
  }, [items, loaded]);

  function markRead(ids) {
    const next = new Set([...latestReadIds.current, ...ids]);
    if (next.size === latestReadIds.current.size) return;
    latestReadIds.current = next;
    setReadIds(next);
    try { localStorage.setItem(storageKey, JSON.stringify([...next])); } catch {}
  }

  function close() {
    setOpen(false);
    trigger.current?.focus({ preventScroll: true });
  }

  useEffect(() => {
    if (!open) return;
    closeButton.current?.focus({ preventScroll: true });
    function onClick(event) {
      if (!root.current?.contains(event.target)) close();
    }
    function onKeyDown(event) {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      close();
    }
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  async function actFromBell(itemId, label) {
    const { role, listingId } = targets[itemId] ?? { role: itemId.split(':')[0], listingId: itemId.split(':')[1] };
    closeButton.current?.focus({ preventScroll: true });
    setNotice('');
    if (await sources[role].act(listingId, label) && label === 'Claim') {
      setNotice('Offer claimed. Choose how to collect it in Receive.');
    }
  }

  const closeControl = (
    <button type="button" ref={closeButton} className="notification-close" aria-label="Close notifications" onClick={close}>
      <X size={18} strokeWidth={1.5} aria-hidden="true" />
    </button>
  );

  return (
    <div className="notification-bell" ref={root}>
      <button type="button" ref={trigger} className="notification-trigger" aria-haspopup="dialog"
        aria-expanded={open} aria-controls={id} aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        onClick={() => open ? close() : setOpen(true)}>
        <Bell ref={icon} size={20} strokeWidth={1.5} aria-hidden="true" />
        {unread > 0 && <span className="notification-badge" aria-hidden="true">{unread > 99 ? '99+' : unread}</span>}
      </button>
      {open && (
        <div id={id} className="notification-panel" role="dialog" aria-label="Notifications">
          <RequestError error={error} retry={retry} />
          {Object.entries(actionErrors).map(([key, failure]) => failure && (
            <RequestError key={key} error={failure.error} retry={() => actFromBell(key, failure.label)} />
          ))}
          {notice && <p className="notice notification-feedback" role="status">{notice}</p>}
          {!loaded && !error ? <FeedSkeleton title="Notifications" bell action={closeControl} /> :
          <LiveNotificationFeed items={items} readIds={readIds} onRead={markRead}
            onAction={actFromBell} dismissible={false} className="notification-panel-feed"
            height="min(420px, calc(70dvh - 70px))"
            emptyMessage="New notifications will appear here."
            headerAction={closeControl} />}
        </div>
      )}
    </div>
  );
}

// The three listing feeds a signed-in user can have. A feed without a record stays idle.
export function useAccountSources(accounts, revision = 0) {
  const donor = useAccountListings('donor', accounts.donor, revision);
  const receiver = useAccountListings('receiver', accounts.receiver);
  const volunteer = useAccountListings('volunteer', accounts.volunteer);
  const states = { donor, receiver, volunteer };
  return Object.fromEntries(Object.entries(states).filter(([role]) => accounts[role])
    .map(([role, state]) => [role, { ...state, accountId: accounts[role] }]));
}

export function AccountBell({ userId, accounts }) {
  return <NotificationBell userId={userId} sources={useAccountSources(accounts)} />;
}

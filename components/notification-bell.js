'use client';

import { Bell, X } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { validId } from '@/lib/listings';
import { listingNotification, readJson, useAccountListings } from './account-listings';
import { LiveNotificationFeed } from './ui/live-notification-feed';

export const selectionKey = 'annapurna.selection';
const roles = ['donor', 'receiver', 'volunteer'];

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

export default function NotificationBell({ role, accountId, listingsState, loading }) {
  const storageKey = `annapurna.notifications.read.${role}.${accountId}`;
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
  const { listings, error, actionErrors, optimistic, act } = listingsState;

  const items = useMemo(() => {
    if (!listings) return [];
    const visible = listings.filter(({ status }) => {
      if (role === 'receiver') return status === 'posted';
      if (role === 'volunteer') return status === 'claimed' || status === 'collected';
      return true;
    });
    // The feed takes oldest first. Volunteer jobs retain the workspace's priority order.
    if (role === 'donor') visible.sort((a, b) => Date.parse(statusTime(a)) - Date.parse(statusTime(b)));
    else visible.reverse();
    return visible.map((listing) => {
      const pending = optimistic[listing.id];
      const item = listingNotification({ ...listing, ...pending }, role, accountId, Boolean(pending));
      if (role === 'donor') item.id = `${listing.id}:${listing.status}`;
      return item;
    });
  }, [listings, role, accountId, optimistic]);
  const unread = items.filter((item) => !readIds.has(item.id)).length;

  useEffect(() => {
    if (!listings) return;
    const previous = seen.current;
    const next = new Set(previous);
    for (const { id } of items) next.add(id);
    seen.current = next;
    if (!previous || next.size === previous.size || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    icon.current?.animate(
      [0, 16, -12, 7, -3, 0].map((angle) => ({ transform: `rotate(${angle}deg)` })),
      { duration: 650, easing: 'ease-out' },
    );
  }, [items, listings]);

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

  async function actFromBell(listingId, label) {
    closeButton.current?.focus({ preventScroll: true });
    setNotice('');
    if (await act(listingId, label) && label === 'Claim') {
      setNotice('Offer claimed. Choose how to collect it in the receiver workspace.');
    }
  }

  return (
    <div className="notification-bell" ref={root}>
      <button type="button" ref={trigger} className="notification-trigger" aria-haspopup="dialog"
        disabled={loading}
        aria-expanded={open} aria-controls={id} aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        onClick={() => open ? close() : setOpen(true)}>
        <Bell ref={icon} size={20} strokeWidth={1.5} aria-hidden="true" />
        {unread > 0 && <span className="notification-badge" aria-hidden="true">{unread > 99 ? '99+' : unread}</span>}
      </button>
      {open && (
        <div id={id} className="notification-panel" role="dialog" aria-label="Notifications">
          {error && <p className="error notification-feedback" role="alert">{error}</p>}
          {Object.entries(actionErrors).map(([key, message]) => message && (
            <p className="error notification-feedback" key={key} role="alert">{message}</p>
          ))}
          {notice && <p className="notice notification-feedback" role="status">{notice}</p>}
          <LiveNotificationFeed items={items} readIds={readIds} onRead={markRead}
            onAction={actFromBell} dismissible={false} className="notification-panel-feed"
            height="min(420px, calc(70dvh - 70px))"
            emptyMessage={!accountId ? 'Choose a demo account to see notifications.' :
              !listings && !error ? 'Loading notifications…' : 'New notifications will appear here.'}
            headerAction={
              <button type="button" ref={closeButton} className="notification-close" aria-label="Close notifications" onClick={close}>
                <X size={18} strokeWidth={1.5} aria-hidden="true" />
              </button>
            } />
        </div>
      )}
    </div>
  );
}

function AccountBell({ selection, loading }) {
  const { role, id } = selection;
  const listingsState = useAccountListings(role, id);
  return <NotificationBell role={role} accountId={id} listingsState={listingsState} loading={loading} />;
}

export function SavedAccountBell() {
  const [selection, setSelection] = useState({ role: 'donor', id: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(selectionKey));
      if (roles.includes(saved?.role) && validId(saved.id)) {
        setSelection(saved);
        setLoading(false);
        return;
      }
    } catch {}

    const controller = new AbortController();
    readJson('/api/people', { signal: controller.signal }).then(({ donor }) => {
      if (!controller.signal.aborted) setSelection({ role: 'donor', id: donor[0]?.id });
    }).catch(() => {}).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, []);

  return <AccountBell key={`${selection.role}:${selection.id}`} selection={selection} loading={loading} />;
}

import { LoaderCircle } from 'lucide-react';

export function Pending({ children }) {
  return <><LoaderCircle size={16} className="pending-spinner" aria-hidden="true" />{children}</>;
}

export function RequestError({ error, retry, id }) {
  if (!error) return null;
  return (
    <div id={id} className="error request-error" role="alert">
      <span>{error.message}</span>
      {error.code === 'SERVER_UNAVAILABLE' && retry &&
        <button type="button" className="secondary" onClick={retry}>Retry</button>}
    </div>
  );
}

export function FeedSkeleton({ title, bell = false, action }) {
  return (
    <div className={bell ? 'notification-panel-feed feed-skeleton bell-skeleton' : 'workspace-feed feed-skeleton'} aria-busy="true">
      <span className="sr-only" role="status">Loading {title.toLowerCase()}…</span>
      <div className="skeleton-feed-header">
        <h2 className="notification-feed-title">{title}</h2>
        {action ?? <span className="skeleton skeleton-control" aria-hidden="true" />}
      </div>
      <div className="skeleton-feed-list" aria-hidden="true">
        {[0, 1].map((card) => (
          <div className="skeleton-feed-card" key={card}>
            <span className="skeleton skeleton-tile" />
            <div className="grid gap-3">
              <span className="skeleton h-3 w-1/3" />
              <span className="skeleton h-4 w-2/3" />
              <span className="skeleton h-3 w-full" />
              <span className="skeleton h-8 w-4/5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

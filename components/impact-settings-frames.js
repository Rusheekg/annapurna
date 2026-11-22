import Link from 'next/link';
import SiteHeader from './site-header';

export function ImpactFrame({ children }) {
  return (
    <>
      <SiteHeader page="impact" />
      <main className="container workspace">
        <p className="eyebrow mb-3">All-time impact</p>
        <div className="section-heading">
          <h1>Food <em>rescued</em>.</h1>
          <Link className="secondary" href="/settings">Edit assumptions</Link>
        </div>
        {children}
      </main>
    </>
  );
}

export function SettingsFrame({ children }) {
  return (
    <>
      <SiteHeader page="settings" />
      <main className="container workspace">
        <p className="eyebrow mb-3">Settings</p>
        <h1>Impact <em>assumptions</em>.</h1>
        {children}
      </main>
    </>
  );
}

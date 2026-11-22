import Image from 'next/image';
import Link from 'next/link';
import { SavedAccountBell } from './notification-bell';

export default function SiteHeader({ page, tagline, onBrandClick, notificationBell, children }) {
  return (
    <header>
      <p className="announcement">Synthetic demo data · Annapurna does not certify food safety</p>
      <div className="container masthead">
        <Link href="/" className="brand" onClick={onBrandClick}>
          <Image src="/brand/logo-mark.png" width={40} height={40} alt="" />
          <span>Annapurna{tagline && <small>Where surplus finds purpose.</small>}</span>
        </Link>
        <nav className="site-nav" aria-label="Main navigation">
          <Link href="/impact" aria-current={page === 'impact' ? 'page' : undefined}>Impact</Link>
          <Link href="/settings" aria-current={page === 'settings' ? 'page' : undefined}>Settings</Link>
        </nav>
        <div className="header-controls">
          {notificationBell ?? <SavedAccountBell />}
          {children}
        </div>
      </div>
    </header>
  );
}

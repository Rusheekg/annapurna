import Image from 'next/image';
import Link from 'next/link';
import { AccountBell } from './notification-bell';
import { signOut } from '@/app/auth-actions';

export default function SiteHeader({ page, tagline, notificationBell, signedIn = false, profile, demo = false }) {
  return (
    <header>
      <p className="announcement">{demo ? 'Synthetic demo data · ' : ''}Annapurna does not certify food safety</p>
      <div className="container masthead">
        <Link href="/" className="brand">
          <Image src="/brand/logo-mark.png" width={40} height={40} alt="" />
          <span>Annapurna{tagline && <small>Where surplus finds purpose.</small>}</span>
        </Link>
        <nav className="site-nav" aria-label="Main navigation">
          <Link href="/impact" aria-current={page === 'impact' ? 'page' : undefined}>Impact</Link>
          <Link href="/settings" aria-current={page === 'settings' ? 'page' : undefined}>Settings</Link>
          {profile && <Link href="/workspace" aria-current={page === 'workspace' ? 'page' : undefined}>Workspace</Link>}
        </nav>
        <div className="header-controls">
          {profile && (notificationBell ?? <AccountBell selection={profile} />)}
          {signedIn ? <form action={signOut}><button type="submit" className="header-session">Sign out</button></form>
            : <Link href="/login" className="header-session">Sign in</Link>}
        </div>
      </div>
    </header>
  );
}

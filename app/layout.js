import './globals.css';
import Link from 'next/link';
import OfflineBanner from '@/components/offline-banner';
import { fontClasses } from './fonts';
import { demoEnabled } from '@/lib/onboarding';

const siteTitle = 'Annapurna · Where surplus finds purpose';

export const metadata = {
  metadataBase: new URL('https://annapurna-ebon-rho.vercel.app'),
  title: { default: siteTitle, template: '%s · Annapurna' },
  openGraph: { siteName: 'Annapurna', title: siteTitle, type: 'website' },
  twitter: { card: 'summary_large_image', title: siteTitle },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={fontClasses}>
      <body>
        <OfflineBanner />
        {children}
        <footer className="container site-footer">
          {demoEnabled() && <p>The seeded organisations and listings use synthetic data.</p>}
          <p>
            <Link href="/privacy">Privacy</Link> · <Link href="/terms">Terms</Link> ·{' '}
            <a href="mailto:annapurnasurplus@gmail.com">annapurnasurplus@gmail.com</a>
          </p>
        </footer>
      </body>
    </html>
  );
}

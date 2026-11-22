import './globals.css';
import OfflineBanner from '@/components/offline-banner';
import { fontClasses } from './fonts';
import { demoEnabled } from '@/lib/onboarding';

export const metadata = {
  title: 'Annapurna · Where surplus finds purpose',
  description: 'Connect campus food donors with nearby community kitchens, shelters, and NGOs.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={fontClasses}>
      <body>
        <OfflineBanner />
        {children}
        {demoEnabled() && <footer className="container site-footer">The seeded organisations and listings use synthetic data.</footer>}
      </body>
    </html>
  );
}

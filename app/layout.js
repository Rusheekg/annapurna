import './globals.css';
import OfflineBanner from '@/components/offline-banner';
import { fontClasses } from './fonts';

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
        <footer className="container site-footer">Demo uses synthetic data. No real addresses or personal details.</footer>
      </body>
    </html>
  );
}

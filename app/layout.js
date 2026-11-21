import './globals.css';
import { DM_Sans, Playfair_Display } from 'next/font/google';

const bodyFont = DM_Sans({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-body' });
const headingFont = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '500'],
  style: ['normal', 'italic'],
  variable: '--font-heading',
});

export const metadata = {
  title: 'Annapurna · Where surplus finds purpose',
  description: 'Connect campus food donors with nearby community kitchens, shelters, and NGOs.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${bodyFont.variable} ${headingFont.variable}`}>
      <body>{children}</body>
    </html>
  );
}

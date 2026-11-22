import { DM_Sans, Great_Vibes, Playfair_Display } from 'next/font/google';

const bodyFont = DM_Sans({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-body' });
const headingFont = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '500'],
  style: ['normal', 'italic'],
  variable: '--font-heading',
});

// Script font for one line on the sign-in pages only.
const scriptFont = Great_Vibes({ subsets: ['latin'], weight: '400', variable: '--font-script' });

export const fontClasses = `${bodyFont.variable} ${headingFont.variable} ${scriptFont.variable}`;

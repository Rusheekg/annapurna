import { DM_Sans, Playfair_Display } from 'next/font/google';

const bodyFont = DM_Sans({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-body' });
const headingFont = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '500'],
  style: ['normal', 'italic'],
  variable: '--font-heading',
});

export const fontClasses = `${bodyFont.variable} ${headingFont.variable}`;

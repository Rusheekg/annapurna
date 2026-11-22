'use client';

import './globals.css';
import ErrorPage from '@/components/error-page';
import { fontClasses } from './fonts';

export default function GlobalError({ reset }) {
  return <html lang="en" className={fontClasses}><body><ErrorPage reset={reset} /></body></html>;
}

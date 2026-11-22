import SiteHeader from '@/components/site-header';
import { demoEnabled } from '@/lib/onboarding';

export const lastUpdated = '22 November 2026';
export const contactEmail = 'annapurnasurplus@gmail.com';

// Shared shell for the public Privacy and Terms pages. Static, so it opens without signing in.
export default function LegalPage({ eyebrow, title, children }) {
  return (
    <>
      <SiteHeader demo={demoEnabled()} />
      <main>
        <section className="legal-hero">
          <div className="container">
            <p className="eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
            <p>Last updated: {lastUpdated}</p>
          </div>
        </section>
        <article className="container legal-body">{children}</article>
      </main>
    </>
  );
}

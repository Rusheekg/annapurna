import Image from 'next/image';
import Link from 'next/link';

const leaf = 'M0 24C0 8 10 0 24 0c0 16-8 26-24 24Z';

// Two-column sign-in layout: brand on the left (stacked on mobile), the page content on the right. Decoration is aria-hidden.
export function AuthLayout({ children }) {
  return (
    <main className="auth-page">
      <svg className="auth-wave" viewBox="0 0 1440 900" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <path d="M0 640C220 560 380 720 620 680S1050 520 1440 600V900H0Z" fill="#7A9A6A" opacity=".16" />
        <path d="M0 740C260 680 460 800 700 760S1120 650 1440 720V900H0Z" fill="#7A9A6A" opacity=".18" />
        <path d="M900 0C1000 120 1200 120 1440 60V0Z" fill="#7A9A6A" opacity=".14" />
      </svg>
      <svg className="auth-leaves" viewBox="0 0 600 600" aria-hidden="true" focusable="false">
        <g fill="#7A9A6A" opacity=".35"><path transform="translate(60 80) rotate(30) scale(2.2)" d={leaf} />
          <path transform="translate(140 40) rotate(70) scale(1.5)" d={leaf} />
          <path transform="translate(40 190) rotate(-10) scale(1.4)" d={leaf} /></g>
        <g fill="#22392B" opacity=".12"><path transform="translate(460 420) rotate(200) scale(2)" d={leaf} />
          <path transform="translate(520 330) rotate(160) scale(1.3)" d={leaf} /></g>
      </svg>
      <svg className="auth-lotus" viewBox="0 0 200 120" aria-hidden="true" focusable="false" fill="none" stroke="#7A9A6A" strokeWidth="1.5">
        <path d="M100 20C80 45 80 80 100 105C120 80 120 45 100 20Z" />
        <path d="M100 105C70 100 50 75 52 45C75 55 92 80 100 105Z" />
        <path d="M100 105C130 100 150 75 148 45C125 55 108 80 100 105Z" />
        <path d="M100 105C60 108 25 90 14 60C45 62 80 78 100 105Z" />
        <path d="M100 105C140 108 175 90 186 60C155 62 120 78 100 105Z" />
      </svg>
      <div className="auth-brand">
        <Link href="/" aria-label="Annapurna home"><Image src="/brand/logo-mark.png" width={96} height={96} alt="" priority /></Link>
        <p className="auth-wordmark">Annapurna</p>
        <div className="auth-tagline"><span aria-hidden="true" /><p>Where surplus finds purpose.</p><span aria-hidden="true" /></div>
        <p className="auth-script"><span>Reduce Food Waste.</span><span>Feed Communities.</span></p>
        <svg className="auth-swoosh" viewBox="0 0 320 20" aria-hidden="true" focusable="false" fill="none">
          <path d="M4 14C70 4 150 2 316 8" stroke="#C9973B" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>
      {children}
    </main>
  );
}

// The white rounded card every auth screen uses, with its heading.
export function AuthCard({ title, children }) {
  return (
    <div className="auth-card auth-form">
      <h1 className="auth-heading">{title}</h1>
      {children}
    </div>
  );
}

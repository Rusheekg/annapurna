import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const alt = 'Annapurna logo with the tagline "Where surplus finds purpose."';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OpenGraphImage() {
  const [logo, playfair, dmSans] = await Promise.all([
    readFile(join(process.cwd(), 'public/brand/logo-mark.png')),
    readFile(join(process.cwd(), 'assets/fonts/playfair-display-latin-500-normal.woff')),
    readFile(join(process.cwd(), 'assets/fonts/dm-sans-latin-400-normal.woff')),
  ]);
  const logoSrc = `data:image/png;base64,${logo.toString('base64')}`;
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 72, background: '#ECEBE3' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 340, height: 340, borderRadius: 999, border: '2px solid #C9973B' }}>
          <img src={logoSrc} width={300} height={300} alt="" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontFamily: 'Playfair Display', fontSize: 120, lineHeight: 1.05, letterSpacing: '-0.01em', color: '#22392B' }}>Annapurna</div>
          <div style={{ width: 96, height: 3, background: '#C9973B', margin: '28px 0' }} />
          <div style={{ fontFamily: 'DM Sans', fontSize: 40, color: '#22392B' }}>Where surplus finds purpose.</div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Playfair Display', data: playfair, style: 'normal', weight: 500 },
        { name: 'DM Sans', data: dmSans, style: 'normal', weight: 400 },
      ],
    },
  );
}

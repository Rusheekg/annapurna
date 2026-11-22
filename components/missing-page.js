import Image from 'next/image';
import Link from 'next/link';

export default function MissingPage() {
  return (
    <main className="container workspace fallback-page">
      <Image src="/brand/logo-mark.png" width={104} height={104} alt="" />
      <h1>This plate is <em>empty</em>.</h1>
      <p className="muted">We couldn't find the page, listing, or account you were looking for.</p>
      <div className="fallback-actions">
        <Link href="/" className="secondary">Back to home</Link>
        <Link href="/?view=donor" className="primary">Post surplus</Link>
      </div>
    </main>
  );
}

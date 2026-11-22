'use client';

export default function ErrorPage({ reset }) {
  return (
    <main className="container workspace fallback-page">
      <h1 role="alert">Something went <em>wrong</em> on our side.</h1>
      <button type="button" className="primary" onClick={reset}>Try again</button>
    </main>
  );
}

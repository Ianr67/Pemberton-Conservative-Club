'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="visit-section">
      <p className="eyebrow">Something went wrong</p>
      <h1>We couldn’t show this page.</h1>
      <p>Please try once more. If the problem continues, come back later.</p>
      <button className="retry-button" type="button" onClick={reset}>
        Try again
      </button>
    </main>
  );
}

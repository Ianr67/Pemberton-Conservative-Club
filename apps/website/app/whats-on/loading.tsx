import { SiteShell } from '../site';

export default function EventsLoading() {
  return (
    <SiteShell current="/whats-on">
      <section className="events-loading" aria-live="polite" aria-busy="true">
        <p className="eyebrow">Coming up at the club</p>
        <h1>Loading events…</h1>
        <div className="loading-grid" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </section>
    </SiteShell>
  );
}

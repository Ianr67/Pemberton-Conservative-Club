import { SiteShell } from '../../site';

export default function EventNotFound() {
  return (
    <SiteShell current="/whats-on">
      <section className="event-detail state-panel">
        <p className="eyebrow">Event not found</p>
        <h1>This event is not available</h1>
        <p>It may have been unpublished or the address may be incorrect.</p>
        <a className="button-link" href="/whats-on">
          View upcoming events
        </a>
      </section>
    </SiteShell>
  );
}

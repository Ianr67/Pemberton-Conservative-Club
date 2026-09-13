import type { Metadata } from 'next';
import { EventCard } from '../events';
import { getEvents } from '../event-api';
import { PageHero, SiteShell } from '../site';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'What is on | Pemberton Conservative Club',
  description:
    'See upcoming published events at Pemberton Conservative Club in Pemberton.',
  alternates: { canonical: '/whats-on' },
  openGraph: {
    title: 'What is on at Pemberton Conservative Club',
    description: 'See upcoming club events in Pemberton.',
    url: '/whats-on',
  },
};

export default async function WhatsOnPage() {
  const result = await getEvents();
  return (
    <SiteShell current="/whats-on">
      <PageHero eyebrow="Coming up at the club" title="What is on">
        <p className="lead">
          Friendly nights out, entertainment and community events in the heart
          of Pemberton.
        </p>
      </PageHero>
      <section
        className="events-section"
        aria-labelledby="upcoming-events-heading"
      >
        <h2 id="upcoming-events-heading" className="section-title">
          Upcoming events
        </h2>
        {result.status === 'error' ? (
          <div className="state-panel" role="alert">
            <h3>We could not load the events</h3>
            <p>The club programme is temporarily unavailable.</p>
            <a className="button-link" href="/whats-on">
              Try again
            </a>
          </div>
        ) : result.status === 'not-found' || result.data.length === 0 ? (
          <div className="state-panel" role="status">
            <h3>Nothing is scheduled just yet</h3>
            <p>
              New events will appear here as soon as the club publishes them.
            </p>
          </div>
        ) : (
          <div className="event-grid">
            {result.data.map((event) => (
              <EventCard event={event} key={event.id} />
            ))}
          </div>
        )}
      </section>
    </SiteShell>
  );
}

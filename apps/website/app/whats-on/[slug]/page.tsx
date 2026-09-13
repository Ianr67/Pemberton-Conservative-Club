import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { EventArtwork, EventDate } from '../../events';
import { getEvent } from '../../event-api';
import { SiteShell } from '../../site';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const result = await getEvent(slug);
  if (result.status !== 'ready')
    return { title: 'Event | Pemberton Conservative Club' };
  const event = result.data;
  return {
    title: `${event.title} | Pemberton Conservative Club`,
    description: event.description.slice(0, 160),
    alternates: { canonical: `/whats-on/${event.slug}` },
    openGraph: {
      title: event.title,
      description: event.description.slice(0, 160),
      type: 'article',
      url: `/whats-on/${event.slug}`,
      images: event.artwork
        ? [
            {
              url: event.artwork.url,
              alt: event.artwork.alt,
              width: event.artwork.width ?? undefined,
              height: event.artwork.height ?? undefined,
            },
          ]
        : undefined,
    },
  };
}

export default async function EventDetailPage({ params }: Props) {
  const { slug } = await params;
  const result = await getEvent(slug);
  if (result.status === 'not-found') notFound();
  return (
    <SiteShell current="/whats-on">
      {result.status === 'error' ? (
        <section className="event-detail state-panel" role="alert">
          <p className="eyebrow">Event unavailable</p>
          <h1>We could not load this event</h1>
          <p>Please try again, or return to the full programme.</p>
          <div className="button-row">
            <a
              className="button-link"
              href={`/whats-on/${encodeURIComponent(slug)}`}
            >
              Try again
            </a>
            <a href="/whats-on">View all events</a>
          </div>
        </section>
      ) : (
        <article className="event-detail">
          <div className="event-detail-art">
            <EventArtwork event={result.data} />
          </div>
          <div className="event-detail-copy">
            <p className="eyebrow">Upcoming event</p>
            <h1>{result.data.title}</h1>
            <EventDate event={result.data} detailed />
            <dl className="event-facts">
              <div>
                <dt>Doors open</dt>
                <dd>
                  <time dateTime={result.data.doorsAt}>
                    {new Intl.DateTimeFormat('en-GB', {
                      timeZone: 'Europe/London',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false,
                    }).format(new Date(result.data.doorsAt))}
                  </time>
                </dd>
              </div>
              <div>
                <dt>Venue</dt>
                <dd>{result.data.venue.name}</dd>
              </div>
            </dl>
            <div className="event-description">
              <h2>About this event</h2>
              <p>{result.data.description}</p>
            </div>
            <a href="/whats-on">Back to all events</a>
          </div>
        </article>
      )}
    </SiteShell>
  );
}

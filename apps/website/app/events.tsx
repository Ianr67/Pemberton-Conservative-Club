import type { EventRecord } from '@pcc/contracts';
import { browserImageUrl } from './media-url';

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/London',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
const timeFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/London',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

export function EventDate({
  event,
  detailed = false,
}: {
  event: EventRecord;
  detailed?: boolean;
}) {
  return (
    <p className="event-date">
      <time dateTime={event.startsAt}>
        {dateFormatter.format(new Date(event.startsAt))}
      </time>
      <span aria-hidden="true"> · </span>
      <span>{detailed ? 'Starts' : 'From'} </span>
      <time dateTime={event.startsAt}>
        {timeFormatter.format(new Date(event.startsAt))}
      </time>
    </p>
  );
}

export function EventArtwork({ event }: { event: EventRecord }) {
  if (!event.artwork)
    return (
      <div className="event-artwork event-artwork-fallback" aria-hidden="true">
        PC
      </div>
    );
  return (
    // The artwork URL and alternative text are managed and validated by the shared API.
    <img
      className="event-artwork"
      src={browserImageUrl(event.artwork.url)}
      alt={event.artwork.alt}
      width={event.artwork.width ?? 800}
      height={event.artwork.height ?? 500}
    />
  );
}

export function EventCard({ event }: { event: EventRecord }) {
  return (
    <article className="event-card">
      <EventArtwork event={event} />
      <div className="event-card-copy">
        <EventDate event={event} />
        <h2>
          <a href={`/whats-on/${event.slug}`}>{event.title}</a>
        </h2>
        <p>{event.description}</p>
        <p className="event-venue">At {event.venue.name}</p>
      </div>
    </article>
  );
}

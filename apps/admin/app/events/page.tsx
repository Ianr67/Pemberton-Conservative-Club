import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { EventRecord } from '@pcc/contracts';
export default async function Events() {
  const response = await fetch(
    `${process.env.API_BASE_URL ?? 'http://localhost:3002/api/v1'}/admin/events`,
    { headers: { cookie: (await cookies()).toString() }, cache: 'no-store' },
  );
  if (response.status === 401) redirect('/login');
  const body = (await response.json()) as { events: EventRecord[] };
  return (
    <main>
      <p className="eyebrow">Events</p>
      <h1>Event administration</h1>
      <p>
        <Link className="button-link" href="/events/new">
          Create event
        </Link>
      </p>
      {body.events.length ? (
        <ul className="event-list">
          {body.events.map((event) => (
            <li key={event.id}>
              <strong>{event.title}</strong>
              <br />
              <span>
                {new Date(event.startsAt).toLocaleString('en-GB')} ·{' '}
                {event.status} · {event.visibility}
              </span>
              <br />
              <Link href={`/events/${event.id}`}>Edit</Link> ·{' '}
              <Link href={`/events/${event.id}/preview`}>Preview</Link>
            </li>
          ))}
        </ul>
      ) : (
        <p>No events have been created.</p>
      )}
      <p>
        <Link href="/">Back to dashboard</Link>
      </p>
    </main>
  );
}

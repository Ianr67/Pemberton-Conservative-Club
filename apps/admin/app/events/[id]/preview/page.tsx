import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import type { EventRecord } from '@pcc/contracts';
export default async function Preview({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const response = await fetch(
    `${process.env.API_BASE_URL ?? 'http://localhost:3002/api/v1'}/admin/events/${encodeURIComponent(id)}/preview`,
    { headers: { cookie: (await cookies()).toString() }, cache: 'no-store' },
  );
  if (response.status === 401) redirect('/login');
  if (response.status === 404) notFound();
  const event = (await response.json()) as EventRecord;
  return (
    <main>
      <p className="eyebrow">Authenticated preview · {event.status}</p>
      <h1>{event.title}</h1>
      {event.artwork && (
        <img
          className="event-artwork"
          src={event.artwork.url}
          alt={event.artwork.alt}
        />
      )}
      <p>{event.description}</p>
      <dl>
        <dt>Venue</dt>
        <dd>{event.venue.name}</dd>
        <dt>Doors</dt>
        <dd>{new Date(event.doorsAt).toLocaleString('en-GB')}</dd>
        <dt>Starts</dt>
        <dd>{new Date(event.startsAt).toLocaleString('en-GB')}</dd>
        <dt>Ends</dt>
        <dd>{new Date(event.endsAt).toLocaleString('en-GB')}</dd>
        <dt>Capacity</dt>
        <dd>{event.capacity}</dd>
        <dt>Visibility</dt>
        <dd>{event.visibility}</dd>
      </dl>
      <p>
        <Link href={`/events/${event.id}`}>Return to editor</Link>
      </p>
    </main>
  );
}

'use client';
import type { EventInput, EventRecord } from '@pcc/contracts';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
const venueId = '80000000-0000-4000-8000-000000000001';
function local(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
export function EventForm({ event }: { event?: EventRecord }) {
  const router = useRouter();
  const [form, setForm] = useState({
    venueId: event?.venueId ?? venueId,
    slug: event?.slug ?? '',
    title: event?.title ?? '',
    description: event?.description ?? '',
    doorsAt: local(event?.doorsAt),
    startsAt: local(event?.startsAt),
    endsAt: local(event?.endsAt),
    visibility: event?.visibility ?? 'public',
    capacity: String(event?.capacity ?? 100),
    artworkUrl: event?.artwork?.url ?? '',
    artworkAlt: event?.artwork?.alt ?? '',
  });
  const [message, setMessage] = useState('');
  const set = (key: string, value: string) =>
    setForm((old) => ({ ...old, [key]: value }));
  async function save() {
    setMessage('Saving…');
    const input: EventInput = {
      venueId: form.venueId,
      slug: form.slug,
      title: form.title,
      description: form.description,
      doorsAt: new Date(form.doorsAt).toISOString(),
      startsAt: new Date(form.startsAt).toISOString(),
      endsAt: new Date(form.endsAt).toISOString(),
      visibility: form.visibility as 'public' | 'unlisted',
      capacity: Number(form.capacity),
      artwork: form.artworkUrl
        ? {
            url: form.artworkUrl,
            alt: form.artworkAlt,
            width: null,
            height: null,
          }
        : null,
    };
    const response = await fetch(
      event ? `/api/events/${event.id}` : '/api/events',
      {
        method: event ? 'PATCH' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      },
    );
    const body = (await response.json()) as
      EventRecord | { message: string; errors?: string[] };
    if (!response.ok) {
      setMessage(
        'errors' in body && body.errors?.length
          ? body.errors.join(' ')
          : 'message' in body
            ? body.message
            : 'The event could not be saved.',
      );
      return;
    }
    setMessage('Event saved.');
    if (!event) router.push(`/events/${(body as EventRecord).id}`);
    else router.refresh();
  }
  async function status(action: 'publish' | 'unpublish') {
    setMessage(`${action === 'publish' ? 'Publishing' : 'Unpublishing'}…`);
    const response = await fetch(`/api/events/${event!.id}/${action}`, {
      method: 'POST',
    });
    const body = (await response.json()) as { message?: string };
    setMessage(
      response.ok
        ? action === 'publish'
          ? 'Published and available through the public API.'
          : 'Unpublished and removed from the public API.'
        : (body.message ?? 'The status could not be changed.'),
    );
    router.refresh();
  }
  return (
    <main>
      <p className="eyebrow">Event editor</p>
      <h1>{event ? 'Edit event' : 'Create event'}</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <label>
          Title
          <input
            required
            maxLength={160}
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
          />
        </label>
        <label>
          Slug
          <input
            required
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            value={form.slug}
            onChange={(e) => set('slug', e.target.value)}
          />
        </label>
        <label>
          Description
          <textarea
            required
            maxLength={5000}
            rows={8}
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
          />
        </label>
        <label>
          Doors open
          <input
            required
            type="datetime-local"
            value={form.doorsAt}
            onChange={(e) => set('doorsAt', e.target.value)}
          />
        </label>
        <label>
          Starts
          <input
            required
            type="datetime-local"
            value={form.startsAt}
            onChange={(e) => set('startsAt', e.target.value)}
          />
        </label>
        <label>
          Ends
          <input
            required
            type="datetime-local"
            value={form.endsAt}
            onChange={(e) => set('endsAt', e.target.value)}
          />
        </label>
        <label>
          Visibility
          <select
            value={form.visibility}
            onChange={(e) => set('visibility', e.target.value)}
          >
            <option value="public">Public</option>
            <option value="unlisted">Unlisted</option>
          </select>
        </label>
        <label>
          Capacity
          <input
            required
            type="number"
            min="1"
            max="100000"
            value={form.capacity}
            onChange={(e) => set('capacity', e.target.value)}
          />
        </label>
        <fieldset>
          <legend>Artwork metadata (optional)</legend>
          <label>
            HTTPS image URL
            <input
              type="url"
              value={form.artworkUrl}
              onChange={(e) => set('artworkUrl', e.target.value)}
            />
          </label>
          <label>
            Alternative text
            <input
              required={!!form.artworkUrl}
              maxLength={300}
              value={form.artworkAlt}
              onChange={(e) => set('artworkAlt', e.target.value)}
            />
          </label>
        </fieldset>
        <div className="actions">
          <button type="submit">Save event</button>
          {event && (
            <Link className="button-link" href={`/events/${event.id}/preview`}>
              Preview
            </Link>
          )}
          {event && (
            <button
              type="button"
              onClick={() =>
                void status(
                  event.status === 'published' ? 'unpublish' : 'publish',
                )
              }
            >
              {event.status === 'published' ? 'Unpublish' : 'Publish'}
            </button>
          )}
        </div>
        <p role="status">{message}</p>
      </form>
      <p>
        <Link href="/events">Back to events</Link>
      </p>
    </main>
  );
}

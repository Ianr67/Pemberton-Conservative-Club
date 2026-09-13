import type { EventRecord } from '@pcc/contracts';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EventCard } from '../events';
import { getEvent, getEvents } from '../event-api';
import WhatsOnPage, { metadata } from './page';
import EventDetailPage, { generateMetadata } from './[slug]/page';

const event: EventRecord = {
  id: '10000000-0000-4000-8000-000000000001',
  venueId: '20000000-0000-4000-8000-000000000001',
  venue: {
    id: '20000000-0000-4000-8000-000000000001',
    name: 'Fictional Club Hall',
  },
  slug: 'summer-social',
  title: 'Summer social',
  description: 'A friendly evening at the club.',
  doorsAt: '2026-09-18T17:30:00.000Z',
  startsAt: '2026-09-18T18:00:00.000Z',
  endsAt: '2026-09-18T21:00:00.000Z',
  status: 'published',
  visibility: 'public',
  capacity: 80,
  artwork: null,
  publishedAt: '2026-08-01T10:00:00.000Z',
  updatedAt: '2026-08-01T10:00:00.000Z',
};

function response(status: number, data?: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(data),
    }),
  );
}
afterEach(() => vi.unstubAllGlobals());

describe('public events', () => {
  it('renders published event cards with semantic, machine-readable dates and links', async () => {
    response(200, { events: [event] });
    const html = renderToStaticMarkup(await WhatsOnPage());
    expect(html).toContain('Summer social');
    expect(html).toContain('href="/whats-on/summer-social"');
    expect(html).toContain('dateTime="2026-09-18T18:00:00.000Z"');
    expect(html).toContain('Fictional Club Hall');
    expect(html.match(/<h1/g)).toHaveLength(1);
  });

  it('renders an empty state for an empty published programme', async () => {
    response(200, { events: [] });
    expect(renderToStaticMarkup(await WhatsOnPage())).toContain(
      'Nothing is scheduled just yet',
    );
  });

  it('renders an announced, retryable API failure state', async () => {
    response(503);
    const html = renderToStaticMarkup(await WhatsOnPage());
    expect(html).toContain('role="alert"');
    expect(html).toContain('Try again');
  });

  it('treats malformed responses as failures and preserves API 404s', async () => {
    response(200, { events: [{ title: 'Incomplete' }] });
    expect(await getEvents()).toEqual({ status: 'error' });
    response(404);
    expect(await getEvent('missing')).toEqual({ status: 'not-found' });
  });

  it('uses artwork alternative text and provides page metadata', () => {
    const html = renderToStaticMarkup(
      <EventCard
        event={{
          ...event,
          artwork: {
            url: 'https://example.test/event.jpg',
            alt: 'People enjoying a fictional club social',
            width: 800,
            height: 500,
          },
        }}
      />,
    );
    expect(html).toContain('alt="People enjoying a fictional club social"');
    expect(metadata.title).toContain('What is on');
    expect(metadata.alternates).toEqual({ canonical: '/whats-on' });
  });

  it('renders event details and event-specific metadata from the detail API', async () => {
    response(200, event);
    const html = renderToStaticMarkup(
      await EventDetailPage({ params: Promise.resolve({ slug: event.slug }) }),
    );
    expect(html).toContain('<h1>Summer social</h1>');
    expect(html).toContain('Doors open');
    expect(html).toContain('A friendly evening at the club.');

    response(200, event);
    const detailMetadata = await generateMetadata({
      params: Promise.resolve({ slug: event.slug }),
    });
    expect(detailMetadata.title).toBe(
      'Summer social | Pemberton Conservative Club',
    );
    expect(detailMetadata.alternates).toEqual({
      canonical: '/whats-on/summer-social',
    });
  });
});

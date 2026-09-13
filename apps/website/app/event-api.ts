import type { EventRecord } from '@pcc/contracts';

export type EventApiResult<T> =
  { status: 'ready'; data: T } | { status: 'not-found' } | { status: 'error' };

function isEvent(value: unknown): value is EventRecord {
  if (!value || typeof value !== 'object') return false;
  const event = value as Record<string, unknown>;
  const venue = event.venue as Record<string, unknown> | undefined;
  return (
    typeof event.slug === 'string' &&
    typeof event.title === 'string' &&
    typeof event.description === 'string' &&
    typeof event.startsAt === 'string' &&
    !Number.isNaN(Date.parse(event.startsAt)) &&
    typeof event.endsAt === 'string' &&
    !Number.isNaN(Date.parse(event.endsAt)) &&
    !!venue &&
    typeof venue.name === 'string'
  );
}

export async function getEvents(): Promise<EventApiResult<EventRecord[]>> {
  const result = await request<unknown>('/events');
  if (result.status !== 'ready') return result;
  const body = result.data as { events?: unknown };
  return Array.isArray(body?.events) && body.events.every(isEvent)
    ? { status: 'ready', data: body.events }
    : { status: 'error' };
}

export async function getEvent(
  slug: string,
): Promise<EventApiResult<EventRecord>> {
  const result = await request<unknown>(`/events/${encodeURIComponent(slug)}`);
  if (result.status !== 'ready') return result;
  return isEvent(result.data)
    ? { status: 'ready', data: result.data }
    : { status: 'error' };
}

async function request<T>(path: string): Promise<EventApiResult<T>> {
  const base = process.env.API_BASE_URL ?? 'http://localhost:3002/api/v1';
  try {
    const response = await fetch(`${base}${path}`, { cache: 'no-store' });
    if (response.status === 404) return { status: 'not-found' };
    if (!response.ok) return { status: 'error' };
    return { status: 'ready', data: (await response.json()) as T };
  } catch {
    return { status: 'error' };
  }
}

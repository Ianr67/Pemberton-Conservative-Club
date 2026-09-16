import { describe, expect, it, vi } from 'vitest';
import { EventsService } from './events.service.js';
const row = {
  id: 'e',
  venue_id: 'v',
  venue_name: 'Club',
  slug: 'draft-event',
  title: 'Draft',
  description: 'Draft copy',
  doors_at: '2027-01-01T18:00:00Z',
  starts_at: '2027-01-01T19:00:00Z',
  ends_at: '2027-01-01T21:00:00Z',
  status: 'draft',
  visibility: 'public',
  capacity: 100,
  artwork_url: null,
  artwork_alt: null,
  artwork_width: null,
  artwork_height: null,
  published_at: null,
  updated_at: '2026-01-01T00:00:00Z',
} as const;
describe('event publication boundaries', () => {
  it('filters the public list to published, public events', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    await new EventsService({ query } as never).publicList();
    const sql = String(query.mock.calls[0]?.[0]);
    expect(sql).toContain("e.status='published'");
    expect(sql).toContain("e.visibility='public'");
  });
  it('requires published status for public event detail', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    await expect(
      new EventsService({ query } as never).publicDetail('draft-event'),
    ).rejects.toMatchObject({ status: 404 });
    expect(String(query.mock.calls[0]?.[0])).toContain("e.status='published'");
  });
  it('allows authenticated admin preview to read a draft', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [row] });
    await expect(
      new EventsService({ query } as never).adminDetail('e'),
    ).resolves.toMatchObject({ status: 'draft' });
    expect(String(query.mock.calls[0]?.[0])).not.toContain(
      "e.status='published'",
    );
  });
  it('publishes and audits in one statement', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [{ id: 'e' }] })
      .mockResolvedValueOnce({
        rows: [
          { ...row, status: 'published', published_at: '2026-01-02T00:00:00Z' },
        ],
      });
    await new EventsService({ query } as never).setPublished('e', true, {
      id: 'u',
      email: 'a@example.test',
      displayName: 'A',
    });
    const sql = String(query.mock.calls[0]?.[0]);
    expect(sql).toContain('event.published');
    expect(sql).toContain('audit_events');
  });
  it('deletes and audits an event in one statement', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ id: 'e' }] });
    await expect(
      new EventsService({ query } as never).delete('e', {
        id: 'u',
        email: 'a@example.test',
        displayName: 'A',
      }),
    ).resolves.toEqual({ deleted: true, id: 'e' });
    const sql = String(query.mock.calls[0]?.[0]);
    expect(sql).toContain('DELETE FROM events');
    expect(sql).toContain('event.deleted');
  });
});

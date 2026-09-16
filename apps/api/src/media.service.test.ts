import { describe, expect, it, vi } from 'vitest';
import { MediaService } from './media.service.js';

describe('MediaService library', () => {
  it('returns newest media metadata using the stable public media URL', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({
        rows: [
          {
            id: '70000000-0000-4000-8000-000000000001',
            storage_key: 'media/70000000-0000-4000-8000-000000000001.jpg',
            original_filename: 'club-room.jpg',
            mime_type: 'image/jpeg',
            byte_size: 1234,
            created_at: new Date('2026-09-16T12:00:00Z'),
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ count: '1' }] });
    const service = new MediaService({ query } as never, {} as never);

    await expect(service.list(1, 24)).resolves.toEqual({
      page: 1,
      pageSize: 24,
      total: 1,
      media: [
        {
          id: '70000000-0000-4000-8000-000000000001',
          url: 'http://localhost:3002/api/v1/media/70000000-0000-4000-8000-000000000001',
          alt: '',
          width: null,
          height: null,
          originalFilename: 'club-room.jpg',
          mimeType: 'image/jpeg',
          byteSize: 1234,
          createdAt: '2026-09-16T12:00:00.000Z',
        },
      ],
    });
    expect(String(query.mock.calls[0]?.[0])).toContain(
      'ORDER BY created_at DESC',
    );
    expect(query.mock.calls[0]?.[1]).toEqual([24, 0]);
    expect(String(query.mock.calls[0]?.[0])).toContain(
      "mime_type LIKE 'image/%'",
    );
  });

  it('returns an explicit empty library', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ count: '0' }] });
    const service = new MediaService({ query } as never, {} as never);
    await expect(service.list(2, 10)).resolves.toEqual({
      media: [],
      page: 2,
      pageSize: 10,
      total: 0,
    });
    expect(query.mock.calls[0]?.[1]).toEqual([10, 10]);
  });
});

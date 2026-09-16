import type { MediaLibraryItem } from '@pcc/contracts';
import { describe, expect, it } from 'vitest';
import { selectedLibraryImage } from './image-upload';

describe('media library selection', () => {
  it('maps a library record to editable page image fields', () => {
    const media: MediaLibraryItem = {
      id: '70000000-0000-4000-8000-000000000001',
      url: 'https://api.example.test/api/v1/media/70000000-0000-4000-8000-000000000001',
      alt: '',
      width: null,
      height: null,
      originalFilename: 'club-room.jpg',
      mimeType: 'image/jpeg',
      byteSize: 1234,
      createdAt: '2026-09-16T12:00:00.000Z',
    };
    expect(selectedLibraryImage(media)).toEqual({
      url: media.url,
      alt: '',
      width: null,
      height: null,
      mediaId: media.id,
    });
  });
});

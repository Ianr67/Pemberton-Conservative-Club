import { describe, expect, it } from 'vitest';
import { browserImageUrl } from './media-url';

describe('browserImageUrl', () => {
  it('proxies API uploads through the website origin', () => {
    expect(
      browserImageUrl(
        'http://localhost:3002/api/v1/media/fd014f78-3744-4019-b8b4-fcb6a6b308e1',
      ),
    ).toBe('/api/media/fd014f78-3744-4019-b8b4-fcb6a6b308e1');
  });

  it('leaves externally hosted artwork unchanged', () => {
    expect(browserImageUrl('https://images.example.test/event.jpg')).toBe(
      'https://images.example.test/event.jpg',
    );
  });
});

import { describe, expect, it } from 'vitest';
import { eventSlug } from './slug';

describe('eventSlug', () => {
  it('creates a URL-safe slug from an event title', () => {
    expect(eventSlug('Friday Night: Rock & Roll!')).toBe(
      'friday-night-rock-roll',
    );
  });

  it('normalises accented characters and repeated separators', () => {
    expect(eventSlug('Café — Summer Social')).toBe('cafe-summer-social');
  });

  it('does not leave a partial separator at the length limit', () => {
    expect(eventSlug(`${'a'.repeat(119)} party`)).toBe('a'.repeat(119));
  });
});

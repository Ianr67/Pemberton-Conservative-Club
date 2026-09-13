import { describe, expect, it } from 'vitest';

import {
  apiVersion,
  clubDays,
  validateClubSettings,
  validateEventInput,
  validatePageContentInput,
} from './index.js';

describe('API contract foundation', () => {
  it('uses the documented API version', () => {
    expect(apiVersion).toBe('v1');
  });
});

describe('page content validation', () => {
  it('accepts complete editable page content', () =>
    expect(
      validatePageContentInput({
        eyebrow: 'Belong locally',
        heading: 'Membership information',
        body: 'A welcoming fictional membership introduction.',
      }),
    ).toEqual([]));

  it('rejects empty and oversized content', () =>
    expect(
      validatePageContentInput({
        eyebrow: '',
        heading: '',
        body: 'x'.repeat(5001),
      }),
    ).toHaveLength(3));
});

describe('club settings validation', () => {
  const valid = {
    clubName: 'Demo Club',
    addressLine1: '1 Fictional Road',
    addressLine2: '',
    town: 'Pemberton',
    postcode: 'WN5 0AA',
    telephone: '01942 000 123',
    email: 'hello@example.test',
    openingTimes: clubDays.map((day) => ({
      day,
      isClosed: true,
      opensAt: null,
      closesAt: null,
    })),
    socialLinks: [{ platform: 'facebook', url: 'https://example.test/club' }],
  };
  it('accepts complete structured settings', () =>
    expect(validateClubSettings(valid)).toEqual([]));
  it('rejects malformed email, duplicate days and insecure social links', () => {
    const broken = {
      ...valid,
      email: 'bad',
      openingTimes: valid.openingTimes.map(() => valid.openingTimes[0]),
      socialLinks: [{ platform: 'facebook', url: 'http://example.test' }],
    };
    expect(validateClubSettings(broken)).toEqual(
      expect.arrayContaining([
        'Enter a valid email address.',
        'Opening-time days must be unique and valid.',
        'Social links must use valid HTTPS URLs.',
      ]),
    );
  });
  it('rejects invalid opening ranges', () => {
    const openingTimes = valid.openingTimes.map((h, i) =>
      i === 0
        ? { ...h, isClosed: false, opensAt: '22:00', closesAt: '18:00' }
        : h,
    );
    expect(validateClubSettings({ ...valid, openingTimes })).toContain(
      'Open days require valid opening and closing times.',
    );
  });
});

describe('event validation', () => {
  const valid = {
    venueId: '80000000-0000-4000-8000-000000000001',
    slug: 'quiz-night',
    title: 'Quiz Night',
    description: 'A fictional club quiz.',
    doorsAt: '2027-01-01T18:00:00Z',
    startsAt: '2027-01-01T19:00:00Z',
    endsAt: '2027-01-01T21:00:00Z',
    visibility: 'public',
    capacity: 100,
    artwork: {
      url: 'https://example.test/quiz.jpg',
      alt: 'Quiz night artwork',
      width: 1600,
      height: 900,
    },
  };
  it('accepts complete event details', () =>
    expect(validateEventInput(valid)).toEqual([]));
  it('rejects invalid times, slugs and artwork metadata', () =>
    expect(
      validateEventInput({
        ...valid,
        slug: 'Bad Slug',
        endsAt: valid.startsAt,
        artwork: {
          ...valid.artwork,
          url: 'http://example.test/quiz.jpg',
          alt: '',
        },
      }),
    ).toEqual(
      expect.arrayContaining([
        'Slug must use lowercase letters, numbers and single hyphens.',
        'Doors must be no later than the start, and the end must be after the start.',
        'Artwork URL must be a valid HTTPS URL.',
        'Artwork alternative text is required and must be at most 300 characters.',
      ]),
    ));
});

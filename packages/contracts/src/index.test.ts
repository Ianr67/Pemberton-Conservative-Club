import { describe, expect, it } from 'vitest';

import { apiVersion, clubDays, validateClubSettings } from './index.js';

describe('API contract foundation', () => {
  it('uses the documented API version', () => {
    expect(apiVersion).toBe('v1');
  });
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

export const apiVersion = 'v1' as const;

export interface HealthResponse {
  service: 'api' | 'worker';
  status: 'ok';
}

export interface DatabaseHealthResponse {
  service: 'database';
  status: 'ok';
}

export const clubDays = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;
export const socialPlatforms = [
  'facebook',
  'instagram',
  'x',
  'youtube',
] as const;
export type SocialPlatform = (typeof socialPlatforms)[number];
export interface OpeningTime {
  day: (typeof clubDays)[number];
  isClosed: boolean;
  opensAt: string | null;
  closesAt: string | null;
}
export interface SocialLink {
  platform: SocialPlatform;
  url: string;
}
export interface ClubSettingsInput {
  clubName: string;
  addressLine1: string;
  addressLine2: string;
  town: string;
  postcode: string;
  telephone: string;
  email: string;
  openingTimes: OpeningTime[];
  socialLinks: SocialLink[];
}
export interface ClubSettings extends ClubSettingsInput {
  id: string;
  state: 'draft' | 'published';
  versionNumber: number;
}

export function validateClubSettings(value: unknown): string[] {
  if (!value || typeof value !== 'object') return ['Settings are required.'];
  const v = value as Record<string, unknown>;
  const errors: string[] = [];
  const required: [string, string, number][] = [
    ['clubName', 'Club name', 120],
    ['addressLine1', 'Address line 1', 120],
    ['town', 'Town', 80],
    ['postcode', 'Postcode', 12],
    ['telephone', 'Telephone', 30],
  ];
  for (const [key, label, max] of required) {
    if (
      typeof v[key] !== 'string' ||
      !(v[key] as string).trim() ||
      (v[key] as string).length > max
    )
      errors.push(
        `${label} is required and must be at most ${max} characters.`,
      );
  }
  if (typeof v.addressLine2 !== 'string' || v.addressLine2.length > 120)
    errors.push('Address line 2 must be at most 120 characters.');
  if (
    typeof v.email !== 'string' ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)
  )
    errors.push('Enter a valid email address.');
  if (!Array.isArray(v.openingTimes) || v.openingTimes.length !== 7) {
    errors.push('Opening times must contain all seven days.');
  } else {
    const time = /^([01]\d|2[0-3]):[0-5]\d$/;
    const days = new Set<string>();
    for (const entry of v.openingTimes as Record<string, unknown>[]) {
      if (
        !clubDays.includes(entry.day as never) ||
        days.has(entry.day as string)
      )
        errors.push('Opening-time days must be unique and valid.');
      days.add(entry.day as string);
      if (typeof entry.isClosed !== 'boolean')
        errors.push('Each day must specify whether the club is closed.');
      if (entry.isClosed) {
        if (entry.opensAt !== null || entry.closesAt !== null)
          errors.push('Closed days cannot have opening hours.');
      } else if (
        typeof entry.opensAt !== 'string' ||
        typeof entry.closesAt !== 'string' ||
        !time.test(entry.opensAt) ||
        !time.test(entry.closesAt) ||
        entry.opensAt >= entry.closesAt
      ) {
        errors.push('Open days require valid opening and closing times.');
      }
    }
  }
  if (!Array.isArray(v.socialLinks))
    errors.push('Social links must be a list.');
  else {
    const platforms = new Set<string>();
    for (const link of v.socialLinks as Record<string, unknown>[]) {
      if (
        !socialPlatforms.includes(link.platform as never) ||
        platforms.has(link.platform as string)
      )
        errors.push('Social-link platforms must be unique and supported.');
      platforms.add(link.platform as string);
      try {
        if (
          typeof link.url !== 'string' ||
          new URL(link.url).protocol !== 'https:'
        )
          throw new Error();
      } catch {
        errors.push('Social links must use valid HTTPS URLs.');
      }
    }
  }
  return [...new Set(errors)];
}

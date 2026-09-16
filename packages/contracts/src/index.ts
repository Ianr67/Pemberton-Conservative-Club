export const apiVersion = 'v1' as const;

export interface PageContent {
  id: string;
  slug: string;
  title: string;
  eyebrow: string;
  heading: string;
  body: string;
  image: PageImage | null;
  state: 'draft' | 'published';
  versionNumber: number;
}

export interface PageContentInput {
  eyebrow: string;
  heading: string;
  body: string;
  image?: PageImage | null;
}

export interface PageImage extends EventArtwork {
  mediaId: string | null;
}

export function validatePageContentInput(value: unknown): string[] {
  if (!value || typeof value !== 'object') return ['Page content is required.'];
  const page = value as Record<string, unknown>;
  const errors: string[] = [];
  if (
    typeof page.eyebrow !== 'string' ||
    !page.eyebrow.trim() ||
    page.eyebrow.length > 120
  )
    errors.push('Eyebrow is required and must be at most 120 characters.');
  if (
    typeof page.heading !== 'string' ||
    !page.heading.trim() ||
    page.heading.length > 180
  )
    errors.push('Heading is required and must be at most 180 characters.');
  if (
    typeof page.body !== 'string' ||
    !page.body.trim() ||
    page.body.length > 5000
  )
    errors.push('Body is required and must be at most 5000 characters.');
  errors.push(...validateImage(page.image, 'Page image'));
  if (
    page.image &&
    typeof page.image === 'object' &&
    !(
      (page.image as Record<string, unknown>).mediaId === null ||
      (typeof (page.image as Record<string, unknown>).mediaId === 'string' &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          (page.image as Record<string, unknown>).mediaId as string,
        ))
    )
  )
    errors.push('Page image must reference a valid media record.');
  return errors;
}

export const eventStatuses = ['draft', 'published'] as const;
export const eventVisibilities = ['public', 'unlisted'] as const;
export type EventStatus = (typeof eventStatuses)[number];
export type EventVisibility = (typeof eventVisibilities)[number];

export interface EventArtwork {
  url: string;
  alt: string;
  width: number | null;
  height: number | null;
}

export interface MediaUpload extends EventArtwork {
  id: string;
}

export interface MediaLibraryItem extends MediaUpload {
  originalFilename: string;
  mimeType: string;
  byteSize: number;
  createdAt: string;
}

export interface MediaLibraryPage {
  media: MediaLibraryItem[];
  page: number;
  pageSize: number;
  total: number;
}

function validateImage(value: unknown, label: string): string[] {
  if (value === null || value === undefined) return [];
  if (!value || typeof value !== 'object')
    return [`${label} must be an object or null.`];
  const image = value as Record<string, unknown>;
  const errors: string[] = [];
  try {
    if (typeof image.url !== 'string') throw new Error();
    const url = new URL(image.url);
    if (
      url.protocol !== 'https:' &&
      !(
        url.protocol === 'http:' &&
        ['localhost', '127.0.0.1', '::1'].includes(url.hostname)
      )
    )
      throw new Error();
  } catch {
    errors.push(`${label} URL must be a valid HTTPS URL.`);
  }
  if (
    typeof image.alt !== 'string' ||
    !image.alt.trim() ||
    image.alt.length > 300
  )
    errors.push(
      `${label} alternative text is required and must be at most 300 characters.`,
    );
  for (const key of ['width', 'height'] as const) {
    if (
      image[key] !== null &&
      (!Number.isInteger(image[key]) || (image[key] as number) < 1)
    )
      errors.push(`${label} ${key} must be a positive whole number or null.`);
  }
  return errors;
}

export interface EventInput {
  venueId: string;
  slug: string;
  title: string;
  description: string;
  doorsAt: string;
  startsAt: string;
  endsAt: string;
  visibility: EventVisibility;
  capacity: number;
  artwork: EventArtwork | null;
}

export interface EventRecord extends EventInput {
  id: string;
  status: EventStatus;
  venue: { id: string; name: string };
  publishedAt: string | null;
  updatedAt: string;
}

export function validateEventInput(value: unknown): string[] {
  if (!value || typeof value !== 'object')
    return ['Event details are required.'];
  const event = value as Record<string, unknown>;
  const errors: string[] = [];
  if (
    typeof event.venueId !== 'string' ||
    !/^[0-9a-f-]{36}$/i.test(event.venueId)
  )
    errors.push('Choose a valid venue.');
  if (
    typeof event.slug !== 'string' ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(event.slug) ||
    event.slug.length > 120
  )
    errors.push('Slug must use lowercase letters, numbers and single hyphens.');
  if (
    typeof event.title !== 'string' ||
    !event.title.trim() ||
    event.title.length > 160
  )
    errors.push('Title is required and must be at most 160 characters.');
  if (
    typeof event.description !== 'string' ||
    !event.description.trim() ||
    event.description.length > 5000
  )
    errors.push('Description is required and must be at most 5000 characters.');
  const times = ['doorsAt', 'startsAt', 'endsAt'] as const;
  const parsed = times.map((key) =>
    typeof event[key] === 'string' ? Date.parse(event[key]) : Number.NaN,
  );
  if (parsed.some(Number.isNaN))
    errors.push('Doors, start and end times must be valid timestamps.');
  else if (!(parsed[0]! <= parsed[1]! && parsed[1]! < parsed[2]!))
    errors.push(
      'Doors must be no later than the start, and the end must be after the start.',
    );
  if (!eventVisibilities.includes(event.visibility as EventVisibility))
    errors.push('Choose a valid visibility.');
  if (
    !Number.isInteger(event.capacity) ||
    (event.capacity as number) < 1 ||
    (event.capacity as number) > 100000
  )
    errors.push('Capacity must be a whole number between 1 and 100000.');
  if (event.artwork !== null) {
    errors.push(...validateImage(event.artwork, 'Artwork'));
  }
  return [...new Set(errors)];
}

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

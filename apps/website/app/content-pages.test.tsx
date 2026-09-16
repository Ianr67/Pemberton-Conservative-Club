import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ContentPage } from './content-page';
import ContactPage, { metadata as contactMetadata } from './contact/page';

const settings = {
  clubName: 'Demo Club',
  addressLine1: '1 Fictional Road',
  addressLine2: '',
  town: 'Pemberton',
  postcode: 'WN5 0AA',
  telephone: '01942 000 123',
  email: 'hello@example.test',
  openingTimes: [
    { day: 'Monday', isClosed: false, opensAt: '18:00', closesAt: '23:00' },
  ],
  socialLinks: [],
};
function stub(
  content: unknown,
  clubSettings: unknown,
  statuses = [200, 200],
  pageContent?: unknown,
) {
  const values = [
    { data: content, status: statuses[0] },
    { data: clubSettings, status: statuses[1] },
    { data: pageContent, status: pageContent ? 200 : 500 },
  ];
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation(() => {
      const value = values.shift()!;
      return Promise.resolve({
        ok: value.status === 200,
        status: value.status,
        json: () => Promise.resolve(value.data),
      });
    }),
  );
}
afterEach(() => vi.unstubAllGlobals());

describe('public content pages', () => {
  it.each([
    ['/function-room', 'A room for your occasion'],
    ['/quiz-nights', 'Quiz nights'],
    ['/sports-and-activities', 'Sports and activities'],
    ['/membership', 'Membership information'],
    ['/about', 'About the club'],
  ] as const)('renders CMS and settings on %s', async (path, heading) => {
    stub({ introduction: 'A CMS introduction.' }, settings);
    const html = renderToStaticMarkup(await ContentPage({ path }));
    expect(html).toContain(`<h1>${heading}</h1>`);
    expect(html).toContain('A CMS introduction.');
    expect(html).toContain('01942 000 123');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('Skip to main content');
  });
  it('renders contact details, hours and requested placeholders', async () => {
    stub({ introduction: 'Welcome.' }, settings);
    const html = renderToStaticMarkup(await ContactPage());
    expect(html).toContain('Contact and opening times');
    expect(html).toContain('Monday');
    expect(html).toContain('Upcoming events');
    expect(html).toContain('Function-room enquiries');
    expect(contactMetadata.title).toContain('Contact');
  });
  it('announces empty and error states', async () => {
    stub({}, {}, [404, 500]);
    const html = renderToStaticMarkup(await ContentPage({ path: '/about' }));
    expect(html).toContain('role="status"');
    expect(html).toContain('role="alert"');
    expect(html).toContain('published here soon');
  });
  it('renders a published CMS image with its alternative text', async () => {
    const pageResponse = {
      id: 'version-id',
      slug: 'about',
      title: 'About',
      eyebrow: 'Our story',
      heading: 'About the club',
      body: 'Published body.',
      state: 'published',
      versionNumber: 2,
      image: {
        url: 'https://api.example.test/api/v1/media/image-id',
        alt: 'The club function room set for a community event',
        width: null,
        height: null,
      },
    };
    stub(
      { introduction: 'A CMS introduction.' },
      settings,
      [200, 200],
      pageResponse,
    );
    const html = renderToStaticMarkup(await ContentPage({ path: '/about' }));
    expect(html).toContain(
      'alt="The club function room set for a community event"',
    );
    expect(html).toContain('/api/v1/media/image-id');
  });
  it('keeps responsive, touch-target and reduced-motion accessibility rules', async () => {
    const { readFileSync } = await import('node:fs');
    const css = readFileSync(new URL('./styles.css', import.meta.url), 'utf8');
    expect(css).toMatch(/@media \(min-width:\s*48rem\)/);
    expect(css).toMatch(/@media \(prefers-reduced-motion:\s*reduce\)/);
    expect(css).toMatch(/min-height:\s*44px/);
    expect(css).toContain(':focus-visible');
  });
});

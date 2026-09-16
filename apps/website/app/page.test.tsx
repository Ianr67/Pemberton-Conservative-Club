import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import HomePage from './page';

const introduction = { introduction: 'Welcome to the demo club.' };
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
  socialLinks: [{ platform: 'facebook', url: 'https://example.test/club' }],
};

function stubResponses(
  responses: Array<{ ok: boolean; status: number; data?: unknown }>,
) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation(() => {
      const response = responses.shift()!;
      return Promise.resolve({
        ok: response.ok,
        status: response.status,
        json: () => Promise.resolve(response.data),
      });
    }),
  );
}

afterEach(() => vi.unstubAllGlobals());

describe('public homepage', () => {
  it('renders CMS content, settings and scoped promotional placeholders', async () => {
    stubResponses([
      { ok: true, status: 200, data: introduction },
      { ok: true, status: 200, data: settings },
    ]);
    const html = renderToStaticMarkup(await HomePage());
    expect(html).toContain('Welcome to the demo club.');
    expect(html).toContain('Demo Club');
    expect(html).toContain('1 Fictional Road');
    expect(html).toContain('18:00–23:00');
    expect(html).toContain('tel:01942000123');
    expect(html).toContain('mailto:hello@example.test');
    expect(html).toContain('Upcoming events');
    expect(html).toContain('The function room');
  });

  it('renders a published homepage image with its page-specific alt text', async () => {
    stubResponses([
      {
        ok: true,
        status: 200,
        data: {
          ...introduction,
          image: {
            url: 'http://localhost:3002/api/v1/media/70000000-0000-4000-8000-000000000001',
            alt: 'Members talking in the club lounge',
            width: 1600,
            height: 900,
            mediaId: '70000000-0000-4000-8000-000000000001',
          },
        },
      },
      { ok: true, status: 200, data: settings },
    ]);
    const html = renderToStaticMarkup(await HomePage());
    expect(html).toContain(
      'src="/api/media/70000000-0000-4000-8000-000000000001"',
    );
    expect(html).toContain('alt="Members talking in the club lounge"');
  });

  it('uses semantic navigation, one h1, labelled sections and a skip link', async () => {
    stubResponses([
      { ok: true, status: 200, data: introduction },
      { ok: true, status: 200, data: settings },
    ]);
    const html = renderToStaticMarkup(await HomePage());
    expect(html).toContain('href="#main-content"');
    expect(html).toContain('<nav aria-label="Main navigation">');
    expect(html.match(/<h1/g)).toHaveLength(1);
    expect(html.match(/aria-labelledby=/g)?.length).toBeGreaterThanOrEqual(4);
    expect(html).toContain('aria-current="page"');
  });

  it('shows empty states when published CMS records do not exist', async () => {
    stubResponses([
      { ok: false, status: 404 },
      { ok: false, status: 404 },
    ]);
    const html = renderToStaticMarkup(await HomePage());
    expect(html).toContain('welcome message will be published');
    expect(html).toContain('contact details will be published');
    expect(html.match(/role="status"/g)).toHaveLength(2);
  });

  it('keeps the page usable and announces independent API failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const html = renderToStaticMarkup(await HomePage());
    expect(html).toContain('couldn’t load our welcome message');
    expect(html).toContain('couldn’t load our opening times');
    expect(html.match(/role="alert"/g)).toHaveLength(2);
    expect(html).toContain('Upcoming events');
  });

  it('includes mobile-first and desktop responsive styles with reduced-motion support', () => {
    const css = readFileSync(new URL('./styles.css', import.meta.url), 'utf8');
    expect(css).toMatch(/@media \(min-width:\s*48rem\)/);
    expect(css).toMatch(/@media \(prefers-reduced-motion:\s*reduce\)/);
    expect(css).toMatch(/min-height:\s*44px/);
  });
});

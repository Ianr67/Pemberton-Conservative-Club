import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import HomePage from './page';

afterEach(() => vi.unstubAllGlobals());

describe('public club settings display', () => {
  it('renders the published contact details, hours and social links', async () => {
    const responses = [
      { introduction: 'Welcome to the demo club.' },
      {
        clubName: 'Demo Club',
        addressLine1: '1 Fictional Road',
        addressLine2: '',
        town: 'Pemberton',
        postcode: 'WN5 0AA',
        telephone: '01942 000 123',
        email: 'hello@example.test',
        openingTimes: [
          {
            day: 'Monday',
            isClosed: false,
            opensAt: '18:00',
            closesAt: '23:00',
          },
        ],
        socialLinks: [
          { platform: 'facebook', url: 'https://example.test/club' },
        ],
      },
    ];
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(responses.shift()),
        }),
      ),
    );
    const html = renderToStaticMarkup(await HomePage());
    expect(html).toContain('Demo Club');
    expect(html).toContain('1 Fictional Road');
    expect(html).toContain('18:00');
    expect(html).toContain('mailto:hello@example.test');
    expect(html).toContain('https://example.test/club');
  });
});

import type { HomepageContent, PageContent } from '@pcc/contracts';
import { browserImageUrl } from './media-url';
import { getEvents } from './event-api';
import { SiteFooter, SiteHeader } from './site';

export const dynamic = 'force-dynamic';

interface ClubSettings {
  clubName: string;
  addressLine1: string;
  addressLine2: string;
  town: string;
  postcode: string;
  telephone: string;
  email: string;
  openingTimes: Array<{
    day: string;
    isClosed: boolean;
    opensAt: string | null;
    closesAt: string | null;
  }>;
  socialLinks: Array<{ platform: string; url: string }>;
}
type ApiResult<T> =
  { status: 'ready'; data: T } | { status: 'empty' } | { status: 'error' };

async function readApi<T>(url: string): Promise<ApiResult<T>> {
  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (response.status === 404) return { status: 'empty' };
    if (!response.ok) return { status: 'error' };
    return { status: 'ready', data: (await response.json()) as T };
  } catch {
    return { status: 'error' };
  }
}

const phoneHref = (value: string) => value.replace(/[^+\d]/g, '');
const platformLabel = (value: string) =>
  value === 'x' ? 'X' : `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
const eventDate = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/London',
  day: '2-digit',
  month: 'short',
});
const eventTime = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/London',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

export default async function HomePage() {
  const base = process.env.API_BASE_URL ?? 'http://localhost:3002/api/v1';
  const [content, settings, events, functionRoom] = await Promise.all([
    readApi<HomepageContent>(`${base}/content/homepage-introduction`),
    readApi<ClubSettings>(`${base}/club-settings`),
    getEvents(),
    readApi<PageContent>(`${base}/content/pages/function-room`),
  ]);
  const clubName =
    settings.status === 'ready'
      ? settings.data.clubName
      : 'Pemberton Conservative Club';

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <div className="demo-banner" role="note">
        Demonstration website
      </div>
      <SiteHeader current="/" clubName={clubName} />
      <main id="main-content">
        <section className="hero" id="home" aria-labelledby="home-heading">
          <div className="hero-copy">
            <p className="eyebrow">A warm welcome in Pemberton</p>
            <h1 id="home-heading">Good company, right at the heart of town.</h1>
            {content.status === 'ready' ? (
              <>
                <p className="introduction">{content.data.introduction}</p>
                {content.data.image && (
                  <img
                    className="homepage-image"
                    src={browserImageUrl(content.data.image.url)}
                    alt={content.data.image.alt}
                  />
                )}
                <a className="button-link hero-action" href="/about">
                  About our club <span aria-hidden="true">→</span>
                </a>
              </>
            ) : content.status === 'empty' ? (
              <p className="content-notice" role="status">
                Our welcome message will be published here soon.
              </p>
            ) : (
              <p className="content-notice" role="alert">
                We couldn’t load our welcome message. Please try again later.
              </p>
            )}
          </div>
          <div className="hero-art" aria-hidden="true">
            <span className="hero-monogram">P</span>
            <span className="hero-est">Established locally</span>
          </div>
        </section>

        <section
          className="feature-section"
          id="whats-on"
          aria-labelledby="events-heading"
        >
          <div>
            <p className="eyebrow">Coming up</p>
            <h2 id="events-heading">A place to meet, play and enjoy.</h2>
          </div>
          <div className="homepage-events">
            {events.status === 'ready' && events.data.length > 0 ? (
              <>
                {events.data.slice(0, 3).map((event) => (
                  <article className="homepage-event" key={event.id}>
                    <time dateTime={event.startsAt}>
                      {eventDate
                        .formatToParts(new Date(event.startsAt))
                        .filter((part) => part.type !== 'literal')
                        .map((part) => (
                          <span key={part.type}>{part.value}</span>
                        ))}
                    </time>
                    <div>
                      <h3>{event.title}</h3>
                      <p>{eventTime.format(new Date(event.startsAt))}</p>
                      <a href={`/whats-on/${event.slug}`}>
                        View details <span aria-hidden="true">→</span>
                      </a>
                    </div>
                  </article>
                ))}
                <a className="outline-button" href="/whats-on">
                  View all events <span aria-hidden="true">→</span>
                </a>
              </>
            ) : (
              <div className="quiet-status" role="status">
                <h3>Upcoming events</h3>
                <p>Our next programme will be published here soon.</p>
              </div>
            )}
          </div>
        </section>

        <section
          className="room-promotion"
          id="function-room"
          aria-labelledby="room-heading"
        >
          {functionRoom.status === 'ready' && functionRoom.data.image ? (
            <img
              className="room-photo"
              src={browserImageUrl(functionRoom.data.image.url)}
              alt={functionRoom.data.image.alt}
            />
          ) : (
            <div className="room-art" aria-hidden="true">
              <span>Celebrate</span>
              <span>together</span>
            </div>
          )}
          <div className="room-copy">
            <p className="eyebrow">Your occasion, our place</p>
            <h2 id="room-heading">The function room</h2>
            <p>
              A welcoming setting for family celebrations, community groups and
              special occasions. Full room details will be available soon.
            </p>
            <a className="outline-button" href="/function-room">
              Enquire about functions <span aria-hidden="true">→</span>
            </a>
          </div>
        </section>

        <section
          className="visit-section"
          id="visit"
          aria-labelledby="visit-heading"
        >
          <div className="visit-heading">
            <p className="eyebrow">Plan your visit</p>
            <h2 id="visit-heading">Opening times &amp; contact</h2>
          </div>
          {settings.status === 'ready' ? (
            <div className="visit-grid">
              <div className="hours-panel">
                <h3>Opening times</h3>
                {settings.data.openingTimes.length ? (
                  <dl className="opening-times">
                    {settings.data.openingTimes.map((hours) => (
                      <div key={hours.day}>
                        <dt>{hours.day}</dt>
                        <dd data-closed={hours.isClosed || undefined}>
                          {hours.isClosed
                            ? 'Closed'
                            : `${hours.opensAt}–${hours.closesAt}`}
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="content-notice" role="status">
                    Opening times have not been published yet.
                  </p>
                )}
              </div>
              <div className="contact-panel">
                <h3>Find us</h3>
                <address>
                  {settings.data.addressLine1}
                  <br />
                  {settings.data.addressLine2 && (
                    <>
                      {settings.data.addressLine2}
                      <br />
                    </>
                  )}
                  {settings.data.town}
                  <br />
                  {settings.data.postcode}
                </address>
                <ul className="contact-list">
                  <li>
                    <span>Call us</span>
                    <a href={`tel:${phoneHref(settings.data.telephone)}`}>
                      {settings.data.telephone}{' '}
                      <span aria-hidden="true">→</span>
                    </a>
                  </li>
                  <li>
                    <span>Email us</span>
                    <a href={`mailto:${settings.data.email}`}>
                      {settings.data.email} <span aria-hidden="true">→</span>
                    </a>
                  </li>
                  <li>
                    <span>Visit us</span>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        [
                          settings.data.addressLine1,
                          settings.data.addressLine2,
                          settings.data.town,
                          settings.data.postcode,
                        ]
                          .filter(Boolean)
                          .join(', '),
                      )}`}
                    >
                      Get directions <span aria-hidden="true">→</span>
                    </a>
                  </li>
                </ul>
                {settings.data.socialLinks.length > 0 && (
                  <div className="social-links" aria-label="Club social media">
                    {settings.data.socialLinks.map((link) => (
                      <a key={link.platform} href={link.url} rel="noreferrer">
                        {platformLabel(link.platform)}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : settings.status === 'empty' ? (
            <p className="settings-message" role="status">
              Our opening times and contact details will be published here soon.
            </p>
          ) : (
            <p className="settings-message" role="alert">
              We couldn’t load our opening times and contact details. Please try
              again later.
            </p>
          )}
        </section>
      </main>
      <SiteFooter clubName={clubName} />
    </>
  );
}

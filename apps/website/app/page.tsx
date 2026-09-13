export const dynamic = 'force-dynamic';

interface HomepageContent {
  introduction: string;
}
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

export default async function HomePage() {
  const base = process.env.API_BASE_URL ?? 'http://localhost:3002/api/v1';
  const [content, settings] = await Promise.all([
    readApi<HomepageContent>(`${base}/content/homepage-introduction`),
    readApi<ClubSettings>(`${base}/club-settings`),
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
      <header className="site-header">
        <a className="brand" href="/" aria-label={`${clubName}, home`}>
          <span className="brand-mark" aria-hidden="true">
            PC
          </span>
          <span>{clubName}</span>
        </a>
        <nav aria-label="Main navigation">
          <ul>
            <li>
              <a href="/" aria-current="page">
                Home
              </a>
            </li>
            <li>
              <a href="/quiz-nights">Quiz nights</a>
            </li>
            <li>
              <a href="/function-room">Function room</a>
            </li>
            <li>
              <a href="/sports-and-activities">Sports &amp; activities</a>
            </li>
            <li>
              <a href="/membership">Membership</a>
            </li>
            <li>
              <a href="/about">About</a>
            </li>
            <li>
              <a href="/contact">Contact</a>
            </li>
          </ul>
        </nav>
      </header>
      <main id="main-content">
        <section className="hero" id="home" aria-labelledby="home-heading">
          <div className="hero-copy">
            <p className="eyebrow">A warm welcome in Pemberton</p>
            <h1 id="home-heading">Good company, right at the heart of town.</h1>
            {content.status === 'ready' ? (
              <p className="introduction">{content.data.introduction}</p>
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
          <div className="placeholder-card">
            <span className="card-number" aria-hidden="true">
              01
            </span>
            <div>
              <h3>Upcoming events</h3>
              <p>
                Our programme of club nights, live entertainment and community
                gatherings will appear here soon.
              </p>
            </div>
            <span className="status-pill">Programme coming soon</span>
          </div>
        </section>

        <section
          className="room-promotion"
          id="function-room"
          aria-labelledby="room-heading"
        >
          <div className="room-art" aria-hidden="true">
            <span>Celebrate</span>
            <span>together</span>
          </div>
          <div className="room-copy">
            <p className="eyebrow">Your occasion, our place</p>
            <h2 id="room-heading">The function room</h2>
            <p>
              A welcoming setting for family celebrations, community groups and
              special occasions. Full room details will be available soon.
            </p>
            <p className="status-line">Function-room information coming soon</p>
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
                        <dd>
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
                    <span>Telephone</span>
                    <a href={`tel:${phoneHref(settings.data.telephone)}`}>
                      {settings.data.telephone}
                    </a>
                  </li>
                  <li>
                    <span>Email</span>
                    <a href={`mailto:${settings.data.email}`}>
                      {settings.data.email}
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
      <footer>
        <p>{clubName}</p>
        <p>Demonstration environment — no real customer data is used.</p>
      </footer>
    </>
  );
}

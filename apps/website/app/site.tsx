import type { ReactNode } from 'react';

export interface HomepageContent {
  introduction: string;
}
export interface ClubSettings {
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
export type ApiResult<T> =
  { status: 'ready'; data: T } | { status: 'empty' } | { status: 'error' };

export async function readApi<T>(path: string): Promise<ApiResult<T>> {
  const base = process.env.API_BASE_URL ?? 'http://localhost:3002/api/v1';
  try {
    const response = await fetch(`${base}${path}`, { cache: 'no-store' });
    if (response.status === 404) return { status: 'empty' };
    if (!response.ok) return { status: 'error' };
    return { status: 'ready', data: (await response.json()) as T };
  } catch {
    return { status: 'error' };
  }
}

export async function readSharedContent() {
  const [content, settings] = await Promise.all([
    readApi<HomepageContent>('/content/homepage-introduction'),
    readApi<ClubSettings>('/club-settings'),
  ]);
  return { content, settings };
}

const links = [
  ['/', 'Home'],
  ['/quiz-nights', 'Quiz nights'],
  ['/function-room', 'Function room'],
  ['/sports-and-activities', 'Sports & activities'],
  ['/membership', 'Membership'],
  ['/about', 'About'],
  ['/contact', 'Contact'],
] as const;

export function SiteShell({
  current,
  clubName = 'Pemberton Conservative Club',
  children,
}: {
  current: string;
  clubName?: string;
  children: ReactNode;
}) {
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
            {links.map(([href, label]) => (
              <li key={href}>
                <a
                  href={href}
                  aria-current={current === href ? 'page' : undefined}
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main id="main-content">{children}</main>
      <footer>
        <div>
          <p>{clubName}</p>
          <p>Demonstration environment — no real customer data is used.</p>
        </div>
        <nav aria-label="Policy navigation">
          <a href="/policies/privacy">Privacy</a>
          <a href="/policies/cookies">Cookies</a>
          <a href="/policies/accessibility">Accessibility</a>
        </nav>
      </footer>
    </>
  );
}

export function Intro({ result }: { result: ApiResult<HomepageContent> }) {
  if (result.status === 'ready')
    return <p className="lead">{result.data.introduction}</p>;
  return (
    <p
      className="content-notice"
      role={result.status === 'error' ? 'alert' : 'status'}
    >
      {result.status === 'empty'
        ? 'Our club introduction will be published here soon.'
        : 'We couldn’t load our club introduction. Please try again later.'}
    </p>
  );
}

export function ContactSummary({
  result,
  showHours = true,
}: {
  result: ApiResult<ClubSettings>;
  showHours?: boolean;
}) {
  if (result.status !== 'ready')
    return (
      <p
        className="settings-message"
        role={result.status === 'error' ? 'alert' : 'status'}
      >
        {result.status === 'empty'
          ? 'Our contact details and opening times have not been published yet.'
          : 'We couldn’t load our contact details and opening times. Please try again later.'}
      </p>
    );
  const s = result.data;
  return (
    <div className="details-grid">
      <section aria-labelledby="contact-summary-heading">
        <h2 id="contact-summary-heading">Contact the club</h2>
        <address>
          {s.addressLine1}
          <br />
          {s.addressLine2 && (
            <>
              {s.addressLine2}
              <br />
            </>
          )}
          {s.town}
          <br />
          {s.postcode}
        </address>
        <p>
          <a href={`tel:${s.telephone.replace(/[^+\d]/g, '')}`}>
            {s.telephone}
          </a>
          <br />
          <a href={`mailto:${s.email}`}>{s.email}</a>
        </p>
      </section>
      {showHours && (
        <section aria-labelledby="hours-heading">
          <h2 id="hours-heading">Opening times</h2>
          {s.openingTimes.length ? (
            <dl className="opening-times">
              {s.openingTimes.map((x) => (
                <div key={x.day}>
                  <dt>{x.day}</dt>
                  <dd>
                    {x.isClosed ? 'Closed' : `${x.opensAt}–${x.closesAt}`}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="content-notice" role="status">
              Opening times have not been published yet.
            </p>
          )}
        </section>
      )}
    </div>
  );
}

export function PageHero({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <section className="page-hero">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      {children}
    </section>
  );
}

export function Placeholder({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      className="placeholder-section"
      aria-labelledby={`${title.toLowerCase().replace(/[^a-z]+/g, '-')}-heading`}
    >
      <p className="eyebrow">Coming soon</p>
      <h2 id={`${title.toLowerCase().replace(/[^a-z]+/g, '-')}-heading`}>
        {title}
      </h2>
      <p>{children}</p>
    </section>
  );
}

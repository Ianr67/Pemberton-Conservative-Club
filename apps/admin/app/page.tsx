import type { EventRecord } from '@pcc/contracts';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { CSSProperties, ReactNode } from 'react';

import { LogoutButton } from './logout-button';

interface User {
  displayName: string;
  email: string;
}

function Icon({ name }: { name: string }) {
  const paths: Record<string, ReactNode> = {
    dashboard: (
      <>
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
      </>
    ),
    building: (
      <>
        <path d="M3 21h18M5 18h14M6 8h12M4 8l8-5 8 5M7 8v10M11 8v10M15 8v10M19 8v10" />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    ticket: (
      <>
        <path d="M2 9a3 3 0 0 0 0 6v4h20v-4a3 3 0 0 0 0-6V5H2Z" />
        <path d="M13 5v2M13 11v2M13 17v2" />
      </>
    ),
    page: (
      <>
        <path d="M4 3h16v18H4zM8 8h8M8 12h8M8 16h5" />
      </>
    ),
    image: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="m21 15-5-5L5 21" />
      </>
    ),
    info: (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4M12 8h.01" />
      </>
    ),
    bell: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
      </>
    ),
    chart: (
      <>
        <path d="M4 20V10M10 20V4M16 20v-7M22 20V7" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1A1.7 1.7 0 0 0 15 19.4 1.7 1.7 0 0 0 14 21v.1h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1A1.7 1.7 0 0 0 4.6 15 1.7 1.7 0 0 0 3 14H3v-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3V3h4v.1A1.7 1.7 0 0 0 15 4.6a1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.1v4H21a1.7 1.7 0 0 0-1.6 1Z" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    arrow: (
      <>
        <path d="M5 12h14M13 6l6 6-6 6" />
      </>
    ),
    external: (
      <>
        <path d="M14 3h7v7M10 14 21 3M21 14v7H3V3h7" />
      </>
    ),
  };
  return (
    <svg className="dash-icon" viewBox="0 0 24 24" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

function formatEventDate(date: string) {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
}

export default async function DashboardPage() {
  const cookieHeader = (await cookies()).toString();
  const api = process.env.API_BASE_URL ?? 'http://localhost:3002/api/v1';
  const [sessionResponse, eventsResponse] = await Promise.all([
    fetch(`${api}/admin/dashboard`, {
      headers: { cookie: cookieHeader },
      cache: 'no-store',
    }),
    fetch(`${api}/admin/events`, {
      headers: { cookie: cookieHeader },
      cache: 'no-store',
    }),
  ]);
  if (!sessionResponse.ok) redirect('/login');
  const user = ((await sessionResponse.json()) as { user: User }).user;
  const events = eventsResponse.ok
    ? ((await eventsResponse.json()) as { events: EventRecord[] }).events
    : [];
  const upcoming = events
    .filter((event) => Date.parse(event.startsAt) > Date.now())
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
  const published = events.filter(
    (event) => event.status === 'published',
  ).length;
  const drafts = events.length - published;
  const today = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());
  const nav = [
    ['dashboard', 'Dashboard', '/', true],
    ['calendar', 'Events', '/events', true],
    ['building', 'Room Bookings', '#', false],
    ['users', 'Members', '#', false],
    ['ticket', 'Tickets & Sales', '#', false],
    ['page', 'Pages & Content', '/pages', true],
    ['image', 'Gallery', '#', false],
    ['info', 'Club Information', '/club-settings', true],
    ['bell', 'Notifications', '#', false],
    ['chart', 'Reports', '#', false],
    ['settings', 'Settings', '#', false],
  ] as const;

  return (
    <div className="admin-shell">
      <header className="admin-topbar">
        <div className="brand-mark">
          <span className="brand-shield">P</span>
          <span>
            <b>PEMBERTON</b>
            <small>CONSERVATIVE CLUB</small>
          </span>
        </div>
        <span className="brand-line" />
        <p className="brand-motto">More than a club. A community.</p>
        <div className="top-search">
          <Icon name="search" />
          <span>Search members, bookings, events…</span>
        </div>
        <button className="notification-button" aria-label="Notifications">
          <Icon name="bell" />
          <span>3</span>
        </button>
        <div className="user-menu">
          <span className="avatar">{user.displayName.slice(0, 1)}</span>
          <span>{user.displayName}</span>
        </div>
      </header>
      <aside className="admin-sidebar">
        <nav aria-label="Administration">
          {nav.map(([icon, label, href, ready]) =>
            ready ? (
              <Link
                key={label}
                href={href}
                className={label === 'Dashboard' ? 'active' : ''}
              >
                <Icon name={icon} />
                <span>{label}</span>
              </Link>
            ) : (
              <span
                key={label}
                className="nav-pending"
                title="Coming in a later demo slice"
              >
                <Icon name={icon} />
                <span>{label}</span>
                <small>Soon</small>
              </span>
            ),
          )}
        </nav>
        <div className="sidebar-help">
          <b>Need help?</b>
          <p>View the project guide and demo instructions.</p>
          <Link href="/pages">View content</Link>
        </div>
        <div className="sidebar-footer">
          <div className="brand-mark compact">
            <span className="brand-shield">P</span>
            <span>
              <b>PEMBERTON</b>
              <small>ADMINISTRATION</small>
            </span>
          </div>
          <small>Demo · Admin v1.0</small>
        </div>
      </aside>
      <main className="dashboard-main">
        <div className="dashboard-heading">
          <div>
            <p className="demo-label">Demonstration environment</p>
            <h1>Dashboard</h1>
            <p>Welcome back! Here’s what’s happening at the club.</p>
          </div>
          <div className="today">
            <Icon name="calendar" />
            <span>
              {today}
              <small>Club administration</small>
            </span>
          </div>
        </div>
        <section className="metric-grid" aria-label="Event summary">
          {[
            ['calendar', 'Upcoming Events', upcoming.length, 'Scheduled ahead'],
            ['page', 'Total Events', events.length, 'Shared database records'],
            ['info', 'Published', published, 'Visible on the website'],
            ['settings', 'Draft Events', drafts, 'Awaiting publication'],
          ].map(([icon, label, value, note]) => (
            <article className="metric-card" key={label}>
              <span className="metric-icon">
                <Icon name={String(icon)} />
              </span>
              <div>
                <small>{label}</small>
                <strong>{value}</strong>
                <p>{note}</p>
              </div>
            </article>
          ))}
        </section>
        <section className="quick-actions" aria-label="Quick actions">
          <Link href="/events/new">
            <Icon name="plus" />
            <span>
              <b>Add Event</b>
              <small>Create a new club event</small>
            </span>
          </Link>
          <Link className="gold" href="/club-settings">
            <Icon name="building" />
            <span>
              <b>Club Settings</b>
              <small>Update details and opening times</small>
            </span>
          </Link>
          <Link href="/pages">
            <Icon name="page" />
            <span>
              <b>Manage Content</b>
              <small>Edit and publish website pages</small>
            </span>
          </Link>
          <a className="gold" href="http://localhost:3000">
            <Icon name="external" />
            <span>
              <b>View Website</b>
              <small>Open the public website</small>
            </span>
          </a>
        </section>
        <div className="dashboard-grid">
          <section className="dashboard-panel events-panel">
            <header>
              <h2>Upcoming Events</h2>
              <Link href="/events">
                View all events <Icon name="arrow" />
              </Link>
            </header>
            <div className="event-rows">
              {upcoming.slice(0, 5).map((event) => (
                <article key={event.id} className="event-row">
                  {event.artwork?.url ? (
                    <img src={event.artwork.url} alt="" />
                  ) : (
                    <div className="event-placeholder">
                      <Icon name="calendar" />
                    </div>
                  )}
                  <div className="event-copy">
                    <b>{event.title}</b>
                    <span>{formatEventDate(event.startsAt)}</span>
                    <small>
                      {new Date(event.startsAt).toLocaleTimeString('en-GB', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      · {event.venue.name}
                    </small>
                  </div>
                  <span className={`status ${event.status}`}>
                    {event.status}
                  </span>
                  <Link className="edit-event" href={`/events/${event.id}`}>
                    Edit
                  </Link>
                </article>
              ))}
              {!upcoming.length && (
                <p className="empty-state">
                  No upcoming events.{' '}
                  <Link href="/events/new">Create the first one.</Link>
                </p>
              )}
            </div>
          </section>
          <section className="dashboard-panel publishing-panel">
            <header>
              <h2>Publishing Overview</h2>
              <Link href="/events">
                Manage <Icon name="arrow" />
              </Link>
            </header>
            <div className="donut-wrap">
              <div
                className="donut"
                style={
                  {
                    '--published': `${events.length ? (published / events.length) * 100 : 0}%`,
                  } as CSSProperties
                }
              >
                <span>
                  <b>{published}</b>
                  <small>live</small>
                </span>
              </div>
              <div className="legend">
                <p>
                  <i className="live-dot" /> Published <b>{published}</b>
                </p>
                <p>
                  <i className="draft-dot" /> Draft <b>{drafts}</b>
                </p>
                <p>
                  <i className="total-dot" /> Total <b>{events.length}</b>
                </p>
              </div>
            </div>
            <div className="publish-note">
              <Icon name="info" />
              <p>
                <b>Connected content</b>
                <span>
                  Published events are immediately available to the public
                  website and API.
                </span>
              </p>
            </div>
          </section>
          <section className="dashboard-panel activity-panel">
            <header>
              <h2>Content & Settings</h2>
            </header>
            <Link href="/pages">
              <span className="list-icon">
                <Icon name="page" />
              </span>
              <span>
                <b>Website pages</b>
                <small>Edit draft and published content</small>
              </span>
              <Icon name="arrow" />
            </Link>
            <Link href="/club-settings">
              <span className="list-icon">
                <Icon name="settings" />
              </span>
              <span>
                <b>Club information</b>
                <small>Contact details and opening times</small>
              </span>
              <Icon name="arrow" />
            </Link>
            <Link href="/events">
              <span className="list-icon">
                <Icon name="calendar" />
              </span>
              <span>
                <b>Events</b>
                <small>Review event publication status</small>
              </span>
              <Icon name="arrow" />
            </Link>
          </section>
          <section className="dashboard-panel links-panel">
            <header>
              <h2>Quick Links</h2>
            </header>
            <a href="http://localhost:3000">
              View Website <Icon name="external" />
            </a>
            <Link href="/events/new">
              Create an Event <Icon name="arrow" />
            </Link>
            <Link href="/pages/homepage-introduction">
              Edit Homepage <Icon name="arrow" />
            </Link>
            <LogoutButton />
          </section>
        </div>
      </main>
    </div>
  );
}

# Project Testing Guide

## What this guide covers

This runbook explains how to test the Pemberton Conservative Club demonstration platform on Windows with PowerShell. It covers the automated checks, PostgreSQL migration tests, local startup, API checks, and the currently implemented browser journeys.

The current implementation includes:

- Public website pages
- Published homepage content and club settings
- Public event listing and event details
- Administrator authentication
- Homepage introduction editing and publishing
- Club-settings editing and publishing
- Event creation, editing, preview, publishing, and unpublishing
- API and worker health endpoints

Tickets, checkout, payments, room booking, membership, and Android application features are not implemented yet. Do not report those journeys as failures when testing the current project.

## Prerequisites

Install and start:

- Node.js 24 or later
- Corepack with pnpm 9.15.9
- Docker Desktop with Docker Compose
- A modern browser such as Chrome, Edge, or Firefox

Run all commands from the repository root:

```powershell
Set-Location "C:\Users\ianri\Documents\Pemberton Conservative Club"
```

Confirm the tools:

```powershell
node --version
corepack pnpm --version
docker --version
docker compose version
```

Expected results:

- Node reports version 24 or later.
- pnpm reports `9.15.9`.
- Docker and Docker Compose report versions without connection errors.

## First-time setup

### 1. Install the exact dependencies

```powershell
corepack enable
pnpm install --frozen-lockfile
```

Expected result: pnpm exits with code `0` and does not report an outdated lockfile.

Do not use npm or Yarn. The repository uses pnpm and `pnpm-lock.yaml`.

### 2. Create local database configuration

Copy the example file:

```powershell
Copy-Item .env.example .env
```

Open `.env` and replace `replace-with-a-local-development-password` in both places with the same development-only password:

```dotenv
POSTGRES_DB=pcc_development
POSTGRES_USER=pcc_development
POSTGRES_PASSWORD=your-development-password
POSTGRES_PORT=5433
DATABASE_URL=postgresql://pcc_development:your-development-password@localhost:5433/pcc_development
```

If the password contains reserved URL characters, URL-encode them in `DATABASE_URL`. Do not commit `.env`.

### 3. Start PostgreSQL

Make sure Docker Desktop is running, then execute:

```powershell
pnpm db:up
```

Expected result: the `postgres` service becomes healthy and host port `5433` maps to PostgreSQL port `5432` in the container.

If port `5433` is already occupied, stop the conflicting service or select another unused `POSTGRES_PORT` and update `DATABASE_URL` to match.

### 4. Load environment variables into PowerShell

The pnpm database and API commands need `DATABASE_URL` in the process environment. In every new PowerShell window that runs database or API commands, execute:

```powershell
Get-Content .env |
  Where-Object { $_ -and -not $_.StartsWith('#') } |
  ForEach-Object {
    $name, $value = $_ -split '=', 2
    Set-Item -Path "Env:$name" -Value $value
  }
$env:NODE_ENV = 'development'
```

Verify only the non-secret settings:

```powershell
$env:NODE_ENV
$env:POSTGRES_DB
$env:POSTGRES_PORT
```

Do not print `DATABASE_URL` or the password into shared logs or screenshots.

### 5. Migrate and seed the database

```powershell
pnpm db:status
pnpm db:migrate
pnpm db:seed
pnpm db:status
```

Expected results:

- The first status may show pending migrations.
- Migration exits successfully.
- Seed reports successful deterministic development fixtures.
- The final status shows every migration as applied.

The seed contains fictional `example.test` data, published club content, one fictional venue, six published future events, and one draft event.

## Fast automated test sequence

For a normal code change, run these commands from the repository root:

```powershell
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm test:database
pnpm test:migrations
pnpm build
```

All commands should exit with code `0`. Database integration and migration tests require `DATABASE_URL` to be loaded and PostgreSQL to be running. If `DATABASE_URL` is absent, Vitest reports those tests as skipped; skipped database tests are not a successful database verification.

### What each command checks

| Command                | Purpose                                                  | Successful result                     |
| ---------------------- | -------------------------------------------------------- | ------------------------------------- |
| `pnpm format:check`    | Prettier formatting across the repository                | All matched files use Prettier style  |
| `pnpm lint`            | ESLint rules                                             | No errors or warnings                 |
| `pnpm typecheck`       | Strict TypeScript checks in all workspaces               | Every Turbo task succeeds             |
| `pnpm test`            | Unit and component tests                                 | All discovered tests pass             |
| `pnpm test:database`   | Live PostgreSQL connectivity                             | Database query test passes, not skips |
| `pnpm test:migrations` | Empty-schema migration, repeatable seed, and reset guard | Two migration tests pass, not skip    |
| `pnpm build`           | Production builds for applications and packages          | Every build task succeeds             |

There is currently no configured automated browser end-to-end command. Complete the manual browser journeys later in this guide and record that they were manual. Do not claim an automated E2E pass.

## Run one workspace while developing

Use these focused commands when changing one area:

```powershell
pnpm --filter @pcc/website test
pnpm --filter @pcc/website typecheck
pnpm --filter @pcc/website build

pnpm --filter @pcc/admin test
pnpm --filter @pcc/admin typecheck
pnpm --filter @pcc/admin build

pnpm --filter @pcc/api test
pnpm --filter @pcc/api typecheck
pnpm --filter @pcc/api build

pnpm --filter @pcc/contracts test
pnpm --filter @pcc/database test
```

Focused checks are useful during development but do not replace the full root sequence before handoff.

## Start the local platform

Use three PowerShell windows. PostgreSQL must already be running and migrated.

### Window 1: shared API

Load `.env` as described earlier, set development mode, and start the API:

```powershell
$env:NODE_ENV = 'development'
pnpm --filter @pcc/api dev
```

Expected URL: `http://localhost:3002/api/v1/health`

### Window 2: administration portal

```powershell
pnpm --filter @pcc/admin dev
```

Expected URL: `http://localhost:3001`

The documented default API URL is already `http://localhost:3002/api/v1`. If it must be overridden, create `apps/admin/.env.local` from `apps/admin/.env.example`.

### Window 3: public website

```powershell
pnpm --filter @pcc/website dev
```

Expected URL: `http://localhost:3000`

If needed, create `apps/website/.env.local` from `apps/website/.env.example` and set `API_BASE_URL` to the shared API version root.

Do not start a second source of event data. The public website must read events from the shared API.

## API smoke tests

Run these in a fourth PowerShell window while the API is running.

### API liveness

```powershell
Invoke-RestMethod http://localhost:3002/api/v1/health
```

Expected response fields:

```text
service : api
status  : ok
```

### Database readiness

```powershell
Invoke-RestMethod http://localhost:3002/api/v1/health/database
```

Expected response fields:

```text
service : database
status  : ok
```

Liveness may remain healthy while database readiness fails. That distinction is intentional.

### Published homepage introduction

```powershell
Invoke-RestMethod http://localhost:3002/api/v1/content/homepage-introduction
```

Expected result: a published introduction is returned. Draft text must not be exposed.

### Published club settings

```powershell
Invoke-RestMethod http://localhost:3002/api/v1/club-settings
```

Expected result: fictional club contact information and structured opening times are returned.

### Public event listing

```powershell
$eventsResponse = Invoke-RestMethod http://localhost:3002/api/v1/events
$eventsResponse.events.Count
$eventsResponse.events | Select-Object slug, title, status, visibility, startsAt
```

Expected results after a clean seed:

- Six published public events are listed.
- Every listed record has `status` equal to `published`.
- Every listed record has `visibility` equal to `public`.
- Events are ordered by `startsAt`.
- The seeded draft event is absent.

Test those conditions directly:

```powershell
if ($eventsResponse.events.Count -ne 6) { throw 'Expected six public events.' }
if ($eventsResponse.events.Where({ $_.status -ne 'published' }).Count) { throw 'A non-published event leaked.' }
if ($eventsResponse.events.Where({ $_.visibility -ne 'public' }).Count) { throw 'A non-public event leaked.' }
```

### Public event detail

Use a slug returned by the listing rather than assuming one:

```powershell
$slug = $eventsResponse.events[0].slug
$event = Invoke-RestMethod "http://localhost:3002/api/v1/events/$slug"
$event | Select-Object slug, title, description, doorsAt, startsAt, endsAt, venue
```

Expected result: the detail corresponds to the selected listing record and includes its venue and timestamps.

### Unknown event behaviour

```powershell
try {
  Invoke-RestMethod http://localhost:3002/api/v1/events/this-event-does-not-exist
  throw 'Expected a 404 response.'
} catch {
  if ($_.Exception.Response.StatusCode.value__ -ne 404) { throw }
  'Received expected event 404.'
}
```

Expected result: HTTP `404`. The API error body should use code `event_not_found` and must not contain a stack trace.

## Manual browser test: public website

Use a freshly seeded database first. Open `http://localhost:3000`.

### Website shell and homepage

1. Confirm the `Demonstration website` banner is visible.
2. Confirm there is one visible page heading.
3. Confirm `What is on` appears in the primary navigation.
4. Confirm the published introduction, fictional address, opening times, phone number, and email are visible.
5. Use the keyboard only. Press Tab and confirm the skip link becomes visible and moves focus to the main content when activated.
6. Tab through links and confirm every focused element has a visible focus indicator.
7. Confirm policy links are present in the footer.

### What is on listing

Open `http://localhost:3000/whats-on`.

1. Confirm the page heading is `What is on`.
2. Confirm the six API events appear as cards.
3. Compare titles and ordering with `GET /api/v1/events`.
4. Confirm every card includes a date, local time, title, description, and venue.
5. Confirm artwork is meaningful or the decorative `PC` fallback is used.
6. Confirm event-card links can be reached and activated with the keyboard.
7. Confirm the current navigation item is visibly identified.
8. Resize to approximately 320 CSS pixels wide. Confirm there is no horizontal page scrolling and no clipped card text.
9. Resize above 768 pixels and then above 1120 pixels. Confirm the cards adapt from one to two and then three columns.
10. Zoom the browser to 200%. Confirm the content remains readable and operable.

### Event details

Open one event card.

1. Confirm the URL uses `/whats-on/{slug}`.
2. Confirm title, complete description, date, start time, doors time, venue, and artwork match the API response.
3. Confirm the date is unambiguous and represented by semantic `time` elements when inspected.
4. Confirm `Back to all events` returns to the listing.
5. Confirm there are no ticket, checkout, payment, booking, or membership controls.
6. Inspect the document title and description metadata using browser developer tools. Confirm they describe the selected event.

### Event not found

Open:

```text
http://localhost:3000/whats-on/this-event-does-not-exist
```

Confirm:

- The server responds with HTTP `404`, visible in the Network panel.
- The page says the event is not available.
- No internal error or stack trace appears.
- `View upcoming events` returns to the listing.

### Event API failure

1. Keep the website development server running.
2. Stop the API with Ctrl+C in its PowerShell window.
3. Reload `/whats-on`.
4. Confirm an announced `We could not load the events` state appears.
5. Confirm a `Try again` action is available.
6. Open an event-detail URL and confirm its retryable failure state appears rather than a false not-found state.
7. Restart the API and activate `Try again`.
8. Confirm the events return.

The automated website tests cover the event empty state because creating an empty database is not part of an ordinary manual smoke test. If manually testing it, use an isolated disposable test database; do not delete or unpublish shared demonstration records merely to create the condition.

## Manual browser test: administrator authentication

Open `http://localhost:3001` in a private browser window.

Expected result: unauthenticated access redirects to `/login`.

Use the fictional development account:

```text
Email: admin@pemberton-club.example.test
Password: PembertonDemo!2026
```

1. Enter an incorrect password and confirm the error is safe and does not reveal whether unrelated accounts exist.
2. Enter the correct credentials.
3. Confirm the dashboard appears.
4. Confirm the browser receives an HttpOnly session cookie in developer tools.
5. Sign out and confirm protected pages redirect to login.
6. Sign in again for the remaining administration tests.

These are fictional development credentials. Never enable them in production.

## Manual connected-data test: homepage publishing

This verifies that the administrator and website share backend records.

1. In the admin portal, open `Manage pages` and then `Homepage introduction`.
2. Note the current published version.
3. Add a distinctive fictional suffix, for example `Manual test publication.`
4. Select `Save draft`.
5. Confirm the status says the public website is unchanged.
6. Reload `http://localhost:3000` and confirm the suffix is not visible.
7. Open `Preview draft` and confirm the suffix is visible in preview.
8. Return to the editor and select `Publish`.
9. Reload the public homepage.
10. Confirm the suffix now appears without a website code change.
11. Call the public homepage API and confirm it returns the same published text.

Reset demo data after completing mutation tests.

## Manual connected-data test: club settings publishing

1. In the admin portal, open `Edit club settings`.
2. Change a harmless fictional field, such as the telephone number, while keeping all required values valid.
3. Select `Save draft`.
4. Confirm the public website and `GET /api/v1/club-settings` remain unchanged.
5. Select `Publish draft`.
6. Reload the public contact page and homepage.
7. Confirm the new value appears.
8. Call the public settings API and confirm it matches.
9. Enter an invalid email or invalid opening range and confirm validation prevents a bad save and presents useful errors.

Reset demo data after completing mutation tests.

## Manual connected-data test: event publishing

1. In the admin portal, open `Manage events`.
2. Select `Create event`.
3. Use clearly fictional data and a unique lowercase slug, for example `manual-test-social`.
4. Choose the fictional seeded venue.
5. Set doors, start, and end times in valid chronological order and in the future.
6. Enter a positive capacity.
7. If adding artwork, use an HTTPS URL, meaningful alternative text, and valid positive dimensions.
8. Save the event as a draft.
9. Open its authenticated preview and confirm all fields.
10. Check `/whats-on` and `GET /api/v1/events`; confirm the draft is absent.
11. Publish the event in admin.
12. Reload `/whats-on`; confirm the event appears in chronological order.
13. Open its public details and confirm all data matches.
14. Call `GET /api/v1/events/manual-test-social` and confirm it matches the browser.
15. Unpublish the event.
16. Confirm it disappears from the public listing.
17. Confirm its former public detail URL returns the event not-found experience and HTTP `404`.
18. Confirm its authenticated admin preview remains available.

This journey must not require editing website source or adding static event JSON.

## Reset the demonstration data

After manual tests that change content, settings, or events, restore deterministic fixtures:

```powershell
$env:NODE_ENV = 'development'
pnpm db:reset
```

Expected result: the reset reports success and restores the baseline fictional records.

The reset intentionally refuses to run unless `NODE_ENV` is exactly `development`. Verify the safety guard only through the automated migration test or against an isolated test database. Do not point reset commands at production or shared client data.

After reset:

```powershell
$eventsResponse = Invoke-RestMethod http://localhost:3002/api/v1/events
$eventsResponse.events.Count
```

Expected result: `6`.

## Accessibility test checklist

Perform this on the public homepage, event listing, one event detail, login, event editor, content editor, and settings editor.

### Keyboard

- Complete the journey using Tab, Shift+Tab, Enter, Space, arrow keys where applicable, and Escape where applicable.
- Confirm focus order follows the visual and reading order.
- Confirm focus is always visible.
- Confirm no keyboard trap exists.
- Confirm buttons and links perform the action described by their labels.

### Screen reader

Use Narrator or NVDA on Windows, and test a representative journey with a browser combination it supports.

- Confirm the page title and one primary heading are announced.
- Navigate by headings and landmarks.
- Confirm navigation labels are meaningful.
- Confirm event dates and times are read as understandable phrases.
- Confirm meaningful artwork has useful alternative text and decorative fallback artwork is ignored.
- Trigger validation and API errors and confirm they are announced.
- Confirm status updates after saving and publishing are announced.

### Zoom and reflow

- Test browser zoom at 200% and 400% where practical.
- Test at 320 CSS pixels wide.
- Confirm no information or controls are lost.
- Confirm text does not overlap or clip.
- Confirm two-dimensional scrolling is not required for ordinary page content.

### Colour and motion

- Check text, controls, focus rings, and status content with a contrast analyser.
- Confirm colour is not the sole indicator of current, success, or error states.
- Enable reduced motion at operating-system level and confirm no essential information depends on animation.

Record the browser, assistive technology, version, page, and result. Automated component tests do not replace these manual accessibility checks.

## Responsive browser matrix

At minimum, manually test:

| Target          | Suggested viewport   |
| --------------- | -------------------- |
| Small phone     | 320 × 568            |
| Typical phone   | 390 × 844            |
| Tablet portrait | 768 × 1024           |
| Laptop          | 1366 × 768           |
| Large desktop   | 1440 × 900 or larger |

Use at least Chrome or Edge and Firefox. If Safari support is required, test on real Safari rather than relying solely on browser emulation.

## Failure and recovery checks

Verify these behaviours without changing production code:

- API stopped: website shows retryable errors.
- PostgreSQL stopped while API remains running: liveness stays available and database readiness fails safely.
- Unknown event slug: API and website return `404`.
- Invalid admin login: safe error and rate limiting after repeated failures.
- Invalid event times or slug: API rejects the request and admin shows validation errors.
- Invalid club settings: draft is not saved.
- Draft content or event: never appears through public endpoints.
- API restarted: public pages recover after retry or reload.

To test database readiness failure:

```powershell
pnpm db:down
```

Then call both health endpoints. Restart PostgreSQL afterward:

```powershell
pnpm db:up
```

`db:down` retains the named Docker volume. Do not use volume-deleting flags.

## Troubleshooting

### Database tests are skipped

Cause: `DATABASE_URL` is not present in the PowerShell process.

Fix: load `.env` using the provided PowerShell snippet, confirm Docker PostgreSQL is healthy, and rerun the tests.

### API reports database unavailable

Check:

```powershell
docker compose ps
pnpm db:status
```

Confirm the password, port, database, and user in `.env` agree with `DATABASE_URL`.

### Website or admin cannot reach the API

Confirm:

```powershell
Invoke-RestMethod http://localhost:3002/api/v1/health
```

Then check `API_BASE_URL` in the relevant `.env.local`. It must include `/api/v1` and must be reachable from the Next.js server process.

### A port is already in use

The defaults are:

- Website: `3000`
- Admin: `3001`
- API: `3002`
- Worker: `3003`
- PostgreSQL: `5433`

Stop the conflicting process or deliberately update all dependent configuration.

### Production build fails with a worker permission error

Close processes holding `.next` files, ensure the repository is writable, and retry in a normal local PowerShell session. Do not weaken source checks to work around an environment restriction.

### Seed data appears duplicated

The seed is intended to be idempotent. Run `pnpm db:reset` in development and inspect the exact failed stage if duplicates remain. Do not manually delete arbitrary database records.

## Test evidence to record

For each handoff, record:

- Git commit or exact working-tree state tested
- Date, tester, operating system, Node, pnpm, Docker, and browser versions
- Environment used and API base URL, excluding credentials
- Each automated command and exit result
- Confirmation that database tests passed rather than skipped
- Manual journeys completed
- Viewports and browsers checked
- Accessibility tools and results
- Screenshots of relevant states containing fictional data only
- Defects with reproduction steps, expected result, actual result, and logs stripped of secrets
- Known limitations and untested paths

## Final release-candidate checklist

Before describing the current project as tested:

1. Start from a clean dependency installation using the lockfile.
2. Start PostgreSQL and load `DATABASE_URL`.
3. Run migrations and deterministic seed.
4. Run format, lint, type-check, all unit tests, database tests, migration tests, and production build.
5. Confirm no database test was skipped.
6. Start API, admin, and website.
7. Run API smoke tests.
8. Complete homepage, settings, and event publish/unpublish connected-data journeys.
9. Complete public event list, detail, not-found, loading, and API-failure checks.
10. Complete keyboard, screen-reader, zoom, and responsive checks.
11. Reset demonstration data.
12. Record evidence and every limitation.

The project currently has automated unit, component, integration, and migration coverage, but no automated browser E2E suite. A complete current handoff therefore requires both the passing commands and the documented manual browser checks above.

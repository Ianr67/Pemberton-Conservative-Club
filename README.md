# Pemberton Conservative Club Website and CMS

This monorepo contains the club's public website, administration portal, shared API, PostgreSQL data layer, and shared packages.

The initial release is deliberately limited to public content and staff content management. It includes administrator authentication, publishing, club settings, media, events, quiz nights, and informational contact, function-room, and membership pages. It does not include tickets, payments, room-booking management, customer or member accounts, membership records or renewals, notifications, or mobile applications.

## Prerequisites

- Node.js 24 (see `.nvmrc`)
- pnpm 9.15.9 through Corepack
- Docker Desktop with Docker Compose

## Getting started

```powershell
corepack enable
pnpm install
pnpm build
```

## Workspace layout

- `apps/website` — public Next.js website
- `apps/admin` — Next.js administration portal
- `apps/api` — shared NestJS API
- `apps/worker` — retained, inactive background-work foundation; not part of the initial deployment or normal test path
- `packages/contracts` — shared API contracts
- `packages/validation` — shared runtime and environment validation
- `packages/database` — database package boundary
- `packages/design-system` — shared visual tokens
- `packages/config` — shared TypeScript configuration
- `packages/testing` — shared test fixtures and helpers

## Quality commands

```powershell
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Local applications

Copy each application's `.env.example` to `.env.local` for local overrides. The documented defaults work without local files.

| Application           | Development command              | Local URL                             |
| --------------------- | -------------------------------- | ------------------------------------- |
| Public website        | `pnpm --filter @pcc/website dev` | `http://localhost:3000`               |
| Administration portal | `pnpm --filter @pcc/admin dev`   | `http://localhost:3001`               |
| API                   | `pnpm --filter @pcc/api dev`     | `http://localhost:3002/api/v1/health` |

Normal development uses the website, administration portal, API, and PostgreSQL only. The retained worker is not required for any current journey.

## Local PostgreSQL

The development database runs as PostgreSQL 17 in Docker Compose. It is published on port `5433` so it does not conflict with a native PostgreSQL installation on the default port.

1. Create the ignored local environment file:

   ```powershell
   Copy-Item .env.example .env
   ```

2. Replace the example password in `.env`. Keep `POSTGRES_PASSWORD` and the password embedded in `DATABASE_URL` synchronized. URL-encode special characters in the connection URL.

3. Start the dedicated development database:

   ```powershell
   pnpm db:up
   ```

4. Start the API with the root environment loaded into the current PowerShell session:

   ```powershell
   Get-Content .env | Where-Object { $_ -and -not $_.StartsWith('#') } | ForEach-Object {
     $name, $value = $_ -split '=', 2
     Set-Item -Path "Env:$name" -Value $value
   }
   pnpm --filter @pcc/api dev
   ```

5. Check liveness and database readiness:

   ```powershell
   Invoke-RestMethod http://localhost:3002/api/v1/health
   Invoke-RestMethod http://localhost:3002/api/v1/health/database
   ```

6. Run the live database connectivity test when PostgreSQL is running:

   ```powershell
   pnpm test:database
   ```

## Database migrations and development fixtures

The repository uses a small, forward-only SQL migration runner in `@pcc/database`. Migration files live in `packages/database/migrations`, execute transactionally in filename order, and are recorded with a SHA-256 checksum in `_pcc_migrations`. Never edit an applied migration; add the next numbered SQL file instead.

Load the root `.env` values into the current PowerShell session as shown above, then use:

```powershell
pnpm db:status
pnpm db:migrate
pnpm db:seed
pnpm test:migrations
```

- `db:status` reports each migration as `pending` or `applied` and fails if an applied file has changed.
- `db:migrate` safely reapplies the migration set and does nothing when the database is current.
- `db:seed` first migrates, then idempotently inserts deterministic fictional users, roles, permissions, assignments, and an audit event. Seed addresses use only `example.test`. Set `NODE_ENV=development` before running it; the command fails closed in every other environment.
- `test:migrations` creates an isolated temporary schema, migrates it from empty, applies the seed twice, exercises the reset guard, and removes the temporary schema.

To restore only the known development-owned identity and audit records, explicitly set the environment and run:

```powershell
$env:NODE_ENV = 'development'
pnpm db:reset
```

The reset truncates only the known demo-owned identity, content, settings, venue, event, session, permission, and audit records, then reapplies the deterministic fixtures. It refuses to connect or change data unless `NODE_ENV` is exactly `development`; `production`, `test`, and missing values all fail closed. It does not drop the database, migrations, other schemas, or the Docker volume.

Use `pnpm db:logs` to inspect PostgreSQL and `pnpm db:down` to stop it. The named development volume is retained by `db:down`; no command in this step deletes database data.

`GET /api/v1/health` is a liveness endpoint and remains healthy when PostgreSQL is unavailable. `GET /api/v1/health/database` checks PostgreSQL directly and returns HTTP 503 with a safe response when it cannot connect.

The current schema covers the identity, authorization, session, audit, homepage content, club settings, venue, and event foundations only.

## Demonstration administrator

After migrating and seeding with `NODE_ENV=development`, start the API and administration portal, then open `http://localhost:3001`.

- Email: `admin@pemberton-club.example.test`
- Password: `PembertonDemo!2026`

This account and password are fictional and development-only. Passwords are stored as salted scrypt hashes. Successful login creates an eight-hour session whose random token is kept in an `HttpOnly`, `SameSite=Lax` browser cookie (`Secure` in production); only its SHA-256 hash is stored in PostgreSQL. The API independently checks the active session, administrator role, and `administration.access` permission for the dashboard. Signing out revokes the database session and clears the cookie. Login attempts are limited to five failures per IP/email pair in fifteen minutes, and login successes, failures, and logout are appended to `audit_events`.

## Homepage introduction content slice

Sign in to the administration portal, choose **Manage pages**, and open **Homepage introduction**. The editor can upload or select an existing media-library image and requires page-specific alternative text when an image is selected. Saving creates a new draft version without changing the public endpoint or website. **Preview draft** is authenticated, permission-protected, uncached and shows the latest saved draft. Publishing the selected draft atomically updates the public version and appends `content.homepage_published` to the audit trail. The public website reads only `GET /api/v1/content/homepage-introduction`; no draft content is exposed there.

The same page list also exposes versioned editors for About, Membership information, Quiz nights, Function room, and Sports and activities. Their published eyebrow, heading, and introductory body are read by the corresponding public route through `GET /api/v1/content/pages/:slug`. Membership here is public information only; member accounts, records, renewals, and digital cards are deferred. Saving a draft does not affect visitors; publishing updates the shared database pointer and writes a `content.page_published` audit event. Contact details and opening times remain structured club settings, while What is on and event details remain structured event records.

## Club settings slice

The dashboard's **Edit club settings** screen manages the club name, structured postal address and contact details, seven structured daily opening-time records, and supported HTTPS social links. Saving records an audited draft; publishing atomically selects and audits that version. The website reads only published settings from the read-only `GET /api/v1/club-settings` endpoint. Seeded contact details and social profiles are fictional demonstration data.

## Event administration and public event API

The administration dashboard links to event list, create, edit and authenticated preview screens. Users require the `events.manage` permission to read or change event administration records. Publishing and unpublishing update the shared PostgreSQL record and append an audit event atomically.

- `GET /api/v1/events` lists published events whose visibility is `public`.
- `GET /api/v1/events/:slug` returns a published public or unlisted event by slug.
- Draft events return `404` from both public endpoints and remain available through authenticated admin preview only.

The development seed provides one fictional venue, six published future events (including two quiz nights), and one draft event. Event and page editors accept JPEG, PNG, WebP and GIF uploads up to 5 MB and require alternative text before saving. Uploaded files are served through the public API; existing external image URLs remain supported by the contract.

Media storage is selected explicitly with `MEDIA_STORAGE_DRIVER`:

- `filesystem` is the local-development default and stores objects below `MEDIA_STORAGE_PATH` (default `.media`).
- `s3` is the production adapter and requires the HTTPS endpoint, region, private bucket, access key, and secret key documented in `apps/api/.env.example` and the Railway guide.

Uploads receive generated `media/<uuid>.<extension>` object keys; original filenames are retained only as PostgreSQL metadata and are never used as paths. The API preserves the existing `/api/v1/media/:id` public URL, streams objects through the selected adapter, and stores no media bytes in PostgreSQL. S3-compatible tests use a mocked client and require no cloud credentials.

Authenticated content editors can upload an image or select an existing image from the bounded, newest-first media library when editing a standard CMS page. Selection records the existing media identifier on the new page version and never copies the object. Alternative text belongs to that page version and is required before its draft can be saved or published. Draft preview is authenticated and uncached; public page APIs continue to expose only the selected published version.

## Deferred reference material

Mobile guidance is retained for a possible later phase under `docs/deferred/`. It is not part of the initial release and does not authorise mobile-specific endpoints or application work.

# Pemberton Conservative Club Demo Platform

This monorepo contains the foundations for the club's demonstration website, administration portal, shared API, worker, and shared packages.

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
- `apps/worker` — background-work foundation
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
| Worker health server  | `pnpm --filter @pcc/worker dev`  | `http://localhost:3003/health`        |

The repository foundation includes startup pages for both Next.js applications and health responses for the API and worker. PostgreSQL, authentication, domain features, and deployment are deliberately deferred.

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

The reset truncates only `users`, `roles`, `permissions`, their assignments, `sessions`, and `audit_events`, then reapplies the deterministic fixtures. It refuses to connect or change data unless `NODE_ENV` is exactly `development`; `production`, `test`, and missing values all fail closed. It does not drop the database, migrations, other schemas, or the Docker volume.

Use `pnpm db:logs` to inspect PostgreSQL and `pnpm db:down` to stop it. The named development volume is retained by `db:down`; no command in this step deletes database data.

`GET /api/v1/health` is a liveness endpoint and remains healthy when PostgreSQL is unavailable. `GET /api/v1/health/database` checks PostgreSQL directly and returns HTTP 503 with a safe response when it cannot connect.

No business-domain schema is included yet; this migration is limited to the identity, authorization, session, and audit foundations.

## Demonstration administrator

After migrating and seeding with `NODE_ENV=development`, start the API and administration portal, then open `http://localhost:3001`.

- Email: `admin@pemberton-club.example.test`
- Password: `PembertonDemo!2026`

This account and password are fictional and development-only. Passwords are stored as salted scrypt hashes. Successful login creates an eight-hour session whose random token is kept in an `HttpOnly`, `SameSite=Lax` browser cookie (`Secure` in production); only its SHA-256 hash is stored in PostgreSQL. The API independently checks the active session, administrator role, and `administration.access` permission for the dashboard. Signing out revokes the database session and clears the cookie. Login attempts are limited to five failures per IP/email pair in fifteen minutes, and login successes, failures, and logout are appended to `audit_events`.

# Railway Hosting Guideline

## Initial-release scope

Deploy only the public website, CMS/admin portal, API, PostgreSQL, and S3-compatible object storage. `apps/worker` remains in the repository but is not deployed. Mobile clients, tickets, payments, room-booking management, customer or member accounts, membership records and renewals, digital cards, and notifications are deferred.

Membership information remains normal published website content. Contact and function-room pages remain informational and direct visitors to the club's published contact details.

## Required services

| Service | Public | Purpose |Documentation and configuration alignment is complete on branch chore/website-cms-scope-alignment.

Changes made:

Updated [README.md](C:\Users\ianri\Documents\Pemberton Conservative Club\README.md) for the corrected initial scope.
Reworked [Railway Hosting Guideline.md](C:\Users\ianri\Documents\Pemberton Conservative Club\Railway Hosting Guideline.md) around website, admin, API, PostgreSQL, and S3-compatible storage only.
Reworked [Project Testing Guide.md](C:\Users\ianri\Documents\Pemberton Conservative Club\Project Testing Guide.md) to exclude the worker from normal journeys.
Moved both mobile guides into [docs/deferred](C:\Users\ianri\Documents\Pemberton Conservative Club\docs\deferred) with a deferral notice.
Clarified in [apps/api/.env.example](C:\Users\ianri\Documents\Pemberton Conservative Club\apps\api.env.example) that filesystem media storage is development-only.
Kept Membership Information explicitly in scope.
Kept contact and function-room pages informational.
Did not alter application code, migrations, or database records.
Preserved the pre-existing uncommitted AGENTS.md change.
Verification:

pnpm format:check — passed after formatting the Railway guide
pnpm lint — passed
pnpm typecheck — passed
pnpm test — passed; 3 database tests skipped because DATABASE_URL was unavailable to that process
pnpm build — passed outside the sandbox; the initial sandbox run encountered spawn EPERM
git diff --check — passed
Migration/application-code diff — empty
Database integration and migration tests could not be completed because Docker Desktop is not running.

S3 storage has only been documented in this step; it has not yet been implemented or represented as production-ready. The next logical step is the S3-compatible storage adapter with local-development fallback and focused tests.
| ---------- | ---------------------- | ------------------------------------------- |
| `website` | Yes | Public Next.js website |
| `admin` | Yes | Authenticated CMS |
| `api` | Yes | Versioned public/CMS API and media delivery |
| `postgres` | No | Structured source of truth |
| `media` | No management endpoint | Production media objects |

Use separate staging and production databases and buckets. `compose.yaml` is for local PostgreSQL only.

## Readiness gaps

Before deployment:

1. Add and test production `start` scripts for both Next.js applications.
2. Implement and test the S3-compatible adapter; the current filesystem adapter is local-development only.
3. Test service-specific Railway configuration and API binding to Railway's `PORT`.
4. Complete authentication, cookie, proxy, CORS, security-header, backup, restore, monitoring, and secret-rotation reviews.
5. Replace development administrator fixtures with an approved provisioning process.

Do not describe the deployment as production-ready while an applicable item remains open.

## Build and start

Keep the repository root as build context. Use Node 24 and the declared pnpm version.

```text
corepack enable && pnpm install --frozen-lockfile && pnpm build
```

Expected start commands after frontend start scripts are added:

| Service   | Command                            |
| --------- | ---------------------------------- |
| `api`     | `pnpm --filter @pcc/api start`     |
| `website` | `pnpm --filter @pcc/website start` |
| `admin`   | `pnpm --filter @pcc/admin start`   |

Never use development/watch commands in a deployment.

## Variables

API:

```text
NODE_ENV=production
DATABASE_URL=${{postgres.DATABASE_URL}}
PUBLIC_API_URL=https://${{api.RAILWAY_PUBLIC_DOMAIN}}/api/v1
MEDIA_STORAGE_DRIVER=s3
S3_ENDPOINT=<provider HTTPS endpoint>
S3_REGION=<provider region>
S3_BUCKET=<private bucket name>
S3_ACCESS_KEY_ID=<secret>
S3_SECRET_ACCESS_KEY=<secret>
S3_FORCE_PATH_STYLE=<true only when required>
```

These S3 names are the intended upcoming adapter contract and must be confirmed by implementation and tests. Do not configure `MEDIA_STORAGE_PATH` in production. Keep the bucket private, block anonymous writes/listing, use least-privilege credentials, and configure encryption, lifecycle, versioning, and recovery deliberately.

Website:

```text
NODE_ENV=production
API_BASE_URL=http://${{api.RAILWAY_PRIVATE_DOMAIN}}:${{api.PORT}}/api/v1
NEXT_PUBLIC_API_BASE_URL=https://${{api.RAILWAY_PUBLIC_DOMAIN}}/api/v1
```

Only define the public value when browser access requires it; it must contain no secret.

Admin:

```text
NODE_ENV=production
API_BASE_URL=http://${{api.RAILWAY_PRIVATE_DOMAIN}}:${{api.PORT}}/api/v1
```

Only the API receives database and object-storage credentials.

## Migrations

Use `pnpm db:migrate` as the API pre-deploy command. Never edit an applied migration, use `db:reset`, or automatically seed development credentials in production. Test from empty and preceding schemas and back up before risky changes.

## Domains and health

Create HTTPS domains for website, admin, and API. Keep PostgreSQL and storage management private.

| Service   | Health path      |
| --------- | ---------------- |
| `api`     | `/api/v1/health` |
| `website` | `/`              |
| `admin`   | `/login`         |

Monitor `/api/v1/health/database` separately as readiness.

## Deployment and smoke tests

1. Pass `Project Testing Guide.md` checks.
2. Provision private PostgreSQL and object storage.
3. Review secrets and reference variables.
4. Deploy API with migrations and verify health, readiness, and media upload/retrieval.
5. Deploy admin and website.
6. Verify sign-in/out; draft/preview/publish; settings/opening times; membership information; events/quiz nights; media; and informational contact/function-room pages.
7. Confirm no worker or deferred feature is deployed or advertised.
8. Record release identifiers, migration state, evidence, and rollback points.

Coordinate database and media backup/restoration because PostgreSQL stores references while the bucket stores bytes. Prefer forward fixes; application rollback does not reverse migrations.

Recheck current Railway and storage-provider documentation immediately before deployment because platform behaviour can change.

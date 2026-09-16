# Project Testing Guide

## Scope

Test the public website, CMS/admin portal, API, PostgreSQL, and media paths. The retained worker is excluded from normal testing. Mobile applications, tickets, payments, room-booking management, customer or member accounts, membership records/renewals, digital cards, and notifications are deferred.

Membership information is published content. Contact and function-room pages are informational and must show clear published contact details without implying a booking workflow.

## Setup

Use Node 24, pnpm 9.15.9 through Corepack, and Docker Desktop.

```powershell
corepack enable
pnpm install --frozen-lockfile
Copy-Item .env.example .env
pnpm db:up
```

Replace the example password, load `.env` into PowerShell, set `NODE_ENV=development`, then run `pnpm db:migrate` and `pnpm db:seed`. Never seed or reset production.

## Automated checks

Run after each logical implementation step and before handoff:

```powershell
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm test:database
pnpm test:migrations
pnpm build
```

Database checks require running PostgreSQL and a loaded `DATABASE_URL`; a skip is not success. There is no automated browser E2E command, so record manual testing. Root commands still discover the retained worker workspace; do not start, deploy, or add worker acceptance journeys, and report any incidental worker-only failure separately.

## Local platform

Start only:

```powershell
pnpm --filter @pcc/api dev
pnpm --filter @pcc/admin dev
pnpm --filter @pcc/website dev
```

Use website `http://localhost:3000`, admin `http://localhost:3001`, API health `http://localhost:3002/api/v1/health`, and readiness `http://localhost:3002/api/v1/health/database`.

## Required journeys

### API and authentication

- Public content endpoints expose published versions only.
- `/content/pages/membership` returns informational membership content.
- `/club-settings` returns published contact details/opening times.
- `/events` and `/events/:slug` enforce publication and visibility rules.
- Protected endpoints reject unauthenticated/unauthorised requests.
- Invalid sign-in fails safely and is rate-limited; sign-out revokes the session.

### Content and settings

For homepage, Membership information, Function room, and another page: save a draft, confirm it is not public, preview it, explicitly publish it, verify public output, and confirm audit creation. Membership must remain informational. Function-room content must direct visitors to club contact details without availability or booking claims.

Draft and publish fictional club contact/opening-time changes. Confirm homepage, Contact, and Function room use only published values. Invalid email, URL, and time ranges must be rejected without losing input. No enquiry form is required.

### Events and quiz nights

Create fictional event and quiz-night drafts; preview, publish, verify list/detail output, then unpublish. Confirm no ticket, checkout, payment, reservation, or booking control appears.

### Media

With local `MEDIA_STORAGE_PATH`, test supported types and limits, safe rejection, required alternative text when published, page/event use, and retrieval. Confirm PostgreSQL contains metadata/references, not bytes.

Unit tests exercise adapter selection, safe keys, filesystem operations in a temporary directory, and S3 commands through a mocked client. Before production, repeat the upload/retrieval journey against an isolated S3-compatible staging bucket. Verify private credentials, missing-object behaviour, cleanup after failed writes, and operation without `MEDIA_STORAGE_PATH`. Production media remains unverified until that provider smoke test passes.

### Website and accessibility

Test homepage, What is on/detail, Quiz nights, Function room, Membership information, Contact, About, sports/activities, and policies. Verify CMS/API consistency, no draft leakage, Membership navigation, clear phone/email calls to action, and no operational deferred feature.

Check loading, empty, error, retry, and not-found states. Test keyboard use, visible focus, headings/landmarks, labels/errors/status announcements, alternative text, contrast, reduced motion, 320 CSS-pixel reflow, zoom, and representative tablet/desktop widths in Chrome/Edge and Firefox. Use real Safari when required.

## Failure and recovery

- API stopped: public failures are safe and retryable.
- PostgreSQL stopped: liveness stays distinct from readiness.
- Unknown event/media: safe `404`.
- Invalid writes: no partial record.
- Failed media write/transaction: no usable metadata or unmanaged object.
- Restarted dependencies: recovery after retry/reload.

`pnpm db:down` retains the local volume; do not use volume-deleting flags for ordinary tests.

## Evidence and release checklist

Record branch/commit and working-tree state, tool/browser versions, every command and result including skips, migration state, manual journeys, accessibility checks, storage adapter/bucket without credentials, defects, and limitations.

Before release: install from lockfile; migrate safely; pass formatting, lint, type-checking, tests, database/migration checks, and builds; start only API/admin/website; complete connected publishing and public journeys; verify settings, membership, events, quiz nights, informational contact/function-room pages, and media; pass S3 and recovery checks for production; confirm no worker/deferred feature is deployed; restore deterministic local data where applicable.

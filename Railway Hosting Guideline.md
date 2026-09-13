# Railway Hosting Guideline

## Purpose

This document explains how to host the Pemberton Conservative Club demonstration platform on Railway. It is a developer runbook, not proof that the repository is already production-ready.

The intended Railway topology is:

```text
Internet
  ├── website public domain ──> website service ──┐
  ├── admin public domain ────> admin service ───┼──> API service ──> PostgreSQL
  └── API public domain ──────> API service ─────┘          │
                                                            └──> worker service (future jobs)
```

Use one Railway project with separate environments such as `staging` and `production`. Keep all services for one environment in that same project environment so that Railway private networking and reference variables work correctly.

This project is currently a demonstration using fictional records and simulated workflows. Never upload real member data or configure real payment processing without a separately approved production-readiness programme.

## Read before deploying

Read these repository files first:

1. `AGENTS.md`
2. `README.md`
3. `Project Testing Guide.md`
4. `.env.example`
5. `package.json` and `pnpm-lock.yaml`
6. Every application `package.json` and `.env.example`
7. `packages/database/src/cli.ts`
8. All files in `packages/database/migrations`

Also review Railway's current official documentation because platform behaviour can change:

- [Deploying a monorepo](https://docs.railway.com/deployments/monorepo)
- [PostgreSQL](https://docs.railway.com/databases/postgresql)
- [Pre-deploy commands](https://docs.railway.com/deployments/pre-deploy-command)
- [Health checks](https://docs.railway.com/deployments/healthchecks)
- [Private networking](https://docs.railway.com/networking/private-networking)
- [Domains](https://docs.railway.com/networking/domains/working-with-domains)
- [Variables and reference variables](https://docs.railway.com/variables)
- [Railway deployment best practices](https://docs.railway.com/overview/best-practices)

The instructions below were checked against Railway documentation in September 2026. Reconfirm them before the first deployment and after material Railway platform changes.

## Current readiness gaps

Resolve these before calling the deployment complete:

1. The repository has no `railway.json`, `railway.toml`, or service-specific Dockerfiles. Railway settings will initially live in the dashboard unless config-as-code is added and reviewed.
2. The website and admin packages have `dev` and `build` scripts but no `start` scripts. Add explicit production start scripts or configure tested custom Railway start commands.
3. The API listens on Railway's injected `PORT`, but it does not explicitly select a host. Verify public and private connectivity in Railway. If needed, change it to listen on `::` so it accepts IPv6 and IPv4-mapped traffic.
4. The worker currently exposes only a health server; it does not process background jobs. Deploying it is optional until real worker responsibilities exist.
5. No automated browser end-to-end suite is configured.
6. No backup-restore drill, operational alerting policy, Railway resource sizing, or production secret-rotation procedure is committed.
7. The platform uses development-only fictional administrator fixtures. Do not expose those credentials in a real production environment.
8. An Android client does not yet exist. A future native client will require the API to retain a public HTTPS domain.
9. Review security headers, Content Security Policy, rate limits, session-cookie behaviour, trusted proxies, CORS requirements, and production authentication before accepting real traffic.

Do not hide these gaps with deployment settings. Either address them in a focused change or record them as explicit demonstration limitations.

## Recommended Railway services

Create these services:

| Railway service name | Source              | Public domain              | Required now       |
| -------------------- | ------------------- | -------------------------- | ------------------ |
| `postgres`           | Railway PostgreSQL  | No                         | Yes                |
| `api`                | This Git repository | Yes for public/Android API | Yes                |
| `website`            | This Git repository | Yes                        | Yes                |
| `admin`              | This Git repository | Yes, access-controlled     | Yes                |
| `worker`             | This Git repository | Usually no                 | Optional currently |

Use stable lowercase service names. Reference-variable examples depend on these names. If names differ, update every `${{service.VARIABLE}}` reference accordingly.

Do not deploy `compose.yaml` directly. It is for local development. Railway maps each workload to a separate service and provides managed PostgreSQL.

## Environments

At minimum, create:

- `staging`: fictional demo records, simulated workflows, safe acceptance testing
- `production`: production-like configuration with no development seed or known demo credentials

If this remains solely a client demonstration, name the public environment `demo` rather than pretending it is production. Keep its UI demonstration banner enabled.

Railway private networks are isolated by project environment. A staging website cannot reach a production API through a staging private service name. Define reference variables independently in each environment.

Use a separate PostgreSQL service per environment. Never let staging or preview deployments reference the production database.

## Prepare the repository

### Production start scripts

Before deployment, add and locally test production start scripts for Next.js. Suitable package scripts are conceptually:

```json
{
  "scripts": {
    "start": "next start"
  }
}
```

Add this to both `apps/website/package.json` and `apps/admin/package.json` through a reviewed code change. Railway supplies `PORT`, and Next.js should consume it. If Railway cannot reach the process, explicitly bind to a suitable host rather than hard-coding a development hostname.

The API and worker already provide `start` scripts that run compiled JavaScript.

### Config as code

Dashboard configuration is acceptable for an initial experiment, but committed service configuration is preferable for a repeatable deployment. Because multiple Railway services share one repository, use a separately reviewed configuration approach that does not accidentally give every service the same start command.

If adding `railway.json` or `railway.toml` files:

- Keep the monorepo root available so pnpm can resolve shared workspace packages.
- Remember that Railway config-file discovery and a configured root directory have special path rules; consult the current monorepo documentation.
- Do not put credentials or environment-specific domains in config files.
- Validate each service independently in staging.

### Bind to Railway's port

Railway injects `PORT`, and health checks use that port. Every HTTP service must listen on it.

Never set one shared hard-coded port for all Railway services. The local defaults (`3000`, `3001`, `3002`, and `3003`) are local-development conventions only.

## Create the Railway project

1. Create a new Railway project.
2. Connect the approved GitHub repository.
3. Create or select the `staging` environment first.
4. Add a Railway PostgreSQL database and name it `postgres`.
5. Add separate GitHub-backed services named `api`, `website`, and `admin` from the same repository.
6. Add `worker` only if its current health-only deployment is useful or background work has been implemented.
7. Do not add public networking to PostgreSQL.
8. Stage all settings and review the Railway change set before deploying.

Railway may automatically detect deployable packages in a JavaScript monorepo. Verify its generated commands rather than assuming they match this repository's build dependencies.

## Monorepo build configuration

Keep each service's source root at the repository root unless a tested build strategy copies all required workspace packages into a narrower context. `apps/api`, `apps/admin`, and `apps/website` depend on packages under `packages/`, the root lockfile, and pnpm workspace metadata.

Use Node 24, matching the repository's `engines` field. Use the lockfile's pnpm version through Corepack.

### Conservative initial build commands

The simplest reliable initial configuration is to build the whole monorepo in each application service:

```text
corepack enable && pnpm install --frozen-lockfile && pnpm build
```

Railway/Railpack may install dependencies automatically. If it does, do not redundantly install them in the build command. Inspect build logs and settle on one documented path.

Building everything is slower but matches the tested root build. After a successful baseline, optimize to filtered builds and verify shared dependency builds explicitly. For example, pnpm filter ellipsis syntax can select an application and its dependencies, but the exact command must be tested against this workspace before adoption.

Do not run tests in the runtime start command. Run quality gates in CI before Railway deployment and optionally in a build stage where failure blocks release.

### Start commands

After adding frontend `start` scripts, use:

| Service   | Start command                      |
| --------- | ---------------------------------- |
| `api`     | `pnpm --filter @pcc/api start`     |
| `website` | `pnpm --filter @pcc/website start` |
| `admin`   | `pnpm --filter @pcc/admin start`   |
| `worker`  | `pnpm --filter @pcc/worker start`  |

Until those scripts are added, temporary frontend commands may use `pnpm --filter @pcc/website exec next start` and the equivalent for admin. Do not make an undocumented temporary command the permanent deployment contract.

Never use `next dev`, `nest start --watch`, `tsx watch`, or root `pnpm dev` in a hosted environment.

## PostgreSQL configuration

Railway PostgreSQL exposes connection variables automatically. Keep the database private and use its internal `DATABASE_URL`; do not use `DATABASE_PUBLIC_URL` for application-to-database traffic.

On the `api` service, create this reference variable:

```text
DATABASE_URL=${{postgres.DATABASE_URL}}
```

If migrations later require an unpooled connection while runtime traffic uses PgBouncer, define a separate migration variable from Railway's unpooled URL and update the migration command deliberately. Do not silently run transaction-sensitive migrations through a transaction pooler.

The current API is the only deployed service that needs direct database access. Do not give database credentials to website, admin, or browser clients.

Do not add a Railway volume to managed PostgreSQL merely because local `compose.yaml` contains a Docker volume. Railway manages persistence for its database service.

## Service variables

Variables are defined per Railway environment. Use reference variables so domains and credentials remain synchronized.

### API

```text
NODE_ENV=production
DATABASE_URL=${{postgres.DATABASE_URL}}
```

Do not manually set `PORT` unless there is a diagnosed reason; Railway supplies it.

For a strictly fictional resettable demo, the current seed command requires `NODE_ENV=development`. Do not leave the public runtime casually configured as development. Use the controlled demo-data procedure later in this guide and never seed known credentials into a real production environment.

### Website

For server-side requests over Railway's private network:

```text
NODE_ENV=production
API_BASE_URL=http://${{api.RAILWAY_PRIVATE_DOMAIN}}:${{api.PORT}}/api/v1
```

The current website performs event and content requests on the server. A browser cannot resolve `railway.internal`, so never expose the private URL as a client-side value.

If future browser code needs the public API, define:

```text
NEXT_PUBLIC_API_BASE_URL=https://${{api.RAILWAY_PUBLIC_DOMAIN}}/api/v1
```

Remember that `NEXT_PUBLIC_*` values can be embedded into browser bundles. They must never contain secrets. Review CORS before introducing direct browser calls.

### Admin

```text
NODE_ENV=production
API_BASE_URL=http://${{api.RAILWAY_PRIVATE_DOMAIN}}:${{api.PORT}}/api/v1
```

Admin browser requests currently go through Next.js routes or server rendering, allowing the service to use the private API URL. Do not put session secrets or database credentials into `NEXT_PUBLIC_*` variables.

### Worker

```text
NODE_ENV=production
```

The worker does not currently access the database. Add `DATABASE_URL=${{postgres.DATABASE_URL}}` only when its implementation genuinely needs it and permissions have been reviewed.

### Secret handling

- Use Railway service or shared variables, not committed `.env` files.
- Seal sensitive variables where Railway operational requirements allow it.
- Restrict project access by role.
- Rotate credentials after suspected disclosure and on the agreed schedule.
- Do not copy variable values into deployment tickets, screenshots, or logs.
- Remember that sealed variables have limitations when duplicating environments; verify each new environment explicitly.

## Migrations

Run database migrations before a new API version receives traffic. Railway pre-deploy commands execute after build and before deployment, have service variables and private networking, and block deployment when they exit non-zero.

Configure the `api` service pre-deploy command as:

```text
pnpm db:migrate
```

Set a finite pre-deploy timeout with comfortable headroom, for example 300 seconds after measuring normal migration time.

Migration rules:

- Never run `db:reset` as a pre-deploy command.
- Never run `db:seed` automatically in a real production environment.
- Never edit an applied migration.
- Back up and test restoration before risky schema changes.
- Test migrations from an empty database and from a copy of the preceding schema.
- Ensure the migration command is safe when two deployments overlap.
- Verify that the built deployment image contains the migration source/runtime needed by the command.
- Inspect pre-deploy logs before promoting an environment.

Because Railway pre-deploy commands run in a separate container, do not expect their filesystem changes to persist. Database changes do persist because they are external state.

## Demo data initialization and reset

The seed and reset commands intentionally run only when `NODE_ENV` is exactly `development`. This protects production-labelled environments.

For a dedicated fictional demo environment only:

1. Confirm the selected Railway project, service, and environment three times: project name, environment name, and database reference.
2. Confirm the database contains no real or shared client data.
3. Temporarily run the seed/reset process in a controlled one-off shell with `NODE_ENV=development` scoped only to that command.
4. Run `pnpm db:seed` for initialization or `pnpm db:reset` for an authorized demo reset.
5. Return the deployed API runtime to its reviewed configuration.
6. Verify the six seeded public events, administrator login, and audit records.
7. Record who performed the operation and when.

Do not expose an unauthenticated reset HTTP endpoint. Do not create a permanent Railway service whose sole public purpose is resetting data. Never run demo reset against production.

The known fictional administrator password is documented for local development. Rotate or replace it before publishing a broadly accessible hosted demo, and add access controls appropriate to the audience.

## Networking and domains

### Public services

Generate Railway domains for:

- `website`
- `admin`
- `api` when external/public clients need it

Do not generate a public domain for PostgreSQL or the worker unless a reviewed use case requires it.

Railway public domains provide HTTPS. Validate the generated domains before adding custom DNS.

### Private service traffic

Website and admin should call the API through:

```text
http://${{api.RAILWAY_PRIVATE_DOMAIN}}:${{api.PORT}}
```

Internal Railway traffic uses HTTP on the encrypted private network. Do not substitute the API's public domain for server-to-server traffic without a reason; that adds avoidable public routing and egress.

Service names are part of private DNS. Renaming `api` changes its private hostname, so use reference variables and redeploy dependants after a rename.

### Custom domains

A reasonable production-like layout is:

```text
www.example-club-domain.test     -> website
admin.example-club-domain.test   -> admin
api.example-club-domain.test     -> api
```

Use a real controlled domain rather than `.test` when going online. Follow Railway's displayed DNS records exactly. Wait for certificate provisioning and verify HTTPS before redirecting users.

Configure canonical website metadata and any allowed-origin lists to use the final domain. Test both apex and `www` behaviour and select one canonical host.

Protect the admin domain through strong application authentication. Railway domain obscurity is not authorization.

## Health checks

Railway waits for a `2xx` response on the configured health path and uses the injected `PORT`.

Configure:

| Service   | Health-check path  | Meaning                              |
| --------- | ------------------ | ------------------------------------ |
| `api`     | `/api/v1/health`   | Process liveness                     |
| `worker`  | `/health`          | Worker HTTP process liveness         |
| `website` | `/` initially      | Website process and server rendering |
| `admin`   | `/login` initially | Admin process and login route        |

The API also provides `/api/v1/health/database` for readiness diagnostics. Do not necessarily use it as the deployment liveness check: a transient database issue should not always cause the platform to repeatedly replace an otherwise healthy API process. Monitor both endpoints and define the desired recovery policy.

Set health-check timeouts based on measured cold starts. Do not increase timeouts merely to conceal a process that never binds to `PORT`.

After each deployment, verify health paths from Railway and from an external client where public.

## Deployment triggers and watch paths

Automatic GitHub deploys should target reviewed branches only. Require CI checks before merge.

Watch paths can prevent unrelated monorepo changes from rebuilding every service. Begin conservatively because shared package changes affect multiple applications.

Possible path groups are:

### API

```text
/apps/api/**
/packages/contracts/**
/packages/database/**
/packages/validation/**
/package.json
/pnpm-lock.yaml
/pnpm-workspace.yaml
/turbo.json
```

### Website

```text
/apps/website/**
/packages/contracts/**
/packages/design-system/**
/packages/config/**
/package.json
/pnpm-lock.yaml
/pnpm-workspace.yaml
/turbo.json
```

### Admin

```text
/apps/admin/**
/packages/contracts/**
/packages/design-system/**
/packages/config/**
/package.json
/pnpm-lock.yaml
/pnpm-workspace.yaml
/turbo.json
```

### Worker

```text
/apps/worker/**
/packages/contracts/**
/packages/database/**
/packages/validation/**
/package.json
/pnpm-lock.yaml
/pnpm-workspace.yaml
/turbo.json
```

Validate Railway's current watch-path syntax in the dashboard. When uncertain, allow the extra rebuild; missing a required deployment is worse than an unnecessary build.

## CI quality gate before deployment

Run these against the exact commit Railway will deploy:

```powershell
pnpm install --frozen-lockfile
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm test:migrations
pnpm build
```

Migration tests require a disposable PostgreSQL instance and `DATABASE_URL`. Ensure they pass rather than skip.

No current automated browser E2E suite exists. Follow `Project Testing Guide.md` for manual connected-data, accessibility, responsive, error, and not-found tests in staging.

## First staging deployment sequence

1. Complete every repository readiness item required for the intended exposure level.
2. Run the full local quality gate.
3. Create the Railway staging environment and private PostgreSQL service.
4. Configure the `api` service, variables, migration pre-deploy command, start command, and health check.
5. Deploy API first.
6. Inspect build, pre-deploy, deploy, and health-check logs.
7. Initialize fictional demo data through the controlled procedure.
8. Generate the API public domain if it is part of the external contract.
9. Verify API liveness, database readiness, content, settings, event list, event detail, and event 404 responses.
10. Configure and deploy `website` with its private `API_BASE_URL`.
11. Generate its public domain and test every public route.
12. Configure and deploy `admin` with its private `API_BASE_URL`.
13. Generate its public domain and test login and protected routes.
14. Deploy the worker only if required.
15. Complete the CMS publish-to-public connected journey.
16. Test API failure and recovery, not-found behaviour, mobile layout, keyboard access, and screen-reader output.
17. Review logs for secrets, personal data, stack traces, and unexpected errors.
18. Record deployment identifiers, commit SHA, domains, migration versions, test evidence, and limitations.

Do not configure custom production DNS until staging succeeds.

## Verification commands

Replace the example hosts with the actual Railway domains:

```powershell
$apiHost = 'https://your-api-domain.example'
$websiteHost = 'https://your-website-domain.example'
$adminHost = 'https://your-admin-domain.example'

Invoke-RestMethod "$apiHost/api/v1/health"
Invoke-RestMethod "$apiHost/api/v1/health/database"
$events = Invoke-RestMethod "$apiHost/api/v1/events"
$events.events | Select-Object slug, title, status, visibility, startsAt
Invoke-WebRequest "$websiteHost/whats-on"
Invoke-WebRequest "$websiteHost/whats-on/$($events.events[0].slug)"
Invoke-WebRequest "$adminHost/login"
```

Verify:

- All public URLs use HTTPS.
- Health responses are `2xx` and have the expected body.
- Only published public events appear in the event list.
- A valid detail slug returns `200`.
- An unknown event slug returns `404`.
- Website and admin responses do not expose private Railway hostnames or secrets.
- Response headers meet the reviewed security policy.

## Promotion to production

Promotion is not simply copying staging variables.

Before production:

- Remove or replace known demonstration credentials.
- Confirm `NODE_ENV=production`.
- Confirm no seed or reset command runs automatically.
- Use a separate production database.
- Review all secrets and reference variables.
- Test backup and restore.
- Review migration rollback or forward-fix procedures.
- Configure custom domains and DNS ownership.
- Review cookies across website/admin domains, HTTPS, `Secure`, `HttpOnly`, and `SameSite` behaviour.
- Review API rate limiting behind Railway proxies.
- Review CORS only for approved browser origins.
- Confirm security headers and CSP.
- Configure monitoring, alerts, budgets, and incident contacts.
- Define maintenance responsibility for Railway PostgreSQL, even though provisioning is managed.
- Complete performance, accessibility, security, and recovery testing.
- Obtain explicit approval before introducing real customer or member data.

Deploy the API and its migration first, then website/admin consumers when a contract change requires ordering. Prefer backward-compatible API changes so old and new application replicas can coexist during rollout.

## Backups and recovery

Do not treat platform persistence as a complete recovery plan.

Define and test:

- Railway database backup capability and retention for the selected plan
- Restore into an isolated environment
- Point-in-time recovery availability and limits
- Recovery point objective and recovery time objective
- Who may initiate a restore
- How application writes are paused during recovery
- How migration compatibility is verified after restore
- How restored fictional versus real data is identified

Perform a restore drill before production approval and periodically afterward. Never overwrite the active production database merely to prove a backup works.

## Logging, metrics, and alerts

Monitor each Railway service for:

- Deployment and restart failures
- Health-check failures
- HTTP `5xx` rates
- Authentication failure and rate-limit trends
- Database connection saturation and slow queries
- CPU and memory pressure
- Storage growth
- Unexpected egress or spend
- Pre-deploy migration duration and failure
- Worker backlog when background work exists

Application logs must include safe request identifiers but must not include passwords, session tokens, full cookies, database URLs, secrets, real payment data, or unnecessary personal data.

Configure Railway usage alerts and resource limits deliberately. Limits set too low can crash services; no limits or budget alerts can create avoidable cost.

## Scaling considerations

Begin with one replica per application service for the demo. Before horizontal scaling:

- Confirm sessions are stored in PostgreSQL rather than process memory.
- Confirm mutations are idempotent where retry is expected.
- Confirm migrations run once through pre-deploy, not once per replica start.
- Confirm the worker has a concurrency and locking strategy.
- Measure PostgreSQL connection use per replica.
- Introduce connection pooling only with a tested migration/runtime split.
- Confirm no application relies on local ephemeral files.

Railway deployment filesystems are ephemeral unless a volume is attached. The platform design calls for S3-compatible object storage for production media; do not rely on a web-service filesystem for uploads.

## Rollback and incident procedure

For an application-only defect:

1. Stop promotion and preserve logs.
2. Identify the last known-good deployment and database migration state.
3. Roll back the application only if the database remains compatible.
4. Otherwise deploy a reviewed forward fix.
5. Verify health and the critical public/admin journeys.
6. Record the incident and follow-up actions.

For a migration defect, do not blindly reverse SQL or restore over live data. Assess whether a forward migration, controlled restore, or maintenance window is safest. Applied migration files must never be edited.

For suspected credential exposure:

1. Restrict affected service access.
2. Rotate the credential at its source.
3. Redeploy every consumer using the reference variable.
4. Revoke affected sessions or tokens.
5. Review logs without copying secrets.
6. Record scope and required notifications.

## Common Railway failures

### Health check says service unavailable

- Confirm the process listens on Railway's `PORT`.
- Confirm the health path is exact.
- Confirm the start command uses a production server.
- Check whether the process binds only to an unreachable interface.
- Inspect deployment logs before increasing the timeout.

### Website or admin cannot reach API

- Confirm all services are in the same project environment.
- Confirm `API_BASE_URL` references `api.RAILWAY_PRIVATE_DOMAIN` and the API port.
- Use `http`, not `https`, for the internal address.
- Confirm the API listens on an interface compatible with Railway private networking.
- Redeploy after staged variable changes.

### Browser cannot resolve `railway.internal`

This is expected. Private domains are available to Railway services, not end-user browsers. Browser clients must use an approved public HTTPS API domain.

### API cannot connect to PostgreSQL

- Confirm `DATABASE_URL=${{postgres.DATABASE_URL}}` on the API service.
- Confirm the API and database are in the same environment.
- Confirm migrations use the correct pooled or unpooled URL.
- Confirm the database is healthy and credentials were not manually copied incorrectly.

### Migration pre-deploy fails

- Read the exact migration error.
- Confirm dependencies needed by `pnpm db:migrate` are present in the built image.
- Confirm `DATABASE_URL` is available in pre-deploy.
- Confirm no applied migration was edited.
- Do not bypass the pre-deploy failure by starting incompatible application code.

### Next.js starts in development mode

The wrong command is configured. Use `next build` during build and `next start` during deployment. Never use `next dev` on Railway.

### Seed refuses to run

This is intentional when `NODE_ENV` is not exactly `development`. Never weaken the guard. Use the controlled fictional demo initialization procedure or a separate approved fixture mechanism.

## Deployment evidence

Record for every release:

- Railway project and environment
- Service deployment IDs
- Git commit SHA
- Node and pnpm versions
- Build and start commands
- Variable names and references, never secret values
- Applied migration filenames/checksums
- Health-check results
- Automated test results
- Manual connected-journey results
- Backup status and most recent restore drill
- Public and custom domains
- Known limitations
- Person approving promotion

## Railway deployment definition of done

The hosted deployment is complete only when:

- PostgreSQL is private and application traffic uses a reference `DATABASE_URL`.
- API, website, and admin run as separate production processes on Railway's `PORT`.
- Website and admin use the shared API, preferably over private networking.
- Required public domains use HTTPS.
- Migrations run safely before incompatible application code receives traffic.
- Seed/reset cannot affect production.
- Health checks pass and monitoring distinguishes liveness from database readiness.
- The public event list and details come from the shared database through the API.
- Admin publication changes appear through the public API and website.
- Format, lint, type-check, unit, integration, migration, build, manual journey, responsive, and accessibility checks are recorded.
- Backup restoration has been proven in an isolated environment.
- Secrets and known demo credentials are not exposed.
- Costs, resource limits, alerts, operational ownership, and rollback procedures are documented.
- Current readiness gaps are closed or explicitly accepted for a fictional demonstration deployment.

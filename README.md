# Pemberton Conservative Club Demo Platform

This monorepo contains the foundations for the club's demonstration website, administration portal, shared API, worker, and shared packages.

## Prerequisites

- Node.js 24 (see `.nvmrc`)
- pnpm 9.15.9 through Corepack
- PostgreSQL 15 or later (required from Step 3)

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

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

The repository is currently at Web Step 1: project structure, configuration, and automated checks. Railway configuration and health endpoints belong to Step 2.

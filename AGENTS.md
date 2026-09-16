# Pemberton Conservative Club Website and CMS

## Purpose

This repository contains the deliberately limited first phase of the club's digital project:

- A modern public website
- A secure browser-based content management system (CMS)
- A shared backend API and PostgreSQL database
- S3-compatible media storage
- Railway-ready deployment configuration

The CMS is where authorised club staff manage public content. Published changes must appear on the website without duplicate entry or code changes.

Keep this phase small, reliable and easy to demonstrate. Future components must be capable of connecting through stable interfaces, but must not be implemented speculatively.

## Read This First

Before creating or changing anything:

1. Read this file completely.
2. Read the repository `README.md` and relevant documentation.
3. Inspect the repository structure, package scripts, schema and migrations.
4. Run `git status` and preserve unrelated user changes.
5. Identify the smallest complete vertical slice that satisfies the request.
6. Briefly state the proposed change before editing.
7. Ask for clarification only if a missing decision would materially change the result.

Do not replace the stack, reorganise the repository, delete existing work or broaden the scope without explicit approval.

## Approved Scope

### Public Website

- Home
- What is On and event details
- Quiz Nights
- Function Room information
- Sports and Activities
- Membership information as public content only
- About the Club
- Contact, location and opening times
- Privacy, cookie and accessibility pages
- Shared header, navigation, footer and content components

Public pages must read published content from the shared backend or its server-side read layer. Do not keep a separate hard-coded copy of CMS-managed content.

### CMS

- Secure staff sign-in and sign-out
- Dashboard
- Page and section editing
- Draft, preview, publish and unpublish workflows
- Event and quiz-night management
- Contact details, opening times and club settings
- Function-room, facilities and activities content
- Media upload and metadata
- Navigation and SEO metadata where required
- Basic staff roles and permissions
- Audit records for important content changes

Keep the CMS task-focused and understandable to non-technical staff. It is not a general-purpose page builder.

### Backend

- CMS authentication and authorisation
- Content, settings, event and media APIs
- Draft and published content rules
- Runtime input validation
- PostgreSQL access and migrations
- Audit logging
- Health and readiness endpoints
- A documented, versioned API contract

PostgreSQL is the source of truth for structured data. Store images and document bytes in object storage, with references and metadata in PostgreSQL.

## Explicitly Deferred

Do not build, scaffold or simulate these features unless the user explicitly starts a later phase:

- Android or iOS applications
- Member accounts, member portal or digital membership cards
- Membership renewals
- Ticket sales, checkout, orders, refunds or payments
- QR tickets or ticket scanning
- Room availability or booking workflows
- Customer accounts
- Push notifications or marketing automation
- Bar ordering, point of sale, stock control or accounting
- Loyalty schemes

Public pages may describe events, membership and function-room hire and may provide contact details or a simple enquiry link. They must not suggest deferred transactional features are operational.

Do not create empty tables, unused services, placeholder screens or dependencies solely for deferred features.

## Modular Extension Rules

Future components will be built as separate phases and bolted on only when needed. Preserve this option through clear boundaries, not speculative code.

- Keep public content separate from staff identity and administration concerns.
- Use deliberate API response contracts instead of exposing database models.
- Version externally consumed routes, for example `/api/v1`.
- Keep business rules in the backend rather than duplicating them across clients.
- Use migrations for every schema change.
- Avoid dependencies from the website/CMS core into hypothetical future modules.
- Add future domains through separate tables, services and routes.
- Record material architectural decisions.

A future Android app or other client should be able to use authorised API endpoints without rewriting the website. This does not authorise mobile-specific work now.

## Architecture

Preserve the current structure when it is reasonable. Expected logical boundaries are:

```text
apps/
  website/       Public website
  admin/         CMS
  api/           Shared backend API
packages/
  database/      Schema, migrations, seed data and database client
  contracts/     Shared API types and runtime validation
  design-system/ Shared tokens and UI components, when useful
  config/        Shared TypeScript, lint and environment configuration
```

An existing worker may remain if removing it creates unnecessary risk, but do not deploy or expand it unless the current website/CMS genuinely needs background work.

### Technology Baseline

- TypeScript in strict mode
- Next.js for the website and CMS, unless an approved existing alternative is present
- The existing TypeScript API framework
- PostgreSQL 15 or later
- Versioned database migrations
- S3-compatible object storage for production media
- OpenAPI or an equivalent maintained HTTP contract
- Runtime validation at every external boundary
- Railway-compatible service configuration

Use the existing package manager and lockfile. Never introduce a second package manager.

## Build Small Vertical Slices

Do not finish the whole backend before building the interfaces, and do not create disconnected static screens.

For each feature:

1. Confirm its user journey and acceptance criteria.
2. Inspect related code and data.
3. Change the data model only if necessary.
4. Define or update the API contract.
5. Implement backend validation, permissions and business rules.
6. Implement the smallest usable CMS workflow.
7. Implement the public website output.
8. Add automated tests.
9. Exercise the full CMS-to-website journey with dummy data.
10. Update documentation when setup or behaviour changes.

A content feature is incomplete if an administrator cannot manage it or a visitor cannot see the correct published result.

## Recommended Development Order

Unless the current task is narrower:

1. Audit and stabilise the existing repository.
2. Confirm local setup, environment validation and automated checks.
3. Confirm PostgreSQL connectivity, migrations and safe dummy data.
4. Confirm API health and readiness endpoints.
5. Complete CMS authentication, sessions and minimum roles.
6. Complete shared API conventions, validation and error handling.
7. Complete club settings and opening-times management.
8. Complete homepage draft, preview and publishing.
9. Complete the public website layout and navigation.
10. Complete standard content pages one vertical slice at a time.
11. Complete event and quiz-night management.
12. Complete public event lists and event details.
13. Complete media upload, selection, metadata and deletion rules.
14. Complete contact, location and legal pages.
15. Complete SEO metadata, sitemap, redirects and social previews.
16. Complete accessibility, responsive design and browser checks.
17. Complete security, backup and recovery checks.
18. Complete Railway deployment and production smoke tests.
19. Polish the client demo and document CMS use.

Finish and verify each step before starting the next major capability.

## Initial Data Model

Limit the schema to data required by the website and CMS:

- Staff users, sessions, roles and permissions
- Pages and page versions
- Reusable content sections only where justified
- Club settings and opening times
- Events and event categories
- Media metadata
- Navigation entries if editable
- Redirects
- Audit events

Do not add tables for tickets, payments, orders, bookings, members, mobile devices or notifications in this phase.

### Database Rules

- Add a new migration for every schema change.
- Never edit a migration that may already have been applied.
- Do not delete historical migrations because the scope has narrowed.
- Use a deliberate forward migration, after approval, if an applied schema must change.
- Use stable, non-guessable identifiers for publicly exposed records.
- Store timestamps in UTC and convert them for display.
- Enforce referential integrity with foreign keys.
- Use transactions for multi-record state changes.
- Add indexes for demonstrated query patterns.
- Do not store media bytes in PostgreSQL.
- Never expose PostgreSQL directly to a browser or external client.

## Dummy Data

Use realistic fictional content for local development and demonstrations. Seed or document:

- Club contact details, address and opening times
- Homepage and supporting public pages
- At least six fictional future events, including two quiz nights
- Function-room, facilities and activities content
- Replaceable demo media with appropriate usage rights
- An administrator account
- A content-editor account if roles are demonstrated

Use fictional staff email addresses under `example.test`. Never import real member, customer, password or transaction data.

Any reset or seed command must refuse to run in production and affect only known development/demo data.

## Content Publishing

- Keep draft and published content separate.
- Preview must not make a draft public.
- Publishing must be an explicit authorised action.
- Public queries must return published content only.
- Keep structured data such as dates and opening times out of rich-text fields.
- Restrict editors to safe, supported blocks and formatting.
- Require alternative text for meaningful images.
- Record who changed and published important content.
- Preserve stable URLs and add redirects when published slugs change.
- Show useful validation errors without losing editor input.
- Prevent accidental concurrent overwrites where practical.

## Authentication and Authorisation

- Use individual staff identities, not a shared account in application logic.
- Hash passwords with a maintained, suitable implementation.
- Use Secure, HttpOnly, SameSite cookies for production browser sessions.
- Enforce permissions in the API on every protected action.
- Hidden controls are not security controls.
- Rate-limit sign-in and recovery endpoints.
- Revoke sessions when a staff account is disabled.
- Never log passwords, reset tokens or complete session identifiers.
- Do not add public registration, customer login or member login in this phase.

## API Rules

- Use versioned stable routes such as `/api/v1`.
- Maintain the API contract as endpoints change.
- Validate path, query and body inputs at runtime.
- Return stable error codes and safe human-readable messages.
- Include a request identifier in errors and logs.
- Use consistent pagination and filtering.
- Map database records to deliberate response objects.
- Keep public read endpoints separate from protected CMS commands.
- Never leak stack traces, secrets or unnecessary staff information.
- Use caching only when publishing reliably invalidates it.

## Media Rules

- Store bytes in S3-compatible object storage and metadata in PostgreSQL.
- Validate type, extension, size and image dimensions server-side.
- Generate safe object keys; never trust filenames as paths.
- Restrict upload and deletion to authorised staff.
- Require alternative text for meaningful published images.
- Optimise images and provide responsive sizes.
- Prevent deletion while a published page references an asset, or require explicit replacement.
- Use local storage only through the same documented abstraction.
- Never commit uploads or storage credentials.

## Interface Direction

- Use the agreed deep navy, warm cream and restrained gold palette.
- Preserve the club's welcoming local character and avoid a generic corporate look.
- Design mobile-first, then verify tablet and desktop layouts.
- Use clear headings, generous spacing and prominent calls to action.
- Include loading, empty, success and error states for data-backed views.
- Use realistic copy, not lorem ipsum.
- Leave no non-functional controls in a client demonstration.
- Keep CMS wording plain and task-oriented.
- Use consistent terminology across website, CMS and API.

## Accessibility

Target WCAG 2.2 AA for the website and core CMS journeys.

- Use semantic HTML and logical heading order.
- Support full keyboard operation and visible focus.
- Associate labels, help text and errors with form controls.
- Announce validation and asynchronous changes.
- Support zoom, reflow and large text.
- Meet contrast and touch-target requirements.
- Do not communicate status by colour alone.
- Honour reduced-motion preferences.
- Provide alternatives for meaningful images and maps.
- Use automated checks plus manual keyboard review.

Accessibility is part of feature completion, not a final cosmetic pass.

## Security and Privacy

- Use fictional development and demo data only.
- Keep secrets in environment configuration, never source files.
- Maintain `.env.example` without secret values.
- Redact credentials, cookies, tokens and sensitive fields from logs.
- Apply secure HTTP headers and a suitable content security policy.
- Validate and authorise every write operation.
- Never allow anonymous object-storage uploads.
- Rate-limit sensitive endpoints.
- Audit privileged content changes.
- Separate development, demonstration and production credentials.
- Minimise production personal data.
- Resolve known high-severity dependency vulnerabilities before release.

## Railway Deployment

Deploy only the services required by this phase:

- Public website
- CMS/admin portal
- API
- PostgreSQL
- S3-compatible object storage

The website and CMS may share a service only if the existing architecture supports it cleanly. Do not merge applications solely to reduce service count. Do not deploy an unused worker or provision services for deferred features.

Document:

- Build and start commands
- Health checks
- Environment variables
- Database migration procedure
- Object-storage configuration
- Custom domain and HTTPS setup
- Backup and restore procedure
- Post-deployment smoke tests

Never run destructive seed or reset commands against production.

## Testing

Add tests with each feature.

### Unit

- Validation schemas
- Publication rules
- Slug and redirect behaviour
- Date and opening-time rules
- Permissions
- Media validation

### Database and Integration

- Migrations from an empty database
- Foreign-key and uniqueness constraints
- Draft versus published queries
- Authentication and permission enforcement
- Page, setting and event create/update/publish behaviour
- Media metadata lifecycle
- Audit creation for privileged changes

### End to End

- Staff sign in and sign out.
- An administrator edits, previews and publishes homepage content.
- Published content appears publicly and drafts do not.
- An administrator creates and publishes an event.
- The event appears in the list and detail page.
- Updated opening times appear publicly.
- Unauthorised users cannot perform CMS actions.
- Core journeys work at mobile and desktop sizes.

Tests must use isolated generated or deterministic dummy data and must not depend on execution order or a developer's existing records.

## Required Checks

Before declaring a task complete, run the applicable repository commands for:

- Formatting
- Linting
- Type checking
- Unit tests
- Integration tests
- Migration validation
- Production builds
- Relevant end-to-end tests

Manually verify the changed CMS-to-public journey when practical. If a check cannot run, report why, what was checked instead and what remains unverified. Never claim success from code inspection alone.

## Change Discipline

- Keep work within the current request.
- Preserve unrelated changes.
- Prefer small, reviewable commits and complete vertical slices.
- Do not use destructive Git commands such as `git reset --hard`.
- Do not delete or rewrite migrations, data or configuration without approval.
- Do not weaken tests, validation or permissions to make checks pass.
- Reuse sound existing patterns and dependencies.
- Update `README.md` and `.env.example` whenever setup changes.
- Do not commit secrets, build output, uploads or local database volumes.

## Completion Report

Report:

1. The user-visible result.
2. The principal files or components changed.
3. Any migration added and its purpose.
4. Commands and tests run, with results.
5. Assumptions, limitations or unverified items.
6. The next smallest logical vertical slice, when relevant.

Do not claim that untested behaviour works.

## Initial Release Definition of Done

This phase is complete when:

- The public website is responsive and visually consistent.
- Authorised staff can securely use the CMS.
- Staff can edit supported content without code changes.
- Staff can preview drafts and explicitly publish them.
- Only published content appears publicly.
- Homepage, standard pages, settings, opening times and events use shared backend data.
- Media is handled safely through object storage.
- Roles protect administrative actions and important changes are auditable.
- Core tests pass and representative pages meet the accessibility target.
- Railway deployment, environment setup, backups and smoke tests are documented.
- Demo data contains no real personal, membership or payment information.
- No deferred application, payment, ticketing, booking or membership feature is presented as operational.

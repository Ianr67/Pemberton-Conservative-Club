# Pemberton Conservative Club Demo Platform

## Purpose

This repository contains a client demonstration of a connected digital platform for Pemberton Conservative Club. Build a convincing, reliable demo of:

- A modern public website
- A browser-based content management and administration portal
- A shared backend API
- A shared PostgreSQL database

The website and administration portal must use the same backend records. A change made in the CMS must appear through the public website without duplicate data entry. Preserve a documented, platform-neutral API contract for separately developed client applications.

This is a demonstration environment. Use fictional people, fictional transactions and clearly labelled simulated payment behaviour. Do not collect real payment-card information or import real member information.

## Read This First

Before changing code:

1. Read this file completely.
2. Inspect the repository structure and existing implementation.
3. Read the README, database migrations, API contract and current task.
4. Check the working tree and preserve unrelated user changes.
5. Identify the smallest complete vertical slice that satisfies the task.
6. State assumptions when requirements are genuinely ambiguous.

Do not redesign the architecture, replace the chosen stack or expand the demo scope without explicit approval.

## Product Outcome

The finished demo must let a client see the following connected story:

1. An administrator signs into the CMS.
2. The administrator creates or updates an event.
3. The event appears on the public website and published API.
4. A demonstration customer reserves or purchases a ticket using simulated payment.
5. The order and ticket appear in the customer's account and the administration portal.
6. Staff validate the QR ticket once.
7. A customer submits a room enquiry.
8. Staff review the enquiry and issue an offer.
9. The customer accepts it using a simulated deposit.
10. The confirmed booking appears everywhere that should display it.
11. A demonstration member signs in and displays an active digital membership card.

Optimise implementation decisions for making this narrative stable, clear and easy to reset between client demonstrations.

## Approved Scope

### Public Website

- Home
- What is On
- Event details
- Quiz Nights
- Function Room
- Room enquiry
- Sports and Activities
- Membership information
- About
- Contact, location and opening times
- Required policy pages

### CMS and Administration

- Dashboard
- Content and page editing
- Opening times and club settings
- Media metadata
- Events and ticket types
- Orders and tickets
- Ticket validation
- Rooms, availability and blackouts
- Booking enquiries, offers and confirmed bookings
- Demonstration members and membership status
- Notifications preview
- Staff roles and permissions
- Audit activity
- Demo-data reset

### Explicitly Out of Scope

- Real payment processing
- Real card details
- Real member-data migration
- Production membership renewals
- Bar ordering or point of sale
- Stock control
- Accounting ledger
- Loyalty points
- Public chat or user-generated feeds
- Complex marketing automation
- Mobile application source, native builds, signing and store delivery

## Architecture

Use a monorepo with clear application and shared-package boundaries.

```text
apps/
  website/       Public Next.js website
  admin/         Next.js administration portal
  api/           Shared TypeScript backend API
  worker/        Background and scheduled work
packages/
  database/      Schema, migrations, seed and database client
  contracts/     Shared API types and validation schemas
  design-system/ Shared tokens and reusable UI primitives where practical
  config/        Shared lint, TypeScript and environment configuration
  testing/       Fixtures and test helpers
```

If the repository already uses a reasonable variant of this structure, preserve it. Do not move files simply to match the example.

### Technology Baseline

- TypeScript in strict mode
- Next.js for the website and admin portal
- A TypeScript API using NestJS or the existing selected server framework
- PostgreSQL 15 or later
- Versioned SQL migrations
- S3-compatible object storage in production; a documented local substitute is acceptable
- Railway-ready service configuration
- OpenAPI for the HTTP contract
- Runtime validation at every external boundary

Prefer the repository's existing package manager and lockfile. Do not introduce a second package manager.

## Core Engineering Rule

Build vertical slices. Do not finish the entire backend and then begin the interface, and do not build disconnected static screens.

For each feature, use this order:

1. Confirm the user journey and acceptance criteria.
2. Define or update the data model.
3. Define or update the API contract.
4. Implement backend validation, authorisation and business rules.
5. Implement the administration interface when staff configuration is required.
6. Implement the website and public API consumers.
7. Add automated tests.
8. Exercise the complete journey with seed data.
9. Add logging and error handling.
10. Update documentation.

A feature is incomplete if only its UI, API or database portion exists.

## Development Order

Unless the current task explicitly narrows the work, use this dependency order:

1. Repository, configuration and automated checks
2. Railway-ready environments and health endpoints
3. Database migrations and demo seed system
4. Authentication, sessions, roles and permissions
5. Shared API conventions, audit trail and background worker
6. Media metadata and storage abstraction
7. CMS content publishing and club settings
8. Public website shell and core content pages
9. Event and ticket-type administration
10. Event listings on the website and public API
11. Ticket holds and simulated checkout
12. Orders, ticket issue and QR validation
13. Room and availability administration
14. Enquiry, offer and simulated-deposit booking flow
15. Membership administration and account claim
16. Digital membership card
17. Notification previews and in-app notification records
18. Reporting, demo reset and presentation polish
19. End-to-end, accessibility, security and recovery verification

Do not implement a dependent step by bypassing unfinished prerequisites.

## Database Requirements

Treat PostgreSQL as the source of truth. Do not keep separate hard-coded event, member or booking datasets inside the website.

Use the supplied Pemberton Club PostgreSQL schema as the baseline. Preserve these domains:

- Users, profiles, sessions, roles and permissions
- Membership types, memberships and status history
- Pages, page versions, settings, media and redirects
- Venues, events and ticket types
- Ticket holds, orders, order items, tickets and check-ins
- Payments, refunds and provider-event records
- Rooms, availability, blackouts, enquiries, offers and bookings
- Notifications, deliveries, audit events and outbox events

### Database Rules

- Use migrations for every schema change.
- Never edit an applied migration. Add a new migration.
- Use UUIDs or similarly non-guessable identifiers for public records.
- Store money as integer minor units and store the ISO currency code.
- Store timestamps in UTC and convert for display.
- Enforce referential integrity with foreign keys.
- Use transactions for multi-record state changes.
- Lock ticket inventory rows when allocating holds.
- Preserve the database constraint that prevents overlapping active room bookings.
- Preserve the unique accepted check-in rule for tickets.
- Make provider and simulated-payment event handling idempotent.
- Keep audit records append-only to normal application users.
- Do not store image or document bytes in PostgreSQL.
- Do not expose the database directly to browser or external API clients.

## Demo Data

Provide deterministic, realistic fictional seed data. Re-running the reset must recreate the same baseline identifiers where practical.

### Required Seed Content

- Club contact details and opening times
- Homepage and supporting pages
- At least six future events
- At least two quiz nights
- At least one event with multiple ticket types
- At least one sold-out ticket type
- Function-room content and gallery metadata
- At least two rooms or one room plus an explicitly unavailable area
- Availability rules and blackout dates
- New, under-review, offered, confirmed and cancelled booking examples
- At least twelve fictional members across active, expired and suspended states
- Several fictional customer accounts
- Orders in pending, paid, refunded and failed states
- Valid, checked-in, refunded and cancelled tickets
- Demonstration notifications
- Representative audit records

### Demo Accounts

Seed or document accounts for:

- Administrator
- Content editor
- Events manager
- Booking manager
- Membership manager
- Active member
- Expired member
- Public customer

Use obvious fictional email addresses under `example.test`. Never use real addresses. Development passwords may be documented in a demo-only fixture or README, but they must never be enabled in a production environment.

### Reset Behaviour

Implement one explicit demo reset command. It must:

1. Refuse to run when the environment identifies itself as production.
2. Clear only known demo-owned records.
3. Reapply deterministic fixtures in dependency order.
4. Restore simulated transactions and workflow states.
5. Report success or the exact failed stage.

Do not expose an unauthenticated reset endpoint. If a reset control exists in the CMS, restrict it to the demo administrator and require an explicit confirmation.

## Simulated Payments

Do not integrate Stripe or another live provider unless explicitly requested.

Create a payment abstraction with at least these operations:

- Create checkout
- Read checkout status
- Confirm a payment event
- Create a refund

Implement a `DemoPaymentProvider` behind that interface.

### Demo Checkout Rules

- Label every screen `Simulated payment` or `Demo checkout`.
- Never request a card number, security code or bank detail.
- Let the presenter choose success, failure or cancellation.
- Process the result through the same server-side payment-event path intended for a future provider.
- Use a unique provider-event identifier.
- Make repeated confirmation safe and idempotent.
- Confirm tickets or bookings only after the backend processes the simulated event.
- Create realistic payment, refund and audit records.
- Permit a future live provider to replace the simulator without changing order, ticket or booking models.

Do not mark an order or booking paid solely because a client displays a success screen.

## Authentication and Authorisation

- Use individual identities; never implement one shared administrator account in application logic.
- Hash passwords using a maintained, suitable password-hashing implementation.
- Store browser sessions in Secure, HttpOnly cookies when applicable.
- Enforce permissions in the API on every protected action.
- Treat hidden buttons as presentation, not security.
- Require or simulate staff multifactor authentication according to the chosen demo identity implementation.
- Add rate limits to login, recovery, enquiry, checkout and validation endpoints.
- Revoke sessions when an account is disabled.
- Do not log passwords, tokens or full session identifiers.

## Content Management

- Separate draft and published content.
- Preview drafts without publishing them.
- Keep structured values such as event dates, prices and opening times out of rich-text blobs.
- Restrict the editor to safe supported components.
- Require alternative text for meaningful images.
- Record who changed and published content.
- Ensure CMS changes are visible to both public clients through the shared API or published read model.
- Preserve stable URLs and support redirects when slugs change.

## Events and Tickets

- Calculate availability and price on the server.
- Create expiring holds before simulated checkout.
- Protect the last-ticket case with a transaction and row lock.
- Do not allow held plus sold quantities to exceed allocation.
- Create one ticket record per admission.
- Use random, non-sequential public ticket codes.
- Sign QR payloads and include no unnecessary personal information.
- Allow only one accepted check-in per ticket.
- Return clear results for valid, already used, refunded, cancelled and unknown tickets.
- Invalidate refunded or cancelled tickets.
- Keep a complete check-in and refund audit history.

## Room Bookings

The demo uses an approval-led workflow:

1. Customer submits an enquiry.
2. Staff review and may request information.
3. Staff issue a versioned offer with dates, price, deposit, terms and expiry.
4. Customer accepts the exact terms version.
5. Backend rechecks availability.
6. Customer completes a simulated deposit.
7. Backend confirms the booking.

Preserve setup and cleanup buffers. Use the database exclusion constraint to prevent conflicting provisional or confirmed bookings. Do not rely only on a calendar UI for conflict detection.

## Membership and Digital Card

- Keep account identity separate from membership status.
- Support active, expired and suspended demonstration members.
- Do not use the membership number as an authentication secret.
- Make claim errors privacy-safe; do not reveal unrelated membership records.
- Route ambiguous claim examples to a staff-review state.
- Validate member pricing and protected access on the server.
- Display only approved information on the digital card.
- Use a signed or rotating validation credential.
- Increment the card version to revoke an issued credential.

## API Conventions

- Version routes, for example `/api/v1`.
- Maintain an OpenAPI document as endpoints change.
- Validate path, query and body inputs at runtime.
- Use stable machine-readable error codes and safe human-readable messages.
- Include a request identifier in errors and logs.
- Use consistent pagination and filtering.
- Require idempotency keys for checkout and other retried commands.
- Do not return database models indiscriminately. Use deliberate response contracts.
- Do not leak internal errors, stack traces, secrets or unnecessary personal data.

## Interface Requirements

- Maintain the agreed contemporary navy, cream and restrained gold visual direction.
- Preserve the club's local and welcoming character without making the interface look corporate or generic.
- Design mobile-first, then verify larger layouts.
- Provide loading, empty, success and error states for every data-backed screen.
- Do not leave non-functional buttons in demonstration journeys.
- Use realistic copy and dates, not lorem ipsum.
- Clearly label the environment as a demonstration.
- Show useful recovery actions when a simulated request fails.
- Keep website, admin and API status names consistent with the shared contract.

## Accessibility

Target WCAG 2.2 AA for the website and CMS journeys.

- Use semantic HTML.
- Support complete keyboard operation.
- Keep visible focus indicators.
- Use logical headings and landmarks.
- Associate labels, instructions and errors with form controls.
- Announce validation and asynchronous status changes.
- Support zoom, reflow and large text.
- Meet contrast and touch-target requirements.
- Do not use colour alone to communicate status.
- Honour reduced-motion preferences.
- Provide text alternatives for maps and meaningful imagery.
- Test representative journeys with a screen reader.

Accessibility checks are part of feature completion, not a final cosmetic pass.

## Security and Privacy Boundaries

- Use fictional demo data only.
- Never add real personal data to fixtures, screenshots, logs or commits.
- Never request real card information in the payment simulator.
- Keep secrets in environment configuration, never source files.
- Redact tokens, credentials and sensitive fields from logs.
- Restrict admin and reset capabilities by permission.
- Apply secure HTTP headers and an appropriate content security policy.
- Validate uploads and prevent anonymous writes to object storage.
- Rate-limit sensitive public endpoints.
- Record privileged changes in the audit trail.
- Keep production and demonstration data and credentials separate.

## Testing Requirements

Add tests with the feature rather than postponing them.

### Unit Tests

- Status transitions
- Price and total calculations
- Membership eligibility
- Date and availability rules
- Validation schemas
- Payment idempotency

### Database and Integration Tests

- Migrations from an empty database
- Foreign keys and unique constraints
- Ticket inventory concurrency
- Booking overlap rejection
- Duplicate simulated payment events
- One accepted ticket check-in
- Permission enforcement
- Outbox retry and replay

### End-to-End Tests

- Admin publishes an event and the website and public API display it
- Customer completes simulated ticket checkout
- Issued ticket is accepted exactly once
- Refunded ticket is rejected
- Customer completes enquiry, offer and simulated deposit
- Conflicting booking is rejected
- Active member claims an account and displays a card
- Suspended or expired member loses protected eligibility
- Admin resets demo data safely

Use generated test data. Tests must not depend on execution order or a developer's existing local records.

## Required Quality Checks

Before marking work complete, run the repository's applicable commands for:

- Formatting check
- Lint
- Type check
- Unit tests
- Integration tests
- Database migration validation
- Production build
- Relevant end-to-end tests

If a required command cannot run, state exactly why, what was checked instead and what remains unverified. Do not claim success from code inspection alone.

## Change Discipline

- Preserve unrelated user changes in a dirty working tree.
- Keep changes focused on the current task.
- Prefer small, reviewable commits and vertical slices.
- Do not delete or rewrite data, migrations or configuration without confirming scope.
- Do not run destructive database or filesystem commands against broad or unresolved targets.
- Do not weaken tests, permissions or constraints merely to make a check pass.
- Document material architectural decisions.
- Update README and example environment files when setup changes.

## Completion Report

When completing a task, report:

1. The user-visible outcome.
2. The principal files or components changed.
3. Database migrations added.
4. Commands and tests run with their results.
5. Assumptions or known limitations.
6. The next safe vertical slice when relevant.

Do not report routine internal steps or claim that an untested path works.

## Demo Definition of Done

The demonstration is complete when:

- The CMS and website use the same backend data.
- An administrator can publish an event without code changes.
- The published event appears on the website and public API.
- A customer can complete simulated ticket checkout and receive a ticket.
- Staff can validate the ticket exactly once.
- A customer can complete the enquiry, offer and simulated-deposit booking journey.
- A member can sign in and display a valid digital membership card.
- Role permissions protect administration functions.
- Dummy data can be safely reset.
- Core automated tests pass.
- Supported screens pass the agreed accessibility checks.
- Railway deployment configuration and setup documentation are complete.
- No real personal or payment-card data is present.

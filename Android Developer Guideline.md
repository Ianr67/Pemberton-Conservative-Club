# Android Developer Guideline

## Purpose of this document

This document is the implementation guide for an Android client for the Pemberton Conservative Club demonstration platform. The Android application must be a client of the shared HTTP API. It must not connect directly to PostgreSQL, copy database records into source code, or create Android-only versions of events, content, memberships, bookings, orders, or tickets.

The repository is a demonstration environment. Use only fictional people and transactions. Never collect real payment-card details or import real member information.

## Understand the platform first

The platform is a TypeScript monorepo containing:

- `apps/website`: public Next.js website
- `apps/admin`: browser-based administration portal
- `apps/api`: shared NestJS API
- `apps/worker`: background-work service
- `packages/database`: PostgreSQL migrations, seed data, and database utilities
- `packages/contracts`: shared API types and validation rules
- `packages/design-system`: shared visual tokens and reusable web primitives

PostgreSQL is the source of truth. The administration portal, website, and future Android application must display the same backend records. For example, when an administrator publishes an event, Android must obtain it from the public event API rather than from an app release or bundled JSON file.

Before beginning Android work, read:

1. `AGENTS.md`
2. `README.md`
3. `packages/contracts/src/index.ts`
4. The controllers in `apps/api/src`
5. The database migrations in `packages/database/migrations`
6. The current OpenAPI document when one is added or exposed by the API

Treat the API implementation and published OpenAPI contract as authoritative. If this guide and the API disagree, stop and clarify the contract before building around an assumption.

## Current backend capability

At the time this guide was written, the shared API implements these relevant public endpoints under `/api/v1`:

- `GET /health`: API liveness
- `GET /health/database`: database readiness
- `GET /content/homepage-introduction`: published homepage introduction
- `GET /club-settings`: published club details and opening times
- `GET /events`: published events with `public` visibility
- `GET /events/{slug}`: one published event; public and unlisted events can be addressed directly

The event contract is defined by `EventRecord` in `packages/contracts/src/index.ts`. It includes the event identifier, slug, title, description, doors/start/end timestamps, visibility, venue, capacity, optional artwork metadata, publication time, and update time.

Important current behaviour:

- Event listing is ordered by event start time.
- Draft events must not appear in the public Android client.
- A missing, draft, or unavailable event is returned as HTTP `404` with the machine-readable code `event_not_found`.
- Dates are ISO 8601 UTC timestamps. Convert them to the user's display timezone, while preserving the original instant.
- Artwork is metadata containing an HTTPS URL, alternative text, and optional intrinsic dimensions. Image bytes are not stored in PostgreSQL.
- Ticketing, checkout, payments, room booking, membership, digital cards, and their customer authentication APIs are not yet implemented. Do not invent private endpoints or bypass the API to implement them.

Confirm the current endpoint set before each Android milestone. The backend will evolve as later vertical slices are completed.

## Recommended Android technology baseline

Create a conventional native Android application using:

- Kotlin
- Jetpack Compose and Material 3
- A single-activity architecture with Navigation Compose
- Coroutines and `Flow` for asynchronous work
- ViewModels with lifecycle-aware state collection
- Dependency injection with Hilt
- Retrofit and OkHttp, or an equivalent maintained HTTP stack
- Kotlin serialization or Moshi for strict JSON decoding
- Coil for remote artwork
- Room only for an intentional local cache, never as an independent source of club records
- Gradle Kotlin DSL and a version catalog
- JUnit, coroutine test utilities, MockWebServer, Compose UI tests, and accessibility checks

Use the Android project's existing approved stack if one already exists. Do not replace reasonable established choices merely to match this list.

Set sensible minimum and target SDK versions based on current Play requirements and the devices agreed for the demonstration. Record those choices in the Android README rather than silently excluding older demonstration devices.

## Repository and module structure

Android source is explicitly outside the current web implementation scope, so agree its location before creating it. A suitable structure for a new application is:

```text
apps/android/
  app/
  core/model/
  core/network/
  core/designsystem/
  core/testing/
  feature/home/
  feature/events/
```

Keep the initial structure small. Add feature modules only when they create a useful ownership or build boundary. Do not create empty modules for every future feature.

The Android project may not be able to consume the TypeScript package directly. Generate Kotlin DTOs from OpenAPI where practical, or maintain deliberately mapped Kotlin network DTOs with contract tests. Do not mechanically expose database-shaped objects to the UI.

## Environment configuration

Provide separate build configurations for local demonstration, shared demonstration, and production-like environments. The API base URL must come from build configuration and must end at the version root, for example:

```text
http://10.0.2.2:3002/api/v1
```

`10.0.2.2` is the Android Emulator alias for the host machine. A physical device needs a reachable development-machine address or a deployed HTTPS API.

Requirements:

- Do not hard-code secrets in Kotlin, resources, Gradle files, or source control.
- Treat a public API base URL as configuration, not a secret.
- Permit cleartext HTTP only for an explicitly scoped local development host through a debug-only network security configuration.
- Require HTTPS for shared demonstration and production-like builds.
- Give non-production builds a visible `Demonstration` label.
- Use distinct application IDs or suffixes where simultaneous installation is useful.
- Do not enable development credentials or permissive network settings in release builds.

## Network and contract layer

Create a small API service around versioned routes. Keep network DTOs separate from domain and presentation models. Map every response explicitly.

The network layer must:

- Set JSON accept headers.
- Apply finite connection, read, and call timeouts.
- Cancel calls when their owning coroutine is cancelled.
- Decode responses strictly enough to detect missing required fields.
- Preserve HTTP status, machine-readable error code, safe message, and request identifier where returned.
- Never log passwords, session cookies, authorization values, tokens, full identifiers, or unnecessary personal data.
- Avoid automatic retries for mutation requests unless the contract and idempotency behaviour make them safe.
- Allow limited retries with backoff for transient public `GET` failures.
- Distinguish offline, timeout, malformed-response, server-error, unauthorized, forbidden, rate-limited, and not-found outcomes.

Do not model every error as an empty list. An empty successful event response means there are currently no published events. A failed response means the programme could not be loaded and must show a recovery action.

Use HTTP caching semantics when the API supplies them. Until then, an optional short-lived local event cache may improve resilience, but stale content must be labelled and refreshed from the API. Never ship event fixtures as the normal data source.

## Initial Android vertical slice

The first Android implementation should mirror the completed public website event slice and use only the shared public event API.

### Event listing

Implement a `What is on` destination that:

- Requests `GET /api/v1/events`.
- Displays only records returned by that endpoint.
- Uses a responsive list or adaptive grid appropriate to window width.
- Shows artwork with the API-provided alternative description where accessibility APIs can use it.
- Shows event title, local date and time, venue, and a concise description.
- Opens details using the stable event slug.
- Supports pull-to-refresh or an equally clear retry action.
- Provides distinct initial-loading, content, empty, refresh-error, and full-screen failure states.
- Preserves usable cached content during a refresh failure when a cache is implemented.

### Event details

Implement an event-detail destination that:

- Requests `GET /api/v1/events/{slug}`.
- Does not depend solely on a complete event object passed through navigation.
- Shows title, full description, venue, doors time, start time, end time where useful, and artwork.
- Shows a genuine not-found screen for HTTP `404`, with navigation back to the listing.
- Shows a retryable failure state for network and server failures.
- Does not display booking, buying, ticket, membership-price, or checkout controls before those APIs exist.
- Supports Android deep links for the agreed public event URL shape when the website domain and app-link association are ready.

### Date and time handling

Parse API timestamps as instants, preferably using `java.time.Instant`. Format them through locale-aware Android APIs in the device timezone unless product requirements specify the club timezone.

For the club's UK events:

- Handle GMT and British Summer Time correctly.
- Do not derive timezone offsets manually.
- Use the user's 12/24-hour system preference.
- Include the complete spoken date and time in accessibility semantics.
- Use unambiguous date formatting; avoid numeric-only dates such as `03/04/26`.
- When an event spans dates, announce both dates.

## UI and design direction

The Android app should feel like the same club, not a generic enterprise application. Follow the website's contemporary navy, cream, and restrained gold direction. Recreate design tokens for Android rather than importing CSS values at runtime.

Use:

- Navy for strong structural surfaces
- Cream for primary reading surfaces
- Gold as a restrained accent, never the only status indicator
- Comfortable typography and spacing
- Realistic club-focused copy
- Responsive layouts for phones, foldables, and tablets
- Edge-to-edge layouts with correct system-bar insets

Every data-backed screen needs loading, empty, success, and error states. Do not leave non-functional buttons in demonstration journeys.

Support light mode first if that is the agreed visual baseline. Only advertise dark-theme support after every surface, image treatment, and contrast combination has been verified.

## Accessibility requirements

Target WCAG 2.2 AA principles and Android accessibility best practices.

- Use semantic Compose elements and meaningful roles.
- Keep touch targets at least 48 dp.
- Provide visible keyboard and directional-navigation focus.
- Maintain logical traversal and heading order.
- Give meaningful event artwork useful content descriptions; mark decorative fallback art as decorative.
- Do not repeat visible text unnecessarily in content descriptions.
- Announce loading completion, errors, and relevant refresh results without excessive interruption.
- Do not communicate status using colour alone.
- Support font scaling and display scaling without clipped content.
- Test reflow with large fonts and narrow windows.
- Honour reduced-motion and animation-scale preferences.
- Meet contrast requirements in normal, disabled, selected, and focused states.
- Test with TalkBack and Switch Access on representative journeys.

Dates such as `Friday 18 September 2026, starts at 7 PM` should be announced as meaningful phrases, not as disconnected visual fragments.

## Authentication and protected features

Do not implement customer or member authentication until the shared API publishes an approved contract for it.

When it becomes available:

- Use individual identities, never one shared app identity.
- Prefer an established OAuth 2.1/OpenID Connect authorization-code flow with PKCE if the backend adopts it.
- Use a browser-based authorization surface rather than collecting identity-provider credentials in the app.
- Store refresh tokens or equivalent long-lived credentials only through Android Keystore-backed facilities.
- Keep access tokens in memory where practical.
- Redact credentials from logs, crash reports, analytics, screenshots, and backups.
- Handle token expiry, revocation, disabled accounts, and sign-out explicitly.
- Revoke server sessions during sign-out when the API supports it.
- Never use a membership number as an authentication secret.

Do not infer authorization from hidden UI. The backend must enforce every protected operation.

## Future feature boundaries

Implement later features only after their database, contract, API rules, and server-side tests exist.

### Tickets and simulated checkout

- Never request real card numbers, security codes, or bank details.
- Label every payment surface `Simulated payment` or `Demo checkout`.
- Create holds and calculate availability through the backend.
- Require idempotency keys for retried checkout commands.
- Treat a client success screen as informational; only backend-confirmed payment events can issue tickets.
- Render the server-issued signed QR payload without adding personal data.
- Never attempt client-side ticket validation as the authority.

### Ticket validation

- Send scans to the shared validation endpoint when it exists.
- Clearly distinguish valid, already used, refunded, cancelled, and unknown tickets.
- Design for intermittent connectivity only if the backend defines a secure offline-validation protocol. Do not invent one.
- Ensure one accepted check-in is enforced by the backend.

### Room booking

- Follow the approval-led enquiry, staff review, versioned offer, acceptance, simulated deposit, and confirmation workflow.
- Display the exact offer version being accepted.
- Let the backend recheck availability and enforce overlap constraints.
- Never present a calendar calculation as authoritative availability.

### Membership and digital card

- Keep account identity separate from membership status.
- Display only server-approved card fields.
- Use the signed or rotating credential issued by the backend.
- Refresh when card version or membership status changes.
- Remove protected eligibility promptly for expired or suspended members.
- Keep claim failures privacy-safe.

## Offline behaviour

Define offline support per feature rather than promising that the entire app works offline.

For public events, it is reasonable to show the most recently successful response with a visible stale/offline indication. Cache entries should include fetch time and contract version where useful. A user must still be able to distinguish:

- Fresh API content
- Cached content awaiting refresh
- An empty successful response
- No cached content because the first request failed

Never queue payment confirmations, ticket validation, offer acceptance, or other sensitive state transitions unless the backend explicitly supports safe replay and idempotency.

## Security and privacy

- Use only fictional `example.test` identities and demonstration transactions.
- Do not include production credentials, real member records, or real payment data in source, tests, screenshots, previews, or logs.
- Use Android Network Security Configuration deliberately.
- Do not disable TLS certificate validation or install a permissive trust manager.
- Disable application backup for sensitive data unless an explicit encrypted backup design is approved.
- Prevent sensitive screens from appearing in recents or screenshots where the eventual data warrants it.
- Minimise analytics and crash-report fields; obtain approval before adding third-party SDKs.
- Keep dependencies maintained and run vulnerability checks.
- Validate app links and all external intents.
- Treat QR codes, deep links, notification payloads, cached JSON, and image URLs as untrusted external input.
- Do not expose internal stack traces or backend error details to users.

## Testing strategy

Tests must be deterministic and must not depend on a developer's existing database records or execution order.

### Unit tests

Cover:

- DTO-to-domain mapping
- ISO timestamp parsing and GMT/BST formatting
- Event ordering assumptions that exist in presentation code
- Empty, loading, content, stale-content, and failure state reducers
- Error-body mapping
- Not-found handling
- Retry policies
- Any future status transitions and eligibility rules

### Network integration tests

Use MockWebServer or an equivalent to verify:

- Correct versioned paths and encoded slugs
- Successful list and detail decoding
- Empty event list
- Malformed or incomplete JSON
- `404`, `429`, and `5xx` responses
- Timeout and disconnected responses
- Redaction of sensitive headers and bodies
- Cache behaviour where implemented

Keep representative JSON fixtures synchronized with the shared OpenAPI schema. Add a CI contract check so incompatible API changes fail before release.

### Compose UI tests

Verify:

- Event cards and detail navigation
- Loading and empty states
- Retry from failure
- Not-found navigation recovery
- Large-font and compact-width layouts
- Content descriptions, headings, traversal, and touch targets
- State restoration after process recreation where important

### End-to-end tests

Against a reset demonstration environment, eventually cover:

1. An administrator publishes an event.
2. Android refreshes and displays that event.
3. The event deep link opens its details.
4. Unpublishing the event removes it from the listing and makes its detail unavailable.

Add ticketing, booking, and membership end-to-end journeys only when those backend slices are complete.

## Observability and diagnostics

Use structured, privacy-conscious diagnostics. Include an app-generated correlation identifier or forward the API request identifier where the contract permits. Record operation name, result category, duration, and safe HTTP status—not complete response bodies or secrets.

The application should provide a small demonstration diagnostics screen or debug panel showing:

- App version and build type
- Selected API environment
- API reachability
- Last successful event refresh time
- Database readiness only when exposing it is appropriate for the demonstration environment

Do not expose this diagnostic detail as a production user feature without review.

## Continuous integration and release checks

Android CI should run:

- Formatting checks
- Android lint with warnings treated according to the agreed baseline
- Kotlin compilation
- Unit tests
- Network contract tests
- Compose UI tests on representative API levels
- Debug and release-candidate builds
- Dependency and secret scanning
- Baseline Profile generation or performance tests when startup performance becomes material

Before handing over a demonstration APK or App Bundle:

- Verify the configured API URL and HTTPS policy.
- Reset the backend to deterministic fictional fixtures.
- Exercise success, empty, error, and not-found event journeys.
- Test on at least one physical phone and one emulator.
- Test TalkBack, large text, rotation, and a tablet or responsive emulator.
- Confirm no real personal or payment data appears.
- Record the application version, backend contract version, test results, and known limitations.
- Keep signing keys outside source control and document custody and recovery.

## Implementation order

Follow the backend dependency order and complete one vertical slice at a time:

1. Android project foundation, environment configuration, CI, and API health check
2. Shared network/error layer and contract tests
3. Public club content and settings
4. Public event listing and event details
5. Customer authentication, only after its backend contract exists
6. Ticket holds and simulated checkout
7. Orders, issued tickets, and QR display
8. Staff ticket validation, if included in the approved Android product
9. Room enquiry, offer, and simulated-deposit flow
10. Membership claim and digital card
11. Notifications, offline refinements, accessibility, security, and release hardening

Do not bypass unfinished prerequisites to create a visually complete but disconnected screen.

## Definition of done for an Android feature

An Android feature is complete only when:

- It uses the shared API and shared backend records.
- Its API contract is documented and validated.
- Loading, empty, success, error, and relevant offline states work.
- Authorization is enforced by the backend for protected actions.
- Accessibility has been tested, not merely inspected.
- Unit, network, UI, and relevant end-to-end tests pass.
- Logging and error recovery are implemented without leaking sensitive data.
- Environment and setup documentation is current.
- The feature has been exercised with deterministic fictional seed data.
- No out-of-scope controls or non-functional demonstration actions remain.

## Questions that require agreement before development

Resolve these product decisions before committing to the full app architecture:

- Whether Android lives in this monorepo or a separate repository
- Minimum supported Android version and demonstration devices
- Phone-only versus adaptive tablet/foldable support
- The deployed demonstration API URL and certificate setup
- Authentication protocol for customers, members, and staff
- Which staff functions, if any, belong in Android
- Deep-link and verified app-link domains
- Offline requirements for public content and ticket validation
- Push-notification provider and consent requirements
- Analytics, crash reporting, privacy notice, and retention policy
- Play Store delivery versus privately distributed demonstration builds

Until those decisions and the corresponding backend contracts exist, build the public read-only foundation and event experience without inventing future server behaviour.

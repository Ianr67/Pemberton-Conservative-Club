# iOS Developer Guideline

## Purpose

This document is the implementation guide for a native iPhone and iPad client for the Pemberton Conservative Club demonstration platform. The iOS application must consume the shared HTTP API. It must not connect directly to PostgreSQL, contain a separate authoritative event catalogue, or create iOS-only versions of content, members, orders, tickets, or bookings.

This is currently a demonstration platform. Use fictional people and simulated transactions only. Never collect real payment-card information or import real member data.

## Understand the existing platform

The repository is a TypeScript monorepo containing:

- `apps/website`: public Next.js website
- `apps/admin`: browser administration portal
- `apps/api`: shared NestJS API
- `apps/worker`: background-work service
- `packages/contracts`: shared API types and validation rules
- `packages/database`: PostgreSQL migrations, seed, and database utilities
- `packages/design-system`: shared web visual tokens

PostgreSQL is the source of truth. The website, administration portal, iOS app, and any future Android app must display records from the same backend. Publishing an event in the CMS must make it available to iOS through the API without an iOS release or duplicate entry.

Before beginning iOS development, read:

1. `AGENTS.md`
2. `README.md`
3. `Android Developer Guideline.md` for cross-client consistency
4. `Project Testing Guide.md`
5. `Railway Hosting Guideline.md`
6. `packages/contracts/src/index.ts`
7. Controllers under `apps/api/src`
8. Database migrations under `packages/database/migrations`
9. The current OpenAPI document when one is published

The implemented API and approved OpenAPI contract are authoritative. Stop and clarify discrepancies instead of coding around assumptions.

## Current API capability

The shared API currently exposes these relevant public routes under `/api/v1`:

- `GET /health`: API liveness
- `GET /health/database`: database readiness
- `GET /content/homepage-introduction`: published homepage introduction
- `GET /club-settings`: published club details and opening times
- `GET /events`: published events with public visibility
- `GET /events/{slug}`: one published event by slug, including an unlisted event addressed directly

The event shape is defined by `EventRecord` in `packages/contracts/src/index.ts`. It includes identifiers, slug, title, description, doors/start/end timestamps, status, visibility, venue, capacity, optional artwork metadata, and publication/update timestamps.

Important boundaries:

- Draft events must never appear in the public iOS app.
- Event listing is ordered by start time by the API.
- Missing, draft, or unavailable event details return HTTP `404` with code `event_not_found`.
- Timestamps are ISO 8601 instants. Preserve the instant and format it for presentation correctly.
- Artwork is an HTTPS URL with alternative text and optional dimensions.
- Customer authentication, tickets, checkout, payments, bookings, memberships, digital cards, and notifications are not yet implemented.
- Do not invent endpoints, query PostgreSQL, scrape the website, or use bundled fixture data as the live source.

Verify the endpoint set before each milestone because later vertical slices will extend it.

## Apple guidance

Review current Apple documentation during implementation:

- [SwiftUI navigation](https://developer.apple.com/documentation/swiftui/understanding-the-navigation-stack)
- [Keychain Services](https://developer.apple.com/documentation/security/keychain-services)
- [App Transport Security](https://developer.apple.com/documentation/security/preventing-insecure-network-connections)
- [Adding tests to an Xcode project](https://developer.apple.com/documentation/xcode/adding-tests-to-your-xcode-project)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [App Store Connect workflow](https://developer.apple.com/help/app-store-connect/get-started/app-store-connect-workflow)
- [TestFlight test information](https://developer.apple.com/help/app-store-connect/test-a-beta-version/provide-test-information)

These references were checked in September 2026. Apple policies and SDK recommendations change; confirm them against the shipping Xcode and SDK before release.

## Recommended technology baseline

For a new native client, use:

- Swift with strict concurrency checking enabled
- SwiftUI for the interface
- `NavigationStack` with lightweight route values
- Structured concurrency with `async`/`await`
- `URLSession` for HTTP
- `Codable` with explicit DTOs for JSON
- Observation or an equivalent first-party state-management approach appropriate to the minimum OS
- `AsyncImage` only for simple needs, or a small approved image pipeline with memory/disk caching
- Swift Testing for unit and integration tests
- XCTest/XCUIAutomation for UI and performance tests
- Swift Package Manager for dependencies

Prefer Apple frameworks and a small dependency surface. Do not add a networking, persistence, analytics, or architecture framework merely because it is fashionable. Every third-party SDK adds privacy, security, update, and App Store disclosure obligations.

Agree and document:

- Minimum iOS and iPadOS versions
- Supported iPhone and iPad devices
- Portrait-only versus adaptive orientation support
- Whether macOS via Designed for iPad or Mac Catalyst is supported
- Swift and Xcode versions used by CI

Do not silently exclude demonstration devices.

## Repository placement and project structure

Android and iOS source are outside the currently implemented web scope. Agree whether iOS belongs in this monorepo or a separate repository before creating it.

A suitable starting structure is:

```text
apps/ios/
  PembertonClub.xcodeproj
  PembertonClub/
    App/
    Core/
      API/
      Models/
      DesignSystem/
      Persistence/
    Features/
      Home/
      Events/
    Resources/
  PembertonClubTests/
  PembertonClubUITests/
```

Use Xcode groups that correspond to filesystem folders. Keep the initial project small. Split code into local Swift packages only when that produces a useful compilation, testing, or ownership boundary.

The app cannot directly import the TypeScript contracts package. Prefer generated Swift DTOs from the approved OpenAPI schema, or maintain explicit Swift DTOs plus automated contract fixtures. Map DTOs into deliberate domain models rather than leaking transport concerns into views.

## Build configurations and environments

Create at least:

- Debug/local
- Staging/demo
- Release/production

Use `.xcconfig` files for non-secret values such as the API base URL. Keep environment-specific files explicit and reviewable. Do not store secrets in `.xcconfig`, `Info.plist`, source code, the app bundle, or Git; an installed app cannot securely conceal a shared secret.

Example logical configuration:

```text
Debug API: http://localhost-or-development-host:3002/api/v1
Staging API: https://api-staging.example-domain/api/v1
Release API: https://api.example-domain/api/v1
```

Simulator networking differs from a physical device. `localhost` in Simulator commonly refers to the Mac host, but test explicitly. A physical iPhone needs a reachable LAN development API or hosted HTTPS environment.

Requirements:

- Keep the demonstration environment visibly labelled.
- Use different bundle identifiers or suffixes when simultaneous installation is useful.
- Require HTTPS outside narrowly scoped local development.
- Never ship development credentials or broad transport-security exceptions.
- Make the selected environment visible in internal/debug diagnostics.
- Prevent production builds from selecting a development backend accidentally.

## App Transport Security

App Transport Security should remain enabled. Staging and production APIs must use valid HTTPS certificates and modern TLS.

If local HTTP is unavoidable:

- Add the narrowest debug-only exception possible.
- Prefer local-network allowances or a named development host over `NSAllowsArbitraryLoads`.
- Do not place permissive ATS exceptions in the Release configuration.
- Document why each exception exists and how it is prevented from shipping.
- Remember that some ATS exceptions require App Review justification.

Never disable TLS validation, accept all certificates, or implement a permissive `URLSessionDelegate` challenge handler.

## Network and contract layer

Create an `APIClient` protocol and a production `URLSession` implementation. Inject it into feature models so tests can use deterministic stubs.

The client should:

- Resolve paths against one validated `/api/v1` base URL.
- Set appropriate `Accept` and JSON content headers.
- Use finite request and resource timeouts.
- Cooperate with task cancellation.
- Decode dates with a tested ISO 8601 strategy, including fractional seconds where returned.
- Validate required fields rather than presenting partially decoded records.
- Preserve HTTP status, safe server message, machine-readable error code, and request identifier.
- Distinguish offline, timeout, cancellation, malformed response, unauthorized, forbidden, rate-limited, not-found, and server failure.
- Avoid retrying mutations unless the contract and idempotency key make replay safe.
- Apply limited exponential backoff only to suitable transient reads.
- Redact authorization, cookies, tokens, database URLs, personal data, and complete response bodies from logs.

A useful error model is conceptually:

```swift
enum APIError: Error, Equatable {
    case offline
    case timedOut
    case cancelled
    case notFound(code: String?)
    case unauthorized
    case forbidden
    case rateLimited(retryAfter: Duration?)
    case server(status: Int, requestID: String?)
    case invalidResponse
}
```

Do not map every failure to an empty array. A successful empty event array means no published events exist. A failed request means events could not be loaded and needs a recovery action.

## Data models

Use separate layers:

- Network DTOs mirror the JSON contract and remain internal to the API layer.
- Domain models represent validated application concepts.
- View state describes loading, content, empty, stale, failure, and not-found presentation.

Use `URL`, `Date`, and typed identifiers where practical. Do not represent every value as `String` after decoding.

Do not make entire domain models navigation path values. Navigate with a lightweight slug or identifier and fetch current detail from the API. This follows Apple's guidance and prevents stale listing data from becoming authoritative.

## Initial vertical slice: public events

The first iOS feature should mirror the completed public website event slice and use only the shared public event API.

### What is on

Implement a `What is on` destination that:

- Requests `GET /api/v1/events`.
- Displays exactly the records returned by the public endpoint.
- Uses `List`, `LazyVStack`, or an adaptive grid appropriate to the supported size class.
- Shows artwork, title, date/time, venue, and concise description.
- Navigates using the stable event slug.
- Supports an intentional refresh action.
- Provides distinct initial-loading, content, empty, refresh-failure, and full failure states.
- Retains usable content during a refresh error when a local cache exists.
- Does not expose draft or admin preview data.

Avoid an indefinite activity indicator. If loading fails, replace it with an understandable error and retry action.

### Event details

Implement a detail destination that:

- Requests `GET /api/v1/events/{slug}`.
- Fetches current detail rather than trusting a complete model passed through navigation.
- Shows title, full description, venue, doors time, start time, end time where useful, and artwork.
- Shows a genuine not-found view for HTTP `404`.
- Provides a retryable state for connectivity or server failure.
- Provides a clear route back to all events.
- Contains no ticket, checkout, payment, booking, or membership call to action until those contracts exist.

### Date and time presentation

Decode timestamps as `Date` values representing instants. Format with `Date.FormatStyle`, `DateIntervalFormatter`, or equivalent locale-aware first-party APIs.

- Respect the user's locale and 12/24-hour preference.
- Confirm UK GMT/BST transitions using explicit tests.
- Do not manually add hour offsets.
- Avoid ambiguous numeric-only dates.
- Include both dates when an event spans midnight.
- Supply a coherent VoiceOver description such as “Friday 18 September 2026, starts at 7 PM”.
- Decide whether presentation follows the device timezone or fixed club timezone, document that rule, and apply it consistently across clients.

### Artwork

- Load only HTTPS image URLs accepted by the API contract.
- Preserve aspect ratio and avoid layout jumps.
- Use the API-provided alternative text for meaningful images.
- Treat the branded fallback as decorative if it conveys no extra information.
- Show a stable placeholder and graceful failure state.
- Apply memory and disk limits to image caching.
- Do not leak image URLs or identifiers into analytics.

## UI and design direction

The app should feel like the same welcoming local club as the website. Recreate shared visual decisions as native tokens:

- Contemporary navy structural surfaces
- Cream reading surfaces
- Restrained gold accents
- Comfortable spacing and readable typography
- Clear content hierarchy
- Realistic club-focused language

Use native controls and platform conventions. Do not reproduce the website pixel for pixel when that would harm iOS usability.

Support:

- iPhone compact widths
- iPad regular widths
- Split View and Stage Manager if iPad is supported
- Portrait and landscape where agreed
- Dynamic Type
- Light and dark appearances only when both are fully designed and tested
- Safe areas, keyboard avoidance, and input accessory behaviour

Every data-backed screen needs loading, empty, success, and error states. Do not leave dormant or non-functional controls in demonstration builds.

## Accessibility

Target WCAG 2.2 AA principles and Apple's accessibility guidance.

- Use semantic SwiftUI controls rather than gesture-only custom views.
- Provide useful accessibility labels, values, hints, traits, and headings.
- Do not duplicate visible text unnecessarily for VoiceOver.
- Mark decorative images hidden from accessibility.
- Group card content so it is understandable without excessive swipes.
- Keep interactive targets at least 44 by 44 points.
- Maintain a logical VoiceOver and keyboard focus order.
- Support Full Keyboard Access, Switch Control, Voice Control, and VoiceOver.
- Support all relevant Dynamic Type accessibility sizes without clipping or overlap.
- Do not communicate status using colour alone.
- Meet contrast requirements in light, dark, selected, disabled, and focused states.
- Respect Reduce Motion, Reduce Transparency, Increase Contrast, and Differentiate Without Color.
- Announce meaningful loading completion, errors, refresh outcomes, saves, and validation changes.
- Use accessibility identifiers for UI automation without exposing sensitive data.

Run Xcode accessibility audits, then manually test representative journeys with VoiceOver. Automated audits do not prove that spoken order, wording, and task completion are usable.

## Local caching and offline behaviour

Define offline support per feature. Public events may use a short-lived cache, but the API remains authoritative.

Suitable approaches include a small actor-isolated file cache, SwiftData/Core Data when genuinely warranted, or `URLCache` where HTTP headers support it. Do not add a database solely to save one small response without measuring the benefit.

The UI must distinguish:

- Fresh API content
- Cached content currently refreshing
- Stale/offline content with last-updated information
- A successful empty response
- First-load failure with no cached content

Never queue payment confirmation, ticket check-in, offer acceptance, or other sensitive commands for later replay unless the backend explicitly supports secure idempotent offline behaviour.

Do not ship seed event JSON as the normal fallback. Preview/sample data may exist only in preview and test targets.

## Authentication and protected features

Do not implement customer, member, or staff authentication until the shared API publishes an approved client contract.

When available:

- Prefer OAuth 2.1/OpenID Connect authorization code with PKCE if adopted by the backend.
- Use `ASWebAuthenticationSession` for browser-based authentication.
- Do not embed an identity-provider login web view or collect provider credentials directly.
- Store long-lived credentials only in Keychain with deliberately selected accessibility settings.
- Keep short-lived access tokens in memory where practical.
- Protect especially sensitive credentials with device-owner authentication only when the product experience and recovery path are approved.
- Handle expiration, refresh, revocation, disabled accounts, and logout explicitly.
- Revoke the server session during logout where supported.
- Clear protected caches after logout or account change.
- Never use membership number as an authentication secret.
- Never infer authorization from hidden SwiftUI controls; the API must enforce permissions.

Do not store tokens in `UserDefaults`, plist files, logs, crash attachments, analytics, or unprotected backups.

## Future feature boundaries

Implement later features only after their database, OpenAPI contract, API behaviour, authorization, and backend tests exist.

### Simulated ticket checkout

- Clearly label every payment surface `Simulated payment` or `Demo checkout`.
- Never request a card number, security code, bank account, or Apple Pay authorization for the simulator.
- Create ticket holds and calculate totals through the backend.
- Generate and persist idempotency keys for retried commands.
- Treat a client success screen as informational; only a processed backend payment event may issue tickets.
- Handle success, failure, cancellation, timeout, and interrupted app state.

Do not use StoreKit or In-App Purchase for club event tickets without a product/legal review; real-world goods and services have specific App Review and payment-policy considerations.

### Tickets and QR display

- Display only the server-issued signed QR payload.
- Do not embed unnecessary personal information.
- Prevent accidental brightness reduction while a ticket is presented if appropriate.
- Consider screenshot/privacy behaviour based on the approved threat model.
- Refresh revoked, refunded, or cancelled ticket state.
- Never decide ticket validity solely on device.

### Staff validation

- Request camera access only when the user enters scanning functionality.
- Provide an accurate camera purpose string.
- Send payloads to the shared validation endpoint.
- Clearly distinguish valid, already used, refunded, cancelled, and unknown results.
- Support offline validation only if the backend defines a secure reconciliation protocol.
- Preserve backend enforcement of one accepted check-in.

### Room booking

- Follow enquiry, review, versioned offer, exact-version acceptance, simulated deposit, and confirmation.
- Display the exact offer version, date, price, deposit, terms, and expiry.
- Let the backend recheck availability and enforce overlap constraints.
- Never treat a local calendar calculation as authoritative.

### Membership and digital card

- Keep identity and membership status separate.
- Display only approved card fields.
- Use the backend-issued signed or rotating credential.
- Refresh when card version or status changes.
- Remove protected eligibility for expired or suspended members.
- Keep claim errors privacy-safe and route ambiguous claims to staff review.
- Do not expose membership identifiers through widgets, notifications, logs, or Spotlight without approval.

### Notifications

- Request notification permission in context, not automatically at first launch.
- Explain the user benefit first.
- Keep lock-screen content privacy-safe.
- Register and revoke device tokens through approved API endpoints.
- Treat notification payloads and deep links as untrusted input.

## Universal links

When the website domain is final, support event links such as:

```text
https://club-domain.example/whats-on/{slug}
```

Requirements:

- Add the Associated Domains entitlement for approved hosts.
- Publish and validate the `apple-app-site-association` file.
- Route using the slug, then fetch current API detail.
- Reject malformed or unsupported paths safely.
- Preserve a useful website fallback when the app is not installed.
- Test fresh launch, background, foreground, logged-out, not-found, and offline states.
- Do not put secrets or personal data in URLs.

Do not claim universal-link support until association works on physical devices outside Xcode.

## Privacy and security

- Use fictional `example.test` identities and demonstration transactions.
- Never include real records in source, fixtures, screenshots, previews, TestFlight notes, or logs.
- Minimise data collection and retention.
- Do not add tracking, analytics, advertising, attribution, or crash SDKs without review.
- Keep App Store privacy disclosures synchronized with actual SDK and API behaviour.
- Include required privacy manifests and purpose strings for accessed APIs and protected resources.
- Validate API URLs, universal links, QR data, notifications, cached JSON, and images as untrusted input.
- Do not disable ATS or certificate validation.
- Use Data Protection classes appropriate to cached sensitivity.
- Exclude sensitive caches from device backup where required.
- Hide sensitive app-switcher snapshots only when the future feature warrants it.
- Avoid placing private data on the general pasteboard.
- Define retention and deletion behaviour before storing member or transaction data.
- Do not expose stack traces, internal messages, or request bodies to users.

Consider App Attest or DeviceCheck only after defining the threat being addressed. Device integrity signals supplement server authorization; they do not replace it.

## Testing strategy

Tests must be deterministic, isolated, and independent of execution order or a developer's database.

### Unit tests with Swift Testing

Cover:

- DTO decoding and domain mapping
- Required-field and malformed-response rejection
- ISO 8601 timestamps with and without fractional seconds
- GMT/BST transitions and date intervals
- Loading, content, empty, stale, failure, and not-found state transitions
- Error-body mapping and request identifiers
- Cancellation and retry decisions
- Cache expiry and fallback behaviour
- Future status transitions, money formatting, eligibility, and idempotency keys

Inject a clock, calendar, locale, timezone, UUID generator, and API client where deterministic output depends on them.

### API integration tests

Use a custom `URLProtocol` stub or local mock server to verify:

- Correct base URL, versioned path, method, headers, and encoded slug
- Successful event list and detail decoding
- Empty list
- Missing fields, invalid dates, and malformed JSON
- HTTP `404`, `401`, `403`, `429`, and `5xx`
- Offline, timeout, cancellation, and connection loss
- Retry limits and `Retry-After` handling
- Redaction of sensitive values
- Cache revalidation where implemented

Keep JSON fixtures synchronized with OpenAPI. Add CI contract checks so incompatible API changes fail before app distribution.

### View tests

Test each feature state using injected models:

- Initial loading
- Loaded event cards
- Empty programme
- Retryable error
- Cached stale content
- Event detail
- Event not found
- Artwork failure and fallback

Use previews only as a development aid; previews are not tests.

### UI tests with XCTest

Automate critical workflows:

1. Launch into the event listing.
2. Wait for deterministic stub data.
3. Open an event.
4. Verify title, venue, date, and detail content.
5. Navigate back.
6. Exercise empty, failure, retry, and not-found launch scenarios.
7. Open a universal link into event detail.

Provide launch arguments or environment variables that select an in-process deterministic test server. Do not run routine UI tests against a mutable shared environment.

### Accessibility tests

- Run Xcode accessibility audits on representative screens.
- Exercise VoiceOver manually on a physical device.
- Test every Dynamic Type size, including accessibility categories.
- Test Bold Text, Button Shapes, Increase Contrast, Differentiate Without Color, Reduce Motion, and Reduce Transparency.
- Test Full Keyboard Access and Switch Control for critical journeys.
- Confirm landscape and iPad multitasking reflow.

### Performance tests

Measure:

- Cold launch and first useful content
- Event-list scrolling
- Image decode and memory use
- Large response decoding
- Cache read/write
- Repeated navigation and refresh for leaks

Use Instruments for memory, networking, hangs, and energy. Establish measured budgets rather than optimizing from intuition.

## Continuous integration

Use a pinned Xcode version and a clean macOS runner. CI should:

1. Resolve Swift packages from the committed resolution file.
2. Reject uncommitted generated contract changes.
3. Build Debug and Release configurations.
4. Run SwiftFormat/SwiftLint only if adopted and configured consistently.
5. Run Swift Testing unit and API integration tests.
6. Run XCTest UI tests on representative iPhone and iPad simulators.
7. Run contract compatibility checks against OpenAPI.
8. Archive with release signing settings in protected CI.
9. Export or upload only from approved branches/tags.
10. Retain test and archive evidence without secrets or real personal data.

Treat warnings seriously and enable suitable compiler diagnostics. Do not weaken concurrency checking, tests, or signing simply to make CI green.

## Signing and capabilities

- Use the organisation's Apple Developer account, not a developer's personal long-term ownership.
- Assign minimum App Store Connect roles.
- Register an explicit bundle identifier.
- Prefer automatic signing for ordinary development if governance permits, but control distribution certificates and profiles through approved accounts.
- Keep certificates, private keys, API keys, and provisioning assets out of source control.
- Enable only required capabilities.
- Review entitlements in the archived Release build.
- Establish certificate and account recovery ownership before handoff.

Do not enable Push Notifications, Associated Domains, Keychain Sharing, App Groups, Background Modes, camera, or location access until a real feature requires them.

## TestFlight and App Store preparation

For internal demonstrations, use a development/ad hoc distribution method appropriate to the device list or TestFlight. Apple states that beta software intended for public distribution belongs in TestFlight rather than as a beta on the App Store.

Before TestFlight:

- Create the App Store Connect record and correct bundle ID.
- Provide an accurate beta description, feedback email, and review information.
- Clearly identify simulated payments and fictional data.
- Supply a working demo account only when authentication exists, with no real data.
- Explain any non-obvious feature and backend dependency to review.
- Verify the hosted API remains available during review.
- Include privacy policy and support URLs on controlled HTTPS domains.

Before App Review:

- Read the current App Review Guidelines in full.
- Ensure app name, subtitle, screenshots, description, privacy labels, and age rating match actual behaviour.
- Do not include hidden, dormant, or undocumented features.
- Remove placeholders and broken links.
- Ensure reviewer credentials and instructions work.
- Confirm the app provides lasting utility beyond a thin unadapted website wrapper.
- Verify account deletion requirements when account creation is introduced.
- Confirm payment implementation follows current rules for real-world services.
- Complete export-compliance and encryption declarations accurately.

TestFlight and App Store submissions must never expose local development credentials or point to an unavailable local API.

## Observability and diagnostics

Use unified logging with privacy annotations. Log safe categories such as operation, result class, duration, HTTP status, and request identifier. Never log tokens, passwords, cookies, database URLs, full membership numbers, QR payloads, payment details, or complete personal records.

An internal diagnostics screen may show:

- App version and build number
- Build configuration
- Selected API host without credentials
- API reachability
- Last successful refresh
- Cache age

Hide internal diagnostics from production users unless explicitly approved. Do not include secret controls or a demo-reset function in the app.

## Implementation order

Follow complete vertical slices:

1. Xcode project, build configurations, CI, and safe API health check
2. API client, error model, DTO mapping, and contract tests
3. Shared native design tokens and app navigation
4. Public club content and settings
5. Public event listing and event details
6. Universal links after domains are controlled
7. Customer authentication after the backend contract exists
8. Ticket holds and simulated checkout
9. Orders, ticket display, and QR presentation
10. Staff validation only if included in the approved iOS product
11. Room enquiry, offer, and simulated deposit
12. Membership claim and digital card
13. Notifications, caching refinements, accessibility, security, and release hardening

For each slice:

1. Confirm journey and acceptance criteria.
2. Confirm the backend endpoint and OpenAPI contract exist.
3. Add or update DTO and domain mapping.
4. Implement state and business rules.
5. Build accessible UI for every state.
6. Add unit, integration, and UI tests.
7. Exercise the shared staging environment with deterministic fictional data.
8. Add privacy-safe diagnostics and recovery.
9. Update documentation and release notes.

Do not create disconnected static screens for future features.

## Definition of done for an iOS feature

An iOS feature is complete only when:

- It uses the shared API and shared backend records.
- Its endpoint and model contract are approved and tested.
- Loading, empty, success, failure, and applicable offline states work.
- Server authorization protects every sensitive action.
- Dates, money, and status values are presented consistently with other clients.
- VoiceOver, Dynamic Type, keyboard, contrast, and reduced-motion behaviour are tested.
- Unit, API integration, UI, and relevant staging end-to-end tests pass.
- Logs and diagnostics contain no secrets or inappropriate personal data.
- Debug and Release builds compile with the pinned Xcode version.
- Environment configuration, privacy declarations, and documentation are current.
- The journey has been exercised with fictional deterministic fixtures.
- No non-functional or out-of-scope controls remain.

## Decisions required before full development

Agree these before committing the complete architecture:

- Monorepo versus separate iOS repository
- Product owner and Apple Developer account owner
- App name, bundle identifier, team, and signing custody
- Minimum iOS/iPadOS and supported devices
- iPhone-only versus adaptive iPad experience
- Deployment API domains and environment selection
- Device-timezone versus fixed club-timezone event display
- Authentication protocol and session/token model
- Which customer and staff functions belong in iOS
- Universal-link domains
- Offline and cache requirements
- Push-notification provider and content policy
- Analytics, crash reporting, consent, retention, and privacy disclosures
- TestFlight-only demonstration versus App Store distribution
- Support, privacy-policy, account-deletion, and incident-response ownership

Until those decisions and backend contracts exist, build only the public read-only foundation and event experience. Do not invent future server behaviour.

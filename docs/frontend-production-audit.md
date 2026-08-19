# Frontend production audit and backend comparison guide

Audit date: 2026-08-19
Audited revision: the current working tree on branch `work`

## Executive result

The frontend has a sound Angular/Firebase integration core and implemented child and parent screens, but it is **not production-ready as a complete product**. Child and parent journeys depend on an unpublished backend contract; mentor, observer, and all administrator features except quarters are explicit unavailable pages; quarters is a contract-blocked explanation rather than a workflow. The most important release gate is to compare an authoritative OpenAPI document and a seeded non-production backend against the contract inventory below.

No backend source, OpenAPI file, generated API client, contract fixtures, emulator seed, or authenticated end-to-end identity is checked into this repository. Therefore this audit records what the frontend actually sends and reads; it does not claim those contracts exist on the deployed backend.

### Risk summary

| Priority | Finding | Release consequence | Required owner/action |
| --- | --- | --- | --- |
| **P0** | There is no machine-readable backend contract or contract test. TypeScript interfaces disappear at runtime, so a malformed successful payload can reach a template. | A deployed API can silently drift and break or expose a journey. | Backend: publish versioned OpenAPI. Frontend: generate or validate DTOs and add schema/consumer tests. |
| **P0** | No deterministic Firebase/backend seed or authenticated Playwright state exists. E2E only verifies public pages and redirects. | Authorization and successful mutations are unverified. | Backend/QA: provide non-production identities for every role and suspended/unrelated-resource cases. |
| **P0** | Mentor, observer, and 11 of 12 admin destinations are unavailable; quarters makes no API request. | These roles cannot perform their advertised work. | Product/backend: publish contracts; frontend: implement only after contract approval. |
| **P1** | Parent mutations do not send idempotency keys or resource versions. | Retries can duplicate observations, completions, or requests; concurrent edits can overwrite. | Agree idempotency and optimistic-concurrency semantics, then implement both sides. |
| **P1** | The reading UI validates a selected file but submits text only; it never calls the backend-provided upload target. Project APIs expose detail/update/milestones/stages but the screen only lists and creates. | Media reflection and most project lifecycle behavior are incomplete. | Finalize upload and project command contracts and complete the UI. |
| **P1** | Child project, More/points, and most parent cursor resources do not expose complete pagination. | Records beyond the first response can be inaccessible. | Standardize `nextCursor`/`hasMore`, then add tested load-more behavior. |
| **P1** | App Check has an empty site key and is not initialized; development declares emulator use but application bootstrap does not connect Auth to the emulator. | Abuse protection and a reproducible local auth environment are absent. | Configure App Check per environment and explicitly connect emulator services in development. |
| **P1** | No lockfile is committed, and `npm audit` cannot run without one. | Installs and dependency-vulnerability results are not reproducible. | Commit the intended npm lockfile and run CI audit/update policy. |
| **P2** | API error mapping has explicit fallback text for only HTTP 500, not all 5xx, and success DTOs are trusted without validation. | Some operational failures become generic; contract faults are harder to diagnose. | Map the complete 5xx family, validate responses, retain safe request IDs. |
| **P2** | Unit coverage is concentrated in auth/HTTP and character; most feature components and accessibility behavior have no focused test. | UI regressions are likely outside the covered happy paths. | Add component tests and axe/keyboard checks, then authenticated E2E. |

## Scope and evidence

The review covered every routed component and service under `src/app`, environment and Angular configuration, Firebase/HTTP integration, shared UI and styles, Firestore rules, deployment headers, all unit tests, and Playwright tests. Searches included direct HTTP/Firestore access, browser storage, unsafe HTML, secrets, hardcoded records, TODOs, logging, idempotency, and pagination.

Checks performed:

- `npx eslint 'src/**/*.ts'` — passed.
- `npx tsc -p tsconfig.app.json --noEmit` — passed.
- `npm run lint`, `npm run test -- --browsers=ChromeHeadless`, `npm run build`, and `npm run e2e` — could not start because the container has Node 20.20.2 while Angular 22 requires 22.22.3, 24.15.0, or 26; the project itself correctly declares Node 26.
- `npm audit --omit=dev` — could not run because the repository has no lockfile.

## Architecture, security, and operations audit

### Controls already present

- Routes are lazy and guarded by a backend-derived session and canonical role checks. Firebase roles alone are not treated as the application session.
- The HTTP interceptor attaches a Firebase bearer token only to the configured API origin. The child-token exchange is explicitly anonymous.
- All business requests go through one API client, which normalizes the base URL, unwraps `{ "data": ... }`, maps common errors, preserves a request ID, and parses integer `Retry-After` values.
- Dynamic URL identifiers use `encodeURIComponent`; filters use `HttpParams`; no feature constructs a production hostname.
- No application use of `localStorage`, `sessionStorage`, unsafe HTML bypasses, direct Firestore access, or embedded service-account/private credentials was found. Firebase web keys are public client configuration, not server secrets.
- Firestore rules deny all client reads and writes. Netlify provides SPA fallback, immutable asset caching, and baseline framing/content/referrer/permissions headers.
- The responsive application shell includes role-based navigation, keyboard/focus management, logout, reduced-motion handling, and accessible shared state components.
- Child completion commands use a stable `Idempotency-Key`; character/check-in/project updates carry explicit versions where their interfaces require them. Point and award values are rendered from backend responses rather than calculated by the client.

### Boundaries and follow-up

- Client guards are usability controls, not authorization. The backend must authorize every membership, subject, team, and resource on every request.
- The generic `UnavailablePageComponent` is appropriate for status and 404 routes and honestly blocks missing role workflows. It must not be replaced by fabricated data.
- Production Firebase configuration and the Render API URL are committed configuration. Deployment must verify that the Firebase project, authorized domains, CORS origins, CSP at the hosting layer, and API version all belong to the same approved environment.
- Private check-in, gratitude, character, survey, and reading data are held in component memory and sent to the API. Backend logs, traces, analytics, exports, and error details must never copy those values.
- `console.error` is limited to startup/global error reporting, but production observability still needs a redacted telemetry policy and correlation-ID workflow.

## Reachable feature inventory

| Area | Routes | Frontend state |
| --- | --- | --- |
| Public auth | `/auth/login`, `/auth/create-account`, `/auth/child`, `/auth/forgot-password` | Implemented with Firebase email/password, Google popup, password reset, and backend child-token exchange. |
| Account state | `/account/profile`, role-required, pending, disabled, session-error, unauthorized, 404 | Profile is session-derived and read-only; other pages are intentional status views. |
| Child | today, check-in, gratitude, character, Bible, reading, projects, team, More, survey detail | Implemented against typed handwritten contracts. Reading media and project lifecycle are partial; pagination is inconsistent. |
| Parent | children/detail, character, observations, family, academic support, reports | Implemented against typed handwritten contracts. Mutations lack idempotency/version protection. |
| Mentor | teams/detail, projects, reading, encouragement | Explicitly unavailable; no requests are sent. |
| Observer | observations | Explicitly unavailable; no requests are sent. |
| Admin | quarters | Contract-blocked informational page; no requests are sent. |
| Admin | users, teams, character, activities, Bible, family, books, surveys, points, reports, audit | Explicitly unavailable; no requests are sent. |

## Exact frontend-to-backend contract inventory

Every path is relative to `environment.apiUrl`. Unless marked anonymous, requests require `Authorization: Bearer <Firebase ID token>`. Every successful business response is expected as `{ "data": T }`.

### Authentication

| Method and path | Request / response used by frontend | Comparison notes |
| --- | --- | --- |
| `POST /auth/child-token` | Anonymous body `{ familyCode, handle, pin }`; response `{ data: { customToken } }`. | Must be enumeration-safe and rate-limited; 429 should include integer `Retry-After`. Never log inputs/token. |
| `GET /auth/session` | `SessionData`: `uid`, optional `email`, `displayName`, canonical `roles[]`, `disabled`, `onboardingStatus`, `memberships[]`, and `claimSynchronization { status, tokenRefreshRequired }`. | Called again after forced Firebase token refresh when requested. Backend session remains authoritative. All fields need explicit required/nullability rules. |

Account creation, email/password sign-in, Google sign-in, reset email, profile display-name update during signup, and logout use Firebase directly. There is no backend profile-edit endpoint.

### Child

| Method and path | Request / response shape consumed | Required comparison |
| --- | --- | --- |
| `GET /child/today` | `TodaySummary`: optional quarter (`id`, `name`, `localDate`, `timezone`, `week`, `totalWeeks`), six activity statuses, own contribution, team name/composite/target/percent, `calculatedAt`. | Verify server timezone/week and all numbers are authoritative; team DTO must contain no other-child data. |
| `GET /child/check-ins/today` | Status, `version`, optional `feelings`, `mind`, `privateNote`, `locksOnCompletion`. | Signed-in child only; completed records immutable. |
| `PUT /child/check-ins/today/draft` | `{ feelings, mind, privateNote?, version }` → check-in. | Define stale-version 409 and local-date semantics. |
| `POST /child/check-ins/today/complete` | Same body plus `Idempotency-Key` → check-in. | Atomic completion/locking and replay required. |
| `GET /child/gratitude?cursor=` | `CursorPage<GratitudeEntry>` with `items`, optional `nextCursor`, `hasMore`, `timezone`, optional `calculatedAt`. | Cursor must be opaque/stable; signed-in child only. UI supports load more. |
| `POST /child/gratitude` | `{ text }` plus idempotency key → entry (`id`, `localDate`, `text`, draft/completed status). | Enforce server-local-date uniqueness and safe limits. |
| `GET /child/character` | Cycle `id`, status, qualities, saved responses, `version`. | Quality list/order is server-configured. |
| `PUT /child/character/draft` | `{ responses[{qualityId,rating,reflection?}], version }` → cycle. | Ratings are integers 0–10; define partial-draft rules and 409. |
| `POST /child/character/complete` | Same body plus idempotency key → completed status, optional participation award, `calculatedAt`. | Award must be independent of rating value and atomically issued. |
| `GET /child/bible` and `GET /child/bible/{id}` | Discriminated activities: reading, reflection, memory verse, true/false, or multiple choice. | Define list envelope consistently and availability/status rules. |
| `POST /child/bible/{id}/responses` | `{ response: string|boolean, final }` plus idempotency key → status, optional safe learning feedback/participation award. | Participation cannot depend on correctness. Do not leak answer keys in list/detail. |
| `GET /child/reading` and `GET /child/reading/{id}` | Book/assignments/responses and optional media policy (`allowedMimeTypes`, `maximumBytes`, `uploadTargetEndpoint`, `captionsRequired`). | Upload endpoint origin/auth/expiry and opaque accepted-media flow must be specified. Current UI does not upload. |
| `POST /child/reading/{id}/responses` | `{ text?, media?, transcript? }` plus idempotency key → response. | Backend must validate ownership and consume accepted media atomically. |
| `GET /child/projects`, `POST /child/projects` | Cursor page; create `{ title, idea }` plus idempotency key → project. | Current screen lists/creates only and does not paginate. |
| `GET /child/projects/{id}`, `PATCH /child/projects/{id}` | Project detail; partial title/idea/goal/plan/reflection plus `version`. | APIs exist in client but are not reached by current UI. Define patch and 409 semantics. |
| `POST /child/projects/{id}/milestones` | `{ title, version }` plus idempotency key → project. | Client method exists but no current control. |
| `POST /child/projects/{id}/updates` | `{ stage, version, milestoneId? }` plus idempotency key → project. | Enforce legal state transitions and mentor ownership. No current control. |
| `GET /child/team` | Team label/quarter, composite points/target/percent, own contribution, `calculatedAt`. | Strict allow-list; never return roster or another child's contribution. |
| `GET /child/special-activities`; `POST /child/special-activities/{id}/complete` | Activity list; empty body plus idempotency key → activity. | Server enforces eligibility/window and awards. |
| `GET /child/surveys`; `GET /child/surveys/{id}` | Summaries; detail with privacy notice, typed questions, and draft support. | Include stable question IDs, status, notice version, eligibility/window. |
| `POST /child/surveys/{id}/responses` | `{ answers[{questionId,value}], final }` plus stable idempotency key → survey. | Backend validates required/type rules and locks final submissions. |
| `GET /child/points?cursor=`; `GET /child/awards` | Point ledger cursor page; awards `{ items, calculatedAt }`. | Backend owns ledger/eligibility. Current More screen does not paginate points. |

### Parent

| Method and path | Request / response shape consumed | Required comparison |
| --- | --- | --- |
| `GET /parent/dashboard` | Children plus optional `calculatedAt`. | Client method exists but current routes use children endpoint instead. Decide whether to retain. |
| `GET /parent/children?search=&status=&cursor=` | Cursor page of linked children. | Search/status must be server-side; cursor opaque. UI supports load more. Publish allowed status values instead of free-form `string`. |
| `GET /parent/children/{childId}` | Linked child summary. | Return 404 for absent and 403 (or policy-standard 404) for unrelated IDs. Exclude private child content. |
| `GET /parent/character?childId=`; `PATCH /parent/character` | Cycle; update `{ childId, qualityIds }`. | Add version/ETag and idempotency decision. Parent selects configured qualities but must not receive child ratings/reflections. |
| `GET /parent/observations?childId=&cursor=`; `POST /parent/observations` | Cursor history; create `{ childId, summary }`. | Add idempotency and safeguarding/moderation/status rules. Current UI does not paginate. |
| `GET /parent/family/activities?childId=`; `POST /parent/family/activities/{id}/completions` | Cursor page; completion `{ childId }`. | Add idempotency, version/window rules. Current UI does not paginate. |
| `GET /parent/academic-support/configuration` | `{ categories[{id,label}] }`. | Categories must be backend-configured and safe to display. |
| `GET /parent/academic-support/requests?cursor=`; `POST /parent/academic-support/requests` | Cursor history; create `{ childId, categoryId, summary }`. | Add idempotency, closure permissions, safeguarding destination, retention. Current UI does not paginate. |
| `GET /parent/reports?childId=&cursor=` | Cursor page of report metadata. | Define report detail/download endpoint, expiry, authorization, redaction, and generation status. Current UI does not paginate or download. |

### Contracts required before unavailable routes can be implemented

| Area | Minimum backend resources to publish |
| --- | --- |
| Mentor | Assigned teams/detail and quarter summaries; project and reading review queues/detail; versioned feedback/transition commands; encouragement recipient capabilities, moderation, and idempotent send. |
| Observer | Authorized subject capabilities; observation list/create; safeguarding workflow; strict privacy DTO. |
| Admin quarters | List/detail/create/update/lifecycle transitions; timezone/week calculation; current-quarter invariant; filtering/cursor; capability model; optimistic concurrency. |
| Admin users/teams | User and membership lifecycle; role/status changes; link and assignment commands; team target/quarter scope; audit/version conflicts. |
| Admin content | Character, activity, Bible, family, book, and survey catalogues with draft/publish/retire state machines and immutable-response constraints. |
| Admin points/reports/audit | Immutable ledger query and reasoned adjustment; asynchronous reports/authorized expiring exports; cursor audit events with redaction and retention. |

## How to compare a backend implementation

Use this as a release runbook. Record evidence in a table with columns: frontend method, OpenAPI operation ID, implemented route, auth policy, request schema, success schema, error schemas, idempotency, concurrency, privacy test, integration test, and result (`match`, `intentional migration`, `missing`, `unsafe`). Do not mark a row complete from controller names alone.

### 1. Obtain authoritative artifacts

1. Export the exact deployed-version OpenAPI JSON and record its commit/image identifier.
2. Obtain database migration level, Firebase project/environment ID, CORS allow-list, emulator/seed instructions, and safe role test identities.
3. Confirm the API base includes `/api/v1`, and compare every method/path above mechanically. Any path change requires a coordinated frontend migration, not a silent compatibility assumption.
4. Generate a client or JSON-schema validators from OpenAPI. Fail CI when the export differs from the reviewed artifact.

### 2. Compare schemas field by field

For each row above, verify exact casing, required versus optional versus nullable fields, enums, numeric bounds, date/time format and timezone, cursor shape, and the `{ data: ... }` envelope. Specifically test rating `0` (not falsy/missing), boolean `false`, empty result sets, absent optional quarter/book, large totals, expired windows, revoked awards, and unknown enum values.

The frontend currently expects cursor pages shaped as `items`, `nextCursor?`, and `hasMore` (with child private-history pages also carrying timezone). Do not substitute page/pageSize/total without changing the client. Never serialize persistence entities directly.

### 3. Compare authentication and authorization

1. Verify `POST /auth/child-token` is the only anonymous application API call and that all failures are indistinguishable.
2. Verify bearer issuer, audience, expiry, revocation, disabled membership, and claim/session synchronization behavior.
3. Exercise every resource with: correct role and relationship, correct role but unrelated opaque ID, wrong role, suspended membership, deleted membership, missing token, expired token, and revoked token.
4. Confirm multi-role routing does not imply cross-role backend permission. Backend policy evaluates the requested operation and resource relationship.

### 4. Compare mutation behavior

For every POST/PUT/PATCH, record validation limits, state preconditions, audit event, and transaction boundary. For commands with `Idempotency-Key`, prove:

- identical replay returns the original status/body without a second side effect;
- same key with a different normalized payload returns `409 business_conflict`;
- key scope includes authenticated subject and operation;
- network/5xx retry uses the same key.

For versioned operations, run two writers from the same version and prove the loser receives 409 without private record contents in the error. Resolve the P1 parent mutation gap before production retry behavior is enabled.

### 5. Compare errors and operations

All failures should use `{ "code", "message", "details", "requestId" }`; validation details use stable field keys and never echo private values. Verify 401, 403, 404, 409, 422, 429 (integer `Retry-After`), and every 5xx family. Confirm `X-Request-Id`/`X-Request-ID` agrees with the body and can locate redacted server telemetry. Test request limits, timeouts, CORS preflight, rate limits, health/readiness, database rollback, and graceful dependency failure.

### 6. Prove privacy and points invariants

Create recursive allow-list tests for team, parent, mentor, observer, notification, report, export, survey-result, and audit DTOs. Fail if keys **or fixture values** reveal feelings, mind, private notes, gratitude text, character ratings/reflections, Bible/survey answers, grades/school data, private media references/URLs, or another child's contribution. Privileged access audit records must contain metadata, not copied content.

Prove that ratings 0 and 10 receive identical participation credit, Bible correctness cannot change participation points, the client cannot set ledger amounts, adjustments require authorization/reason/idempotency, and award issuance/revocation is backend-owned and auditable.

### 7. Integration and release gate

Run the supported Node 26 frontend against a seeded, disposable backend. Add authenticated Playwright coverage for every implemented happy path, empty/loading/error state, duplicate submission, stale version, throttling, unrelated ID, and logout/revocation. Run keyboard and automated accessibility checks at desktop and mobile widths. A release passes only when:

- every implemented contract row is `match` or has an approved coordinated migration;
- every unavailable advertised role workflow is either implemented or removed from the release scope/navigation;
- P0 findings are closed and P1 findings have explicit accepted owners/dates;
- lint, unit, build, dependency audit, schema/consumer, backend authorization/privacy, and authenticated E2E checks pass in CI;
- production smoke tests use non-private synthetic records and confirm correlation IDs without targeting real child data.

## Recommended implementation order

1. Publish OpenAPI, commit a lockfile, add schema drift CI, and provide seeded role identities.
2. Close authorization/privacy/idempotency tests for the already reachable child and parent APIs.
3. Finish reading media, project lifecycle, pagination, parent concurrency, and report access.
4. Configure App Check and a reproducible emulator bootstrap; expand component/accessibility/E2E coverage.
5. Implement mentor and observer contracts, then administrator quarters and remaining admin surfaces in product-priority order.

The detailed security expectations for child-token exchange, child privacy, media, mutations, and points remain in [the backend feature guide](backend-feature-guide.md). This document is the authoritative current frontend inventory; older gap descriptions should not be used as a route-status source.

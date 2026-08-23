# Backend implementation guide for authentication and child journeys

This document is the hand-off contract for the frontend authentication update. The backend remains the authority for identity-to-program membership, authorization, privacy, workflow state, and points. Publish the implemented contract as OpenAPI and regenerate shared fixtures before enabling production traffic.

## Child credential exchange

Implement `POST /auth/child-token` as an **anonymous** endpoint. Accept:

```json
{ "familyCode": "string", "handle": "string", "pin": "string" }
```

On success return HTTP 200 with `{ "data": { "customToken": "firebase-custom-token" } }`. The token must be short lived, single-purpose, created with the Firebase Admin SDK, and identify one active child membership. The frontend immediately exchanges it with Firebase and then calls the existing authenticated `GET /auth/session` endpoint.

### Security requirements

- Normalize family codes and handles consistently, but never log the raw family code, handle, PIN, custom token, or Firebase ID token.
- Store PINs only as a slow, salted password hash. Use constant-time verification and make every credential failure return the same status and body.
- Rate-limit by a privacy-preserving combination of IP/network, family, and account. Return HTTP 429 with an integer `Retry-After` header. Do not reveal which input matched.
- Return HTTP 401 for every invalid, expired, suspended, unapproved, or unlinked credential combination. A safe body is `{ "code": "authentication_required", "message": "Sign-in failed", "requestId": "..." }`.
- Reject disabled users and suspended/deleted memberships both during token exchange and on every authenticated request. Revoking refresh tokens is required when membership access is removed.
- Allow only the configured frontend origins, enforce request-size limits, and attach a non-sensitive correlation ID to response headers and bodies.
- Add Firebase App Check enforcement after local/emulator clients have been configured.

## Password reset

Password-reset email submission is performed directly by the Firebase client SDK. Configure authorized domains, the email template, and an HTTPS continue URL in Firebase Console. Keep email-enumeration protection enabled. No custom password-reset endpoint is expected.

## Session and onboarding contract

`GET /auth/session` must return canonical roles, membership states, `disabled`, and one of `complete`, `profile_required`, `role_required`, or `pending_approval` for `onboardingStatus`. Add authenticated, versioned endpoints for:

| Workflow                       | Recommended endpoint              |
| ------------------------------ | --------------------------------- |
| Profile completion             | `PUT /me/profile`                 |
| Current consent text/version   | `GET /consents/current`           |
| Consent acceptance             | `POST /me/consents`               |
| Parent-child link request      | `POST /parent/link-requests`      |
| Link approval/rejection        | `PATCH /admin/link-requests/{id}` |
| Role/membership administration | `PATCH /admin/memberships/{id}`   |

Every mutation should accept an `Idempotency-Key`; updates should also require an ETag or explicit version and return HTTP 409 for stale/conflicting state. Role assignment, approvals, suspension, reactivation, link changes, and consent acceptance require immutable audit events.

## Child data and privacy contract

Use opaque IDs and authorize the subject/resource relationship on every request. Recommended resources are:

- `GET /child/dashboard` for quarter/week, individual contribution, composite team progress, activity status, and `calculatedAt`.
- `PUT /child/check-ins/{date}` and `GET /child/check-ins` for the signed-in child's private heart/mind data.
- `PUT /child/gratitude/{date}` and `GET /child/gratitude` for submission and paginated history.
- `GET /child/character/cycle` and `POST /child/character/reflections` for active qualities and one atomic, idempotent set of nullable-to-explicit ratings.
- `GET /child/bible/activities` and `POST /child/bible/submissions`; award participation independently of correctness.
- `GET /child/reading/current` and `POST /child/reading/reflections`. Use signed upload URLs and content-type/size scanning for audio and video rather than accepting blobs in JSON.
- `GET /child/project` and versioned commands under `/child/project/commands` for idea through completion and mentor guidance.
- `GET /child/team` returning **only** composite progress and the signed-in child's own contribution.
- `GET /child/special-activities`, `POST /child/special-activities/{id}/submissions`, `GET /child/surveys`, and survey submission endpoints.
- `GET /child/points` and `GET /child/recognition`; return immutable backend-calculated ledger entries and awards.

Team, mentor, parent, report, export, and notification payloads must exclude emotions, check-in notes, gratitude text, character ratings, grades, school data, other children's answers, and storage URLs for private media. Use allow-listed response DTOs rather than serializing persistence models.

## Errors and operational behavior

Use the common envelope `{ "code", "message", "details", "requestId" }`. Support 401, 403, 404, 409, 422, 429, and 5xx consistently. Validation `details` should identify stable field keys without echoing submitted private values. Paginated resources should return `items`, `page`, `pageSize`, and `total`. Dashboard and points responses must include an authoritative server calculation timestamp.

## Verification checklist

1. Seed Firebase Auth and the database with deterministic child, parent, mentor, observer, admin, and suspended memberships.
2. Test valid exchange, indistinguishable invalid inputs, throttling plus `Retry-After`, suspended access, token revocation, and concurrent duplicate requests.
3. Run authorization tests using unrelated opaque child/team IDs for every role.
4. Snapshot public/team/report DTOs and fail tests if private field names or values appear.
5. Verify idempotency replay returns the original result and conflicting payload reuse is rejected.
6. Verify ratings 0 and 10 receive identical completion credit and Bible correctness never changes participation points.
7. Export OpenAPI plus emulator seed instructions so frontend unit and Playwright tests can consume the real contract.

## Administration API implementation guide

The administration screens are intentionally thin clients: the API decides scope, permitted commands, lifecycle transitions,
points, and export contents. Implement the following contract before enabling each capability in a production role.

### Collection and command contract

- Provide `GET /admin/{resource}` for `character-cycles`, `family-activities`, `books`, `special-activities`,
  `surveys`, `point-rules`, `observations`, `incidents`, and `audit`. Accept `page`, `pageSize`, an allow-listed `status`,
  an allow-listed `sort`, and a normalized `search` string of at most 120 characters. Return
  `{ "data": { "items": [], "page": 1, "pageSize": 25, "total": 0 } }`.
- Each item must contain an opaque `id`, safe `label` and optional `secondary`, `status`, integer `version`, optional
  `updatedAt`, and server-derived `allowedActions`. Never let the client infer authorization from status.
- Provide `POST /admin/{resource}/{id}/commands/{command}` for transitions. Require both an `If-Match` ETag and a
  persisted `Idempotency-Key`. Atomically compare the version, apply the transition, increment the version, write an audit
  event, and store the response for identical replay. Return `409 business_conflict` for stale versions or key reuse with a
  different request fingerprint.
- Add resource-specific create, update, placement, enrollment, and configuration endpoints only through published OpenAPI.
  Require the same concurrency/idempotency rules; do not overload lifecycle commands with arbitrary partial updates.

### Authorization and privacy

Use deny-by-default capabilities matching the frontend route gates: `admin.*.manage`, `admin.observations.moderate`,
`admin.incidents.manage`, `admin.reports.read`, and super-admin-only audit access. Re-check organization scope from the
authenticated membership on every request; never trust an organization, child, team, or quarter ID merely because it was
returned earlier. Incident bodies, survey responses, observation evidence, audit details, and report artifacts require
separate read capabilities from list metadata. Record privileged reads without copying sensitive content into the log.

Point rules must be versioned server data. Award points transactionally from eligible domain events into an append-only
ledger with a unique source-event key; corrections are compensating entries, never edits or deletes. Reports and exports
must use allow-listed DTOs, short-lived single-use downloads, explicit organization/quarter scope, expiry, and audit events.

### Persistence and verification

Store audit events append-only with actor, capability, organization scope, resource type and opaque ID, action, outcome,
request ID, idempotency key hash, and timestamp. Do not store secrets or before/after snapshots containing private journey
content. Prevent update/delete at the database permission layer and ship retention/integrity monitoring.

Contract tests must cover pagination boundaries, search normalization, every status transition, stale ETags, concurrent and
replayed commands, cross-organization opaque IDs, disabled memberships, capability denial, immutable point/audit records,
redacted exports, incident metadata/body separation, and observation moderation races. Publish these endpoints in OpenAPI and
run `npm run test:contract` in this repository against that document.

## Child journey endpoint matrix

The checked child journey is a frontend implementation against the following required, versioned contract. The backend team should either implement these exact paths or publish an OpenAPI migration before changing them; never silently return a persistence entity where an allow-listed response DTO is expected.

| Frontend resource | Method and path                                                                                                                       | Required backend behavior                                                                                                                                                   |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Today             | `GET /child/today`                                                                                                                    | Return the active quarter/local date/week, activity statuses, own contribution, composite team totals/percent, timezone, and `calculatedAt`.                                |
| Check-in          | `GET /child/check-ins/today`, `PUT /child/check-ins/today/draft`, `POST /child/check-ins/today/complete`                              | Scope to the authenticated child; accept heart/feelings, mind, optional private note, and version; atomically lock completion.                                              |
| Gratitude         | `GET /child/gratitude?cursor=`, `POST /child/gratitude`                                                                               | Return cursor history and enforce one server-local-date entry with idempotent replay.                                                                                       |
| Character         | `GET /child/character`, `PUT /child/character/draft`, `POST /child/character/complete`                                                | Return active configured qualities; validate every quality exactly once and atomically complete against `version`. Ratings never change completion credit.                  |
| Bible             | `GET /child/bible`, `GET /child/bible/{id}`, `POST /child/bible/{id}/responses`                                                       | Support reading, reflection, memory verse, true/false, and multiple choice. Compute participation before/independently from correctness.                                    |
| Reading           | `GET /child/reading`, `GET /child/reading/{id}`, `POST /child/reading/{id}/responses`                                                 | Return quarter book, weekly assignments/history, and media policy. Exchange private uploads through the policy target, scan them, then accept only opaque media references. |
| Projects          | `GET/POST /child/projects`, `GET/PATCH /child/projects/{id}`, `POST .../milestones`, `POST .../updates`                               | Enforce the idea-to-completion state machine, versions, mentor-guidance ownership, milestone transitions, and idempotent commands.                                          |
| Team              | `GET /child/team`                                                                                                                     | Build an allow-listed DTO containing only team label, quarter, composite totals/percent, own contribution, and `calculatedAt`.                                              |
| More              | `GET /child/special-activities`, `POST .../{id}/complete`, `GET /child/surveys`, `GET /child/surveys/{id}`, `POST .../{id}/responses` | Enforce eligibility/window, survey required fields, draft support, privacy notice/version, and idempotency.                                                                 |
| Recognition       | `GET /child/points?cursor=`, `GET /child/awards`                                                                                      | Return an immutable point ledger and backend-issued/revoked awards with an authoritative calculation time; the client must never derive awards.                             |

### Mutation, concurrency, and retry rules

All completion/submission commands require an `Idempotency-Key` scoped to the authenticated subject, route, and normalized payload. Persist the first status/body and replay it for an identical request. Reject reuse with a different payload as `409 business_conflict`. Drafts and project transitions carry a monotonically increasing `version`; reject stale versions with `409` and return no private record snapshot in the error. Use `422 validation_error` with `{ "details": { "fields": { "stableFieldName": "safe message" } } }`, never echoing answers. Clients retry network and 5xx failures using the same key and generate a new key only after success.

### Media implementation

1. Authenticate and authorize the assignment before issuing a short-lived, single-object upload target from the assignment's `uploadTargetEndpoint`.
2. Bind the target to the configured MIME allow-list and maximum byte count; do not trust the browser-provided MIME type.
3. Quarantine and scan the upload. For video, require captions or a transcript when `captionsRequired` is true.
4. Return an opaque `MediaReference` (`id`, detected `mimeType`, `size`) only after acceptance. Never expose bucket names, durable storage URLs, or another child's media.
5. On reflection submission, verify that the reference belongs to the signed-in child and assignment, then consume or attach it transactionally.

### Privacy acceptance tests

Create schema-level allow-list tests for `/child/team` and every parent, mentor, report, notification, survey-result, and export DTO. Recursively fail if a payload includes `feelings`, `mind`, `privateNote`, gratitude `text`, character `rating`/`reflection`, Bible/survey answers, grades, school fields, media references/URLs, or another child's contribution. Test values as well as keys so renamed fields cannot leak fixtures. Verify authorization with an unrelated opaque ID for every endpoint, and retain audit events for privileged reads without copying private content into logs.

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

| Workflow | Recommended endpoint |
| --- | --- |
| Profile completion | `PUT /me/profile` |
| Current consent text/version | `GET /consents/current` |
| Consent acceptance | `POST /me/consents` |
| Parent-child link request | `POST /parent/link-requests` |
| Link approval/rejection | `PATCH /admin/link-requests/{id}` |
| Role/membership administration | `PATCH /admin/memberships/{id}` |

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

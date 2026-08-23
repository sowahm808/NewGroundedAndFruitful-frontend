# Product completion TODO

Last audited: 2026-08-19

Audit result: **53 of 103 items are implemented; 50 remain incomplete or blocked.** This audit also incorporates the dedicated parent workflows and authenticated application shell added since the previous checklist review.

This checklist compares the product described in the repository documentation with the checked-in implementation. A checked item means the user-facing behavior is implemented (not merely routed or visually scaffolded). Explicit unavailable-state routes are therefore intentionally unchecked.

## How to use this checklist

- `[x]` — implemented in the current frontend.
- `[ ]` — missing, incomplete, or blocked on a backend contract.
- Complete contract, security, and test prerequisites before treating a workflow as production-ready.
- When completing an item, add unit coverage plus an authenticated emulator-backed Playwright scenario and remove any placeholder data for that workflow.

## 1. Production prerequisites (release blockers)

- [ ] Obtain and version the backend OpenAPI/schema source, including exact methods, paths, request/response types, authorization scopes, validation errors, pagination, correlation IDs, caching/version conflicts, and idempotency behavior.
- [ ] Confirm the canonical role vocabulary, especially whether `observer` is the permanent backend name for an authorized adult.
- [x] Replace all fabricated child dashboard values and hardcoded production-path content with contract-driven data and explicit loading, empty, stale, partial, error, retry, and offline states.
- [x] Add typed repositories between feature components and `ApiClient`; do not call Firebase or invent endpoint paths in feature components.
- [ ] Initialize and enforce Firebase App Check before production API calls.
- [ ] Implement expired/revoked-session recovery and verify backend revocation behavior.
- [ ] Add an approved telemetry adapter that redacts sensitive values and reports correlation IDs; remove raw exception-message console logging in production.
- [x] Keep direct client Firestore access deny-all until reviewed collection-specific rules exist.
- [x] Keep tokens, claims, roles, child PINs, and private content out of application-managed browser storage.
- [ ] Align local, CI, Netlify, and backend Node versions on one Angular-supported runtime and verify Firebase CLI/deployment-image support.
- [ ] Add a production release gate that prevents placeholder pages and fabricated private data from shipping.

## 2. Application foundation

- [x] Bootstrap an Angular standalone application with lazy-loaded feature routes.
- [x] Provide compile-time development, staging, and production environment configurations.
- [x] Provide a centralized `ApiClient` with GET, POST, PUT, PATCH, and DELETE helpers.
- [x] Normalize common API failures, backend error codes, retry timing, and request IDs.
- [x] Attach the in-memory Firebase ID token only to the configured API origin and support explicitly anonymous API requests.
- [x] Provide typed session, role, journey, activity, reflection, pagination, and load-state models.
- [x] Provide reusable card, button, badge, alert, progress, loading, empty-state, page-header, and stat-card primitives.
- [x] Provide protected role shells and desktop/mobile navigation foundations.
- [x] Provide unauthorized, account-state, session-error, and not-found routes.
- [x] Preserve safe application-local return URLs for unauthenticated protected-route visits.
- [x] Expose logout in every authenticated shell and return the user to sign-in.
- [x] Add a mobile overflow/menu so every role destination remains reachable.
- [x] Make generic detail actions contextual and functional, or remove them until their workflows exist.

## 3. Authentication, account state, and onboarding

- [x] Adult email/password sign-in through Firebase Authentication.
- [x] Adult Google sign-in through Firebase Authentication.
- [x] Adult email/password account creation with display-name update.
- [x] Restore Firebase identity at startup and load the canonical backend session from `/auth/session`.
- [x] Force-refresh the Firebase token once when the backend reports pending claim synchronization.
- [x] Route active users by backend role and distinguish role-required, pending, disabled, session-error, and unauthorized states.
- [x] Enforce role-based route guards as a UX control while documenting that backend authorization remains mandatory.
- [x] Replace the password-reset placeholder with Firebase password-reset submission, confirmation, validation, and success/error states.
- [x] Implement child family-code/handle/PIN exchange against the rate-limited backend, sign in with the returned Firebase custom token, clear the PIN on every outcome, and show safe error messages.
- [x] Add child-login busy state, duplicate-submit prevention, rate-limit feedback, and keyboard/screen-reader-friendly field errors.
- [ ] Implement profile completion and onboarding.
- [ ] Implement consent/privacy review and acceptance.
- [ ] Implement parent-child linking and approval states.
- [ ] Implement administrator role assignment, membership approval, suspension, and reactivation.

## 4. Child journey

- [x] Load the child dashboard summary, current quarter/week, individual contribution, composite team progress, and server calculation timestamp from the backend.
- [x] Implement the complete private daily check-in (feelings/heart and mind) without exposing private answers in team views.
- [x] Implement daily gratitude submission and history.
- [x] Load active character qualities from the backend rather than hardcoding five qualities.
- [x] Replace the character range scaffold with an accessible typed reactive form whose unanswered state is unambiguous.
- [x] Submit all character reflections as one idempotent command and handle validation, conflict, retry, and success states.
- [x] Preserve the points invariant in character copy: completion counts equally for ratings 0 and 10.
- [x] Implement Bible reading, reflection, memory verse, true/false, and multiple-choice activities.
- [x] Ensure Bible correctness never affects participation awards.
- [x] Implement the quarter book and weekly reading reflections, including supported text/audio/video media.
- [x] Implement project idea, goal, guidance, plan, action, progress, reflection, milestone, and completion workflows.
- [x] Implement the child team view using composite progress only; exclude emotions, notes, ratings, grades, and other children’s private data.
- [x] Implement special activities and surveys.
- [x] Implement child point history and recognition/awards display using backend-owned calculations only.

## 5. Parent and family workflows

- [x] Load only backend-linked children and their permitted participation summaries.
- [x] Implement linked-child detail with opaque identifiers and backend relationship authorization.
- [x] Implement positive-observation submission, history, review status, validation, and conflict handling.
- [x] Implement the character cycle view without exposing a child’s private rating values outside the approved scope.
- [x] Implement weekly family activities across Talk, Pray, Serve, Play, and Gratitude.
- [x] Implement academic-support requests for reading, comprehension, and mathematics, including assignment/status history.
- [x] Implement parent reports for permitted participation and growth data.
- [ ] Implement family notifications and actionable status updates.

## 6. Mentor workflows

- [ ] Load only backend-assigned teams with quarter progress and weekly participation summaries.
- [ ] Implement team detail with opaque identifiers and backend assignment authorization.
- [ ] Implement project guidance and milestone feedback.
- [ ] Implement permitted reading-participation status.
- [ ] Implement “may need encouragement” signals and encouragement actions without exposing private child data.
- [ ] Implement mentor notifications and follow-up status.

## 7. Authorized-adult (`observer`) workflows

- [ ] Implement scoped positive-observation submission.
- [ ] Implement permitted observation history and review status.
- [ ] Enforce backend resource scope so observers cannot browse unrelated children or teams.

## 8. Administration

- [ ] Implement searchable, filterable, paginated user CRUD and account-status management.
- [ ] Implement team CRUD, mentor assignment, and child placement.
- [ ] Implement quarter CRUD, activation, enrollment, targets, and program-week configuration.
- [ ] Implement character-quality and cycle configuration.
- [ ] Implement Bible activity configuration.
- [ ] Implement family-activity configuration.
- [ ] Implement book/reading-program configuration.
- [ ] Implement special-activity configuration.
- [ ] Implement survey configuration and results access controls.
- [ ] Implement backend-owned point-rule configuration and immutable point history; never calculate or award privileged points in Angular.
- [ ] Implement observation moderation/approval.
- [ ] Implement scoped administrative reports and exports with privacy controls.
- [ ] Implement incident reporting and restricted incident-management access.
- [ ] Implement immutable audit-log search/detail views.
- [ ] Enforce optimistic concurrency/version handling and idempotency on all mutating administration actions.

## 9. Accessibility, resilience, and UX quality

- [x] Provide semantic headings, labels, visible focus styles, minimum touch-target sizing, a skip link, reduced-motion support, and responsive layout foundations.
- [x] Expose textual values and ARIA metadata on progress bars.
- [ ] Add field-level validation descriptions and an error summary to every form.
- [ ] Announce asynchronous loading, success, validation, and failure outcomes consistently to assistive technology.
- [ ] Add skeleton/loading, empty, stale/partial, retry, and offline-specific states to every data-backed page.
- [ ] Audit meaningful action names so repeated controls do not use ambiguous labels such as “View details.”
- [ ] Manually verify full keyboard operation, screen-reader announcements, zoom/reflow, reduced motion, and color contrast.
- [ ] Verify responsive behavior at supported mobile, tablet, and desktop breakpoints without hiding destinations.

## 10. Automated testing and delivery

- [x] Configure Angular ESLint, strict TypeScript/template checking, Jasmine/Karma, Playwright, and production builds.
- [x] Unit-test progress bounds, character completion semantics, role utilities/guards, authentication bootstrap, interceptor behavior, and production environment safety.
- [x] Cover public authentication headings and unauthenticated protected-route redirects in Playwright.
- [ ] Add a Firebase/backend emulator seed script with deterministic users, roles, memberships, linked children, assigned teams, quarters, and workflow records.
- [ ] Add reusable authenticated Playwright session helpers for child, parent, mentor, observer, admin, and super-admin roles.
- [ ] Add authenticated happy-path, validation, authorization, empty, network-error, conflict, retry, and session-expiry tests for every workflow above.
- [ ] Add automated tests proving unrelated child/team/resource identifiers are rejected by the backend.
- [ ] Add automated privacy tests proving team/report payloads and screens exclude private emotions, notes, ratings, grades, and school information.
- [ ] Add accessibility automation and retain manual assistive-technology checks for release.
- [ ] Make CI use the same supported Node version as local development and deployment.
- [ ] Run lint, unit tests, production build, emulator-backed end-to-end tests, and staging auth/session smoke tests as required promotion gates.

## Audit notes

- [x] Audited the administration checklist against the frontend on 2026-08-23; added missing searchable generic resources,
      restricted observation/incident routes, mutation idempotency, and a backend implementation hand-off. Unchecked feature
      boxes above still require their complete backend contracts and/or resource-specific CRUD workflows and are not claimed
      complete by this audit.

- This audit inspected the route table, feature components, authentication/session boundary, HTTP client and interceptor, domain models, design-system primitives, environment and deployment configuration, Firestore rules, unit tests, and Playwright scenarios. The counts above are derived directly from this checklist.
- The 53 checked items comprise production/application infrastructure (17), authentication/account state (10), the complete child journey (14), parent and family workflows (7), accessibility foundations (2), and test/tooling setup (3). A checked frontend workflow still requires contract and authenticated end-to-end verification before production promotion.
- Routes exist for all major product areas, but unfinished mentor, observer, and administration routes deliberately render an unavailable-state page and do not constitute completed features.
- Child journey routes use typed backend repositories and explicit loading, empty, error, retry, validation, conflict, and success states; no child or team values are fabricated in the frontend.
- The repository contains no backend source, OpenAPI contract, response fixtures, emulator seed, or authenticated end-to-end helper, so backend-dependent features cannot be verified as complete from this frontend alone.
- Password reset and child sign-in have user-facing implementations, but neither has the unit coverage plus authenticated emulator-backed Playwright coverage required by this checklist's completion guidance. This is a test-coverage gap rather than evidence that their checked user-facing behavior is absent.
- Node is not aligned: local/package/Netlify configuration targets Node 26 while CI targets Node 22. The release prerequisite and CI-alignment items therefore remain unchecked.
- The authenticated shell now exposes logout and a role-complete, focus-managed mobile navigation drawer; both application-foundation items are checked.
- Re-audit this file whenever a workflow lands: verify the real data path, resource authorization, privacy constraints, resilient states, accessibility, and automated coverage before changing `[ ]` to `[x]`.

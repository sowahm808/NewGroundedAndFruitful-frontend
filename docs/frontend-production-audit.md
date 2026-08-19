# Frontend production audit

Audit date: 2026-08-19. This is an evidence-based snapshot of the checked-in frontend, not a claim that the product roadmap is complete.

## Existing architecture

- Angular 22 standalone application bootstrapped in `main.ts`; routes lazy-load standalone feature components. Core services own Firebase Authentication, HTTP token attachment, route guards, error normalization, and the application shell.
- Firebase Authentication is initialized before routing. The interceptor requests the current in-memory Firebase ID token for calls under the configured API origin. Firestore rules deny all client reads and writes.
- Development, staging, and production builds select compile-time environment files. Netlify serves the static browser build and redirects application routes to `index.html`.
- Strict TypeScript and template checking, Angular ESLint, Jasmine/Karma, and Playwright are configured.

## Implemented screens

- Adult email/password and Google sign-in, account creation, and a presentational child sign-in form.
- Protected child shell with a dashboard and local character-rating interaction.
- Protected parent, mentor, authorized-adult (`observer` in the current backend vocabulary), and administrator shells.
- Generic route shells exist for reading, projects, family connection, academic support, observations, reports, teams, quarters, activities, surveys, points, and audit.
- Unauthorized and not-found experiences exist. Protected-route return URLs are retained and constrained to application-local paths.

## Incomplete screens and actions

- Most role pages use `FeaturePageComponent`; its search, filters, cards, and buttons are placeholders and perform no API work.
- Child login does not exchange credentials with the backend. It clears the PIN but cannot establish a session.
- The child dashboard contains fabricated names, totals, week/progress values, and completion statuses. Character qualities are hardcoded and submission is not implemented. These paths must not be released as production data views.
- Onboarding, consent, linking, team placement, quarter enrollment, full daily check-in, observation submission/history, family activities, reading reflections, project milestones, academic support, special activities, surveys, awards, incident reporting, notifications, and admin CRUD are not implemented.
- Logout is available in the service but not exposed in the shell. Mobile navigation truncates each role's links to five and offers no overflow menu.
- Current Playwright coverage verifies only public auth headings and unauthenticated redirects. The requested authenticated workflows require emulator seed and session helpers that do not exist.

## Backend integration gaps

No backend source, OpenAPI document, generated client, endpoint inventory, or response fixture is present in this repository, and no Git remote is configured from which to trace one. Existing architecture prose names a base URL but is not a verifiable API contract. Do not infer endpoint paths from page names.

Required contracts before production integration:

1. Authenticated session/bootstrap response (canonical roles, disabled state, permitted resources, onboarding state, navigation capabilities, consent/privacy content) and refresh/expiry semantics.
2. Child custom-token exchange request/response, rate-limit behavior, and safe error codes.
3. Role dashboard summaries, current quarter/week, team target progress, point history, recognition, and server calculation timestamp.
4. Typed commands and validation/conflict schemas for every workflow listed above, including idempotency behavior for submissions.
5. Pagination/search/filter conventions, correlation/request ID header, version/ETag behavior, and the canonical error envelope.

The current `AuthService` derives authorization UX from Firebase custom claims, not the required backend bootstrap. The UI must migrate to the verified bootstrap as the canonical application role/resource source once its contract is supplied. Guards remain UX controls only.

## Accessibility and responsive-design problems

- Foundations are positive: semantic headings, labels, 44px controls, visible focus, skip link, reduced-motion rules, responsive grids, alert/status roles, and text values on progress bars.
- Placeholder buttons lack outcomes; repeated generic “View details” labels lack contextual accessible names. Form validation has no field-level descriptions or error summary.
- The range-based character form does not use a typed reactive form and defaults its visual thumb to 5 while the actual value is unanswered, which can confuse keyboard and screen-reader users.
- The fixed five-item mobile navigation hides required destinations. Zoom, reflow, contrast, screen-reader announcements, and full keyboard workflows have not been independently tested.
- Dashboard loading skeletons, stale/partial states, retry actions, and offline-specific UI are absent.

## Security and privacy risks

- **Release blocker:** fabricated child dashboard/private display data and hardcoded character choices are in production paths.
- **Release blocker:** roles are accepted from Firebase claims without an authenticated backend bootstrap/resource scope.
- Child credential exchange, App Check initialization, expired-session recovery, logout UI, and backend revocation behavior are incomplete.
- Generic routes containing `:childId` and `:teamId` need opaque identifiers and resource-aware backend resolution; guards cannot authorize these resources.
- `GlobalErrorHandler` writes exception messages to the console. A production telemetry adapter must redact sensitive values and use approved correlation IDs before observability is enabled.
- No sensitive data is intentionally written to browser storage and Firestore is deny-all, both of which should remain true.

## Tooling and runtime compatibility

The repository declares Node `>=26 <27`, `.nvmrc` and Netlify request Node 26, but GitHub Actions requests Node 22 without a patch version. The installed Angular CLI reports support for Node `22.22.3`, `24.15.0`, or `26.0.0` and later in those lines. Node 26 is not an LTS release as of this audit date and may not be available on all deployment images. Confirm Netlify/Firebase CLI support, then choose one Angular-supported LTS patch shared with the Node 22 backend if deployment policy permits. Do not change the engine until that decision is made.

Baseline validation in this container was blocked before compilation because it provides Node `20.20.2`. Lint, Karma, build, and Playwright all invoked successfully but Angular CLI refused that runtime; Playwright's dev server therefore could not start.

## Assumptions and implementation decisions

- Existing UI and architecture were preserved. No endpoint was invented and no fake adapter was added.
- The safe supported fixes in this increment are protected-route recovery without an open redirect, a real 404 route, tests for redirect validation, and complete audit/handoff documentation.
- “Authorized adult” remains mapped to the backend's current `observer` role pending confirmation of canonical role names.
- Production readiness requires removal or backend replacement of all fabricated views, contract-driven repositories, and emulator-backed workflow coverage. The present build must be treated as a scaffold, not a production release candidate.

## Search evidence

The audit searched application and e2e sources for mocks/fixtures, hardcoded values, placeholders, TODO/FIXME, subscriptions, manual token access, browser storage, Firestore, `any`, catches, console logging, localhost URLs, roles, points, and leaderboards. Findings above distinguish compile-time environment configuration and correct interceptor token access from unsafe component-level behavior.

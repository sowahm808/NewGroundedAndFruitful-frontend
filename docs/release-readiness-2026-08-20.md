# Frontend release-readiness audit — 2026-08-20

## Decision

**Contract-dependent implementation is stopped.** The repository does not contain either of the two backend-owned inputs required to verify a successful integration:

1. a current, machine-readable backend OpenAPI document identifying its version/revision and deployed operations; and
2. a current backend frontend-integration handoff identifying deployed environments, authorization scopes, capabilities, envelopes, pagination, idempotency, concurrency, error bodies, upload behavior, and deterministic staging/emulator identities.

`backend-feature-guide.md` is a frontend-authored implementation recommendation, not evidence of a published backend contract. `child-journey-integration.md` likewise records proposed frontend paths and explicitly says OpenAPI could not be verified. Handwritten TypeScript interfaces are not a substitute for either missing input. No API-backed success state was added or claimed in this audit.

## Baseline before changes

The checkout ran Node 20.20.2 and npm 11.4.2. The project declared Node 26, while CI selected the moving `22` alias. The following baseline was recorded before editing:

| Command | Exit | Exact result |
| --- | ---: | --- |
| `npm ci` | 1 | No root `package-lock.json` existed, so npm refused a clean install. |
| `npm run lint` | 3 | Angular CLI rejected Node 20.20.2; it requires 22.22.3, 24.15.0, or 26+. |
| `npx tsc -p tsconfig.app.json --noEmit` | 0 | Passed. |
| `npm test` | 3 | Angular CLI rejected Node 20.20.2 before tests started. |
| `npm run build -- --configuration production` | 3 | Angular CLI rejected Node 20.20.2 before compilation started. |
| `npm run e2e` | 1 | Playwright's Angular web server exited 3 because of the unsupported Node runtime. |

The runtime is now pinned consistently to Node 22.22.3 in `.nvmrc`, `package.json`, GitHub Actions, and Netlify. A lockfile and an explicit `typecheck` script make clean installs and CI checks reproducible. The current container still needs Node 22.22.3 before Angular-backed checks can run.

## Route, page, guard, contract, and state matrix

Legend: `[x]` locally implemented; `[~]` partial or contract-unverified; `[ ]` not implemented; `[!]` release blocker. All feature groups use lazy standalone components beneath `AppShellComponent`. `authGuard` initializes the canonical backend session; `roleGuard` applies the route role metadata. “Typed” below means handwritten frontend types only and does **not** mean OpenAPI-validated.

| Routes / navigation | Component | Allowed role / guard | Frontend API operations | UI states and tests | Status |
| --- | --- | --- | --- | --- | --- |
| `/auth/login`, `/auth/create-account`, `/auth/child`, `/auth/forgot-password` | Dedicated auth components | Public (`publicOnlyGuard` where applicable) | Firebase Auth; `POST /auth/child-token`; `GET /auth/session` after sign-in | Busy/error form states; login/auth unit coverage and public E2E | `[~]` backend exchange and staging identities unverified |
| `/account/profile` | `ProfileComponent` | authenticated | canonical session in memory | ready view; guard tests | `[x]` session-derived only |
| `/account/role-required`, `/account/pending`, `/account/disabled`, `/account/session-error`, `/unauthorized`, unknown route | `UnavailablePageComponent` | account-state-specific/public | none | deliberate status or 404 copy | `[x]` intentional non-feature states |
| `/child/today`, `/child/check-in`, `/child/gratitude`, `/child/character`, `/child/bible`, `/child/reading`, `/child/project`, `/child/team`, `/child/more`, `/child/more/surveys/:surveyId` | Dedicated child components | child; `authGuard` + `roleGuard` | `/child/*` inventory in `frontend-production-audit.md` | loading/empty/error and mutation states vary; API/character unit coverage, redirect E2E only | `[!]` handwritten contracts are not backend-verified; reading/project remain partial |
| `/parent/children`, `/parent/children/:childId`, `/parent/character`, `/parent/observations`, `/parent/family`, `/parent/academic-support`, `/parent/reports` | Dedicated parent components | parent; `authGuard` + `roleGuard` | `/parent/*` inventory in `frontend-production-audit.md` | loading/empty/error forms; API/utilities tests, redirect E2E only | `[!]` handwritten contracts are not backend-verified; mutations lack agreed concurrency/idempotency |
| `/mentor/teams`, `/mentor/teams/:id`, `/mentor/projects`, `/mentor/reading`, `/mentor/encouragement` | deliberate unavailable component | mentor; `authGuard` + `roleGuard` | none | unpublished state | `[ ]` backend OpenAPI operations and capabilities missing |
| `/observer/observations` | deliberate unavailable component | observer; `authGuard` + `roleGuard` | none | unpublished state | `[ ]` backend OpenAPI operations and grant selector missing |
| `/admin/quarters` | `AdminQuartersComponent` | admin/super_admin; `authGuard` + `roleGuard` | none | contract-blocked explanation | `[ ]` backend operation unverified |
| `/admin/users`, `/admin/teams`, `/admin/character`, `/admin/activities`, `/admin/bible`, `/admin/family`, `/admin/books`, `/admin/surveys`, `/admin/points`, `/admin/reports`, `/admin/audit` | deliberate unavailable component | admin/super_admin; `authGuard` + `roleGuard` | none | unpublished state | `[ ]` backend OpenAPI operations and capabilities missing |

Navigation currently derives visibility from canonical roles, not server-owned feature capabilities. It therefore advertises unavailable mentor, observer, and admin destinations. A backend capability schema and session field are required before capability-driven hiding/disabling can be implemented without inventing behavior.

## Audit findings

- No generic route factory remains. A shared unavailable component is still intentionally used for unpublished operations and account/HTTP status destinations.
- No direct application Firestore access, private browser-storage persistence, production mock fallback, or feature-level deployed hostname was found.
- The shell already supplies a skip link, responsive drawer/backdrop, Escape handling, focus restoration/trapping behavior, active navigation, profile menu, and logout. Unit coverage exists, but authenticated browser verification at 320 px, 200% zoom, and keyboard-only operation remains blocked by the absent deterministic identities and supported local Node runtime.
- Child and parent screens issue typed calls, but those interfaces and paths cannot be called “validated API types” until generated from or checked against the missing OpenAPI artifact.
- Production uses the required Render API base URL. Development intentionally contains a local emulator URL; staging contains `staging-api.groundedandfruitful.org`, whose existence and CORS policy require the missing backend handoff.

## Feature/release checklist

- `[x]` Product-flow document, routes, auth/session, guards, interceptor, API client, models, shell, design primitives, tests, environments, CI, and Netlify configuration inspected.
- `[x]` Node 22.22.3 pinned across local, package engine, CI, and Netlify.
- `[x]` Reproducible npm lockfile added and production build command made explicit in CI.
- `[x]` Production API URL and Netlify browser publish directory/SPA rewrite/cache/security headers verified from repository configuration.
- `[~]` Dedicated child and parent components exist, but their successful API states are contract-unverified.
- `[~]` Shell/accessibility behaviors have unit coverage but not deterministic authenticated Playwright evidence.
- `[ ]` OpenAPI-generated or runtime-validated API DTOs and drift tests.
- `[ ]` Server-owned feature-capability navigation.
- `[ ]` Mentor, observer, and administration workflows.
- `[ ]` Authenticated role, mutation/error, privacy, responsive, and keyboard Playwright journeys.
- `[!]` Backend OpenAPI and backend integration handoff are missing.
- `[!]` Backend/emulator fixtures and role identities are missing.
- `[!]` Firebase authorized-domain, App Check, staging/production CORS, and staging-host configuration require backend/Firebase-owner evidence.

## Staging, production, and rollback

### Required environment and staging steps

1. Install Node 22.22.3, run `npm ci`, and execute lint, typecheck, unit, production build, and Playwright checks.
2. Obtain the versioned backend OpenAPI and integration handoff. Generate/validate types, reconcile every matrix operation, and keep capabilities disabled until each operation is deployed.
3. Obtain deterministic non-production Firebase identities and backend fixtures for every role, multi-role, pending, disabled, unrelated-resource, empty, conflict, validation, throttle, network, and dependency-failure case.
4. Configure a real staging API/Firebase project, App Check, authorized domains, and CORS for the staging frontend. Never point automated tests at production.
5. Inspect `dist/grounded-fruitful/browser` for obsolete API hosts, unexpected localhost/emulator strings, mock/sample records, secrets, and generic placeholder copy on enabled routes. Verify chunk loading, headers, 320/375/768/1024/1440 px layouts, 200% zoom, reduced motion, and keyboard navigation.
6. Deploy a versioned staging artifact, execute authenticated smoke tests, retain request IDs for failures, and obtain product/privacy/backend approval. Production deployment is outside this task.

### Production promotion and rollback

Promote only the exact staging-tested immutable artifact after all blockers are closed. Record the frontend commit, backend OpenAPI revision, API release, Firebase project, and Netlify deploy ID. Smoke-test session restoration, each role landing page, logout, a safe read, and a non-destructive command replay.

If smoke tests, authorization, privacy, chunk loading, or error rates regress, stop traffic promotion and restore the previous known-good Netlify deploy. Do not “fix” an API mismatch with mock data or a generic success state. If the backend contract is the regression, disable only the server-owned capability and roll back the backend through its separately owned procedure. Re-run the smoke tests and document the incident/request IDs before resuming promotion.


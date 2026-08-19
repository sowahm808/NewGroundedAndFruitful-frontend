# Frontend production gap audit

Updated: 2026-08-19

> **Historical remediation record:** this file describes an earlier audit pass and is retained for change context. It is not the current route or contract inventory. Use the [frontend production audit and backend comparison guide](frontend-production-audit.md) for the authoritative current state.

## Scope and method

The audit reviewed routing and guards, the application shell and design-system primitives, environment configuration, Firebase authentication and bearer-token interception, the central HTTP/error layer, domain models, feature components, unit tests, Playwright coverage, and deployment documentation. Searches covered the former route factory and generic component, highlights and generic actions, sample records/totals/statuses, TODOs, disabled controls, timers, browser storage, mock code, and direct Firestore access.

Baseline `npm run lint`, `npm test`, `npm run build`, and `npm run e2e` could not start under the container's Node 20.20.2: Angular 22 requires Node 22.22.3, 24.15.0, or 26. The direct TypeScript and ESLint checks remain usable.

## Findings and remediation

- The route table sent 29 reachable feature/status routes through one generic page. Its controls had no behavior and its cards invented an `Active` state. The factory and component were removed.
- Parent children, child detail, character, observations, family activities, academic support, and reports now have dedicated lazy standalone components and typed API methods.
- Parent children uses server-side search/status/cursor parameters, validated status values, a 300 ms debounced query, cancellation with `switchMap`, URL query synchronization, honest loading/empty/error states, and accessible contextual links.
- The central API client now provides envelope-unwrapping adapters. Backend errors retain correlation/request IDs.
- Fabricated child-dashboard names, points, week/progress values, activity records, and hardcoded character-quality records were removed.
- Child, mentor, observer, and administrator workflows lacking a published backend contract now deliberately say they are unavailable and never imply that records or working controls exist.
- The existing sidebar, logo treatment, palette, typography, spacing variables, cards, buttons, responsive shell, and design-system components were preserved.

## Integrated contract

The frontend currently calls the following authenticated paths beneath the centralized environment `apiUrl`:

- `GET /parent/dashboard` (typed and available to future dashboard composition)
- `GET /parent/children` and `GET /parent/children/{childId}`
- `GET/PATCH /parent/character`
- `GET/POST /parent/observations`
- `GET /parent/family/activities` and `POST /parent/family/activities/{id}/completions`
- `GET /parent/academic-support/configuration`
- `GET/POST /parent/academic-support/requests`
- `GET /parent/reports`

All calls use the existing Firebase bearer-token interceptor. Components contain no deployed hostnames and no production mock fallback.

## Remaining backend contract gaps

Production readiness still depends on the backend publishing OpenAPI and confirming the exact field names, cursor semantics, status enum/configuration endpoints, linked-child selector payload, idempotency-key behavior, report detail/download contract, support-request closure authorization, safeguarding destination, stale-data timestamps/ETags, and whether the dashboard embeds children or supplements the children endpoint. No frontend claim is made that these unconfirmed contracts are deployed.

The child, mentor, observer, and administrator APIs remain unpublished in this repository. Their routes are intentionally unavailable rather than deceptive. Emulator seed data and authenticated Playwright identities are also not present, so end-to-end success-state tests cannot responsibly fabricate them.

## Release verification checklist

Before enabling production traffic: validate generated clients against backend OpenAPI; run unit and Playwright suites on a supported Node version; add deterministic emulator identities; verify 401/403/404/409/422/429/5xx and request-ID behavior; verify unrelated child IDs are forbidden; inspect the production bundle for sample data and obsolete hostnames; and exercise every parent workflow against the non-production API.

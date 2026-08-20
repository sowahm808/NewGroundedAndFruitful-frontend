# API integration, local environment, and deployment

## Configuration

Angular configuration is compile-time, so this repository intentionally has no runtime `.env` loader. Set public Firebase web configuration and the API base URL in the appropriate `src/environments/environment*.ts` file or replace that file in CI. Firebase web identifiers are public identifiers, but service-account credentials, tokens, child PINs, and private content must never be committed.

| Build       | API configuration            | Firebase expectation                                  |
| ----------- | ---------------------------- | ----------------------------------------------------- |
| Development | local backend `/api/v1`      | dedicated demo project and emulators                  |
| Staging     | staging backend `/api/v1`    | dedicated non-production project                      |
| Production  | production backend `/api/v1` | production project; App Check contract still required |

All API calls must go through `ApiClient`. The authentication interceptor attaches Firebase ID tokens only to the configured API base URL. Feature components must not call Firestore or calculate points.

## Contract handoff

Before adding a repository, obtain the backend OpenAPI/schema source and record the exact method, path, request, response, authorization/resource scope, validation errors, correlation ID, caching, version conflict, and idempotency semantics. The unresolved contract inventory is maintained in `frontend-production-audit.md`.

Run `BACKEND_OPENAPI=/path/to/backend-openapi.json npm run test:contract` (an HTTPS URL is also accepted) against the exact backend-owned artifact being deployed. The check deliberately fails when the artifact is absent, when a consumed operation drifts, or when required success and error responses are undocumented; the frontend does not carry a self-authored substitute for the backend authority.

## Local emulators

1. Use the runtime selected by `.nvmrc` and run `npm ci`.
2. Use a dedicated non-production Firebase project. Never select the production project for automated tests.
3. Start `npx firebase-tools emulators:start` (Auth 9099, Firestore 8080, Functions 5001, UI 4000).
4. Start the backend configured for those emulators and its test database.
5. Start Angular with `npm start`.

The repository does not yet contain an emulator seed script or authenticated Playwright session helper. Until those are supplied, authenticated e2e scenarios are blocked rather than silently aimed at production.

## Deployment

Run `npm ci`, lint, unit tests, the production build, and emulator-backed e2e tests. Netlify publishes `dist/grounded-fruitful/browser`; its SPA redirect and security/cache headers are defined in `netlify.toml`. Provide environment replacements before the build, verify the selected Node image supports the declared engine, and smoke-test auth/bootstrap plus expired-session recovery against staging before promotion.

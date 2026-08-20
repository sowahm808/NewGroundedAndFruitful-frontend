# Bible frontend contract readiness

## Decision

The Bible administration and child quiz workflow is **contract-gated**. The repository contains no generated or
published OpenAPI artifact, and the deployed backend artifact could not be obtained from this environment. The product
flow document deliberately says exact schemas belong in OpenAPI. The two July–September documents are content inputs,
not an HTTP contract; they must not be used to invent DTOs or ship fallback quiz data.

The previous child page used handwritten polymorphic activity types and assumed `GET /child/bible`,
`GET /child/bible/{id}`, and `POST /child/bible/{id}/responses`. These assumptions were not backed by an OpenAPI
artifact and could not represent the requested multi-question, draft, versioned completion workflow. Those types and
requests have been removed. The browser now makes no Bible request and contains no quiz/answer-key content.

## Missing backend operations

The authoritative artifact must identify operation IDs, paths, security, request/response DTOs, status enums, query
parameters, headers, and error codes for all of these capabilities before they can be enabled:

- Admin content-set list/detail with supported search, quarter/status filters, sorting, and server pagination.
- Paired DOCX multipart import, documented byte limits, organization/quarter eligibility, progress semantics, and safe
  retry/idempotency behavior. The requested UI expects multipart fields `quizFile` and `answerKeyFile`, but these names
  remain unimplemented until verified in OpenAPI.
- Import status/detail polling and terminal statuses; admin-only preview; supported versioned corrections; server
  validation; warning acknowledgement; commit to a draft content set.
- Draft content-set review, explicit publish, and archive lifecycle commands with version conflicts.
- Child assigned activity/session response that uses a separate allow-listed schema containing date-only activity date,
  instructions, ordered questions/choices, saved/completed state, and no answer-key/admin fields.
- Child draft save and idempotent completion commands, including exact answer fields, concurrency behavior, participation
  response, and dashboard/point invalidation semantics.
- Documented mappings for invalid files, parse/mismatch/validation/date/lifecycle conflicts, assignment/configuration
  absence, invalid response, already completed, forbidden scope, throttling, missing point rule, and award dependency
  failure.

No operation IDs or DTO names can be reported because none are available. Semantic capability names above are not API
names and must not be treated as such.

## Routes

All required route shapes exist behind the established authenticated role guards:

- `/admin/bible`
- `/admin/bible/imports/new`
- `/admin/bible/imports/:importId`
- `/admin/bible/content/:contentSetId`
- `/child/bible`

Each route explains the precise dependency without presenting missing content as an empty result or exposing a
nonfunctional action. The existing application shell and navigation are unchanged.

## Enablement procedure

1. Export the deployed backend OpenAPI JSON to a reviewed build artifact; do not fetch an unpinned mutable document in a
   production frontend build.
2. Set `BACKEND_OPENAPI` to that file and run `npm run test:contract`. Extend the drift check to the verified Bible
   operations and schemas, including a recursive forbidden-key assertion on the child response.
3. Generate separate admin and child TypeScript clients using the repository's approved generator once one is selected;
   commit the generated source and artifact checksum.
4. Implement against generated types only, then run formatter, lint, type-check, unit/component tests, Playwright, and a
   production build.
5. In staging, verify tenant authorization, both-file upload, polling cancellation, correction/version conflicts,
   validate → commit → publish separation, child date assignment in the organization timezone, idempotent completion,
   and server-owned participation refresh.
6. After deployment, verify request IDs and lifecycle audit events, confirm that no child/network response contains
   answer or storage fields, and confirm identical participation awards for correct and incorrect test submissions.

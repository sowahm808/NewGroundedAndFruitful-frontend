# Menu and workflow regression restoration audit (2026-08-21)

## Evidence and scope

The requested `Final(4)` document is not present in this checkout. The available product baseline is
`docs/reference/Grounded_Fruitful_Product_Flow_and_Contract_Final(2).docx`; it was used together with Git history.
No blanket rollback was performed. Commit `e33998e` introduced the named dedicated unavailable pages. Commit
`2be50d9` subsequently introduced the only historically implemented contract-backed admin resource client/pages.
Commit `398fe72` deleted that client and routed the resources back to unavailable pages. Commit `0189bdf` replaced
the complete role menu with a capability registry containing only six parent links, Quarters, and Bible. The child
Character parent-capability defect was added by `0189bdf`.

Current Firebase authentication, canonical session loading, onboarding/workspace provisioning, bearer-token and
workspace headers, organization isolation, Bible administration/import validation, storage, and request-ID error
handling were intentionally retained.

## Restoration matrix

All generic resources below use the restored `AdminPageComponent` definition, `AdminResourceComponent`, and
`AdminApiService`. The client calls `GET /admin/{resource}` and
`POST /admin/{resource}/{id}/commands/{action}` with the published page/record envelopes, optimistic version,
`If-Match`, bearer token and active-workspace scoping. Their last working implementation is commit `2be50d9`;
removal is `398fe72`. Risk is **contract drift** until the deployed backend OpenAPI confirms each dynamic resource.

| Feature / route                    | Replaced component                    | Restored resource                                 | Required capability              | Classification                                   |
| ---------------------------------- | ------------------------------------- | ------------------------------------------------- | -------------------------------- | ------------------------------------------------ |
| Participants `/admin/participants` | `AdminCapabilityUnavailableComponent` | `participants`                                    | `admin.participants.manage`      | frontend restored; OpenAPI confirmation required |
| Teams `/admin/teams`               | `AdminTeamsUnavailableComponent`      | `teams`                                           | `admin.teams.manage`             | frontend restored; OpenAPI confirmation required |
| Assignments `/admin/assignments`   | `AdminCapabilityUnavailableComponent` | `assignments`                                     | `admin.assignments.manage`       | frontend restored; OpenAPI confirmation required |
| Character `/admin/character`       | `AdminCharacterUnavailableComponent`  | `character-cycles`                                | `admin.character.manage`         | frontend restored; OpenAPI confirmation required |
| Family `/admin/family`             | `AdminFamilyUnavailableComponent`     | `family-activities`                               | `admin.family_activities.manage` | frontend restored; OpenAPI confirmation required |
| Books `/admin/books`               | `AdminBooksUnavailableComponent`      | `books`                                           | `admin.books.manage`             | frontend restored; OpenAPI confirmation required |
| Projects `/admin/projects`         | `AdminCapabilityUnavailableComponent` | `projects`                                        | `admin.projects.manage`          | frontend restored; OpenAPI confirmation required |
| Surveys `/admin/surveys`           | `AdminSurveysUnavailableComponent`    | `surveys`                                         | `admin.surveys.manage`           | frontend restored; OpenAPI confirmation required |
| Point rules `/admin/points`        | `AdminPointsUnavailableComponent`     | `point-rules`                                     | `admin.point_rules.manage`       | frontend restored; OpenAPI confirmation required |
| Reports `/admin/reports`           | `AdminReportsUnavailableComponent`    | `reports`                                         | `admin.reports.read`             | frontend restored; OpenAPI confirmation required |
| Awards `/admin/awards`             | `AdminCapabilityUnavailableComponent` | `awards`                                          | `admin.awards.manage`            | frontend restored; OpenAPI confirmation required |
| Roles `/admin/roles`               | `AdminCapabilityUnavailableComponent` | `roles`                                           | platform super-admin boundary    | frontend restored; OpenAPI confirmation required |
| Audit `/admin/audit`               | `AdminAuditUnavailableComponent`      | `audit`                                           | platform super-admin boundary    | frontend restored; OpenAPI confirmation required |
| Quarters `/admin/quarters`         | real dedicated page                   | unchanged dedicated quarter API/page              | `admin.quarters.manage`          | working/aligned                                  |
| Bible `/admin/bible`               | real dedicated page                   | unchanged dedicated Bible API/import/review pages | `admin.bible_content.manage`     | working/aligned                                  |
| Organizations, memberships, users  | real dedicated pages                  | unchanged dedicated API/pages                     | platform super-admin boundary    | working/aligned                                  |

No historical admin Dashboard, Settings, or Operations component/service exists in any repository commit, so none
was fabricated. The historical resource implementation is the only verified restoration source; it is shared
infrastructure with product-specific definitions, not an unavailable placeholder. Production must not be declared
fully aligned until the backend publishes/mounts the dynamic endpoints above.

## Role navigation and authorization

The typed registry records stable ID, label, route, persona/group, capabilities, workspace restrictions, feature
status and order. Child (9), Parent (8), Mentor (4), Observer (1), organization Admin (13), and Super Admin tenant
items (5) are represented. An active membership is mandatory. Ownership does not infer Admin. Organization Admin
requires the `admin` workspace role plus the route capability. Tenant items require the `super_admin` platform role
plus platform capability in navigation; direct routes retain the platform role guard. Parent supports personal and
organization workspaces and relationship checks remain backend-owned. Child Character is protected by the Child
shell instead of `parent.children.read`. Desktop and mobile consume the same computed registry and render nothing
until the canonical active membership is loaded, preventing an unauthorized flash.

## Rollback

Use `git revert <restoration-commit-sha>` after deployment (never `reset --hard`). This produces a reviewable inverse
commit while preserving later authentication/security work and unrelated history.

## Parent Reports state regression (2026-08-22)

`/parent/reports` now treats the shared relationship state as the single authority before rendering report content.
Relationship loading, successful relationship emptiness, relationship failure, child selection, report loading,
successful report emptiness, report failure, and populated reports are mutually exclusive. A relationship failure
shows Retry and the backend request ID when supplied; a valid parent with no active relationship sees **No linked
children yet** and the real administrator-assisted enrollment/linking guidance.

The API client now normalizes both published collection shapes—`{ data: { items, hasMore, nextCursor? } }` and
`{ data: [], meta: { nextCursor: null } }`—at the HTTP boundary. `nextCursor: null` is a completed empty page, not
contract drift. HTTP 403, 404, and 5xx responses still remain errors and are never converted into empty arrays.

No Parent Reports summary/category/trend values were invented. The currently available report contract exposes only
report identity, child scope, title, lifecycle status, availability, and calculation timestamp. Reporting periods,
category summaries, server-calculated trend points, and secure exports remain blocked until the backend-owned OpenAPI
publishes those DTOs and operations; the enabled page displays only authorized server fields in the meantime.

# Child journey integration

Audited 2026-08-19. The deployed Render host and all common OpenAPI locations were requested before implementation, but the environment's outbound proxy rejected the connection with HTTP 403. The repository contains no OpenAPI document. Consequently the paths below follow the product-provided contract list, but deployment, payload shapes, upload-target behavior, and authenticated authorization could not be independently confirmed. There is no frontend fallback or production mock.

All calls use `ChildApi`, `ApiClient` envelope unwrapping/error normalization, the API base URL, and the Firebase bearer-token interceptor. Mutation answers are JSON body fields, never URL/query fields. Idempotent final commands send one stable `Idempotency-Key`; errors remain visible.

| Checklist capability                              | Route/component                           | Contract/model                                                            | Automated coverage/status                                                                                              |
| ------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Dashboard, quarter/week, contributions, timestamp | `/child/today`, `ChildDashboardComponent` | `GET /child/today`, `TodaySummary`                                        | API mapping/spec; deployed contract unverified                                                                         |
| Private check-in                                  | `/child/check-in`, `CheckInComponent`     | GET/draft/complete check-in endpoints; `CheckInCommand`                   | typed form and body-only privacy; authenticated E2E blocked                                                            |
| Gratitude and history                             | `/child/gratitude`, `GratitudeComponent`  | GET/POST `/child/gratitude`, `CursorPage<GratitudeEntry>`                 | URL privacy spec; cursor UI                                                                                            |
| Dynamic character reflection                      | `/child/character`, `CharacterComponent`  | GET/draft/complete character endpoints; `CharacterCycle`                  | null/0/10 typed semantics and atomic command specs                                                                     |
| Bible activities                                  | `/child/bible`, `BibleComponent`          | Bible list/detail/response endpoints; `BibleActivity` discriminated union | participation-only copy; contract unverified                                                                           |
| Quarter reading/media                             | `/child/reading`, `ReadingComponent`      | reading endpoints; `ReadingSummary`, `MediaPolicy`                        | MIME/size specs; backend-authorized upload-target contract remains unverified, so private binary upload is not enabled |
| Projects                                          | `/child/project`, `ProjectComponent`      | project CRUD/milestone/update endpoints; `Project`                        | list/create states; complete transition UI awaits deployed transition contract                                         |
| Sanitized team view                               | `/child/team`, `TeamComponent`            | `GET /child/team`, allow-listed `TeamView`                                | model cannot represent other children or private responses                                                             |
| Special activities/surveys                        | `/child/more`, `MoreComponent`            | special and survey endpoints/models                                       | listing and idempotent special completion; dynamic survey response UI awaits verified question contract                |
| Point history/awards                              | `/child/more`, `MoreComponent`            | `GET /child/points`, `GET /child/awards`                                  | backend values displayed without eligibility/total calculations; points cursor continuation pending                    |

## Exact backend dependencies

1. Publish/version the deployed OpenAPI document, including authentication scopes, validation details, request IDs, cursor metadata, optimistic concurrency, idempotency replay semantics, and whether check-in/gratitude drafts are supported.
2. Confirm that all product-listed `/child/*` endpoints are deployed and return the modeled envelopes.
3. Publish the reading upload-target request/response and cancellation/finalization contract, MIME/size policy, private playback authorization, and storage metadata shape. No permanent public URL is accepted by the current frontend.
4. Publish legal project transitions and milestone-completion commands.
5. Publish survey draft/final semantics and typed answer validation.
6. Provide the established emulator seed and authenticated child fixture. Current Playwright coverage intentionally tests no production data.

Because these dependencies prevent the completion standard in `todo.md` (real deployed integration plus authenticated E2E), no additional Section 4 checkbox is marked complete in this change.

# Admin reports integration correction

## Root cause

The restored administration implementation routed eleven unrelated features through `AdminPageComponent`,
`AdminResourceComponent`, and `AdminApiService`. Every routed instance constructed the same query (`page=1`,
`pageSize=25`, `sort=-updatedAt`) and addressed a dynamic `/admin/{resource}` URL. Reports therefore used a
record-management contract rather than a report-job contract. The navigation registry itself is pure and does not
make feature requests; in this checkout a single route creates a single generic component request. Any simultaneous
all-resource traffic must come from an older deployed bundle rather than the current shell.

Reports now owns its API lifecycle. It requests only `GET /admin/reports` on entry, cancels subscriptions when the
route is destroyed, and polls only a job created on this route. Navigation remains capability-derived and does not
probe endpoints.

## Failure classification

The captured production failures establish the following client-side causes. Backend codes, field errors, mounted
route metadata, and OpenAPI operation identifiers were not included in the supplied capture and cannot safely be
invented. They must be completed from backend logs/OpenAPI using the displayed request ID before backend changes are
approved.

| Resource                                                    | Status | Sent query                           | Established frontend defect                            | Backend verification still required             |
| ----------------------------------------------------------- | -----: | ------------------------------------ | ------------------------------------------------------ | ----------------------------------------------- |
| family-activities, books, surveys, point-rules, assignments |    403 | `page=1&pageSize=25&sort=-updatedAt` | generic client called capability-protected operations  | capability and active-workspace projection      |
| projects                                                    |    404 | same                                 | dynamic path was assumed without contract verification | mounted path/operation                          |
| reports, awards, participants, teams                        |    422 | same                                 | unrelated universal query was supplied                 | validator field errors and supported pagination |
| quarters, bible-content                                     |    200 | same                                 | no Reports dependency; requests were unrelated         | no contract change; preserve dedicated clients  |

The frontend does not reinterpret any of these responses as an empty result. Reports maps 403, 409, 422,
dependency failures, and contract failures to distinct UI states and retains request IDs and field errors.

## Request matrix

| Route                      | Before (generic restoration)                                      | After this correction                                                                                     |
| -------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `/admin/reports`           | `GET /admin/reports?page=1&pageSize=25&sort=-updatedAt`           | `GET /admin/reports`; job detail polling only after creation; create/command/download only on user action |
| `/admin/quarters`          | dedicated quarters API                                            | unchanged                                                                                                 |
| `/admin/bible`             | dedicated Bible content/import APIs and quarters where required   | unchanged                                                                                                 |
| other generic Admin routes | one `GET /admin/{resource}` with universal query per active route | unchanged pending a backend-owned OpenAPI contract; never loaded by Reports in this source tree           |

The report type values and job operations in the dedicated client must remain synchronized with the backend-owned
OpenAPI. The contract verification script should be run with `BACKEND_OPENAPI` during deployment. Production smoke
testing and deployment are release-environment responsibilities because this checkout has neither authenticated
production credentials nor a deploy target.

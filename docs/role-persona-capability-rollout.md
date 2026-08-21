# Role, persona, capability, and navigation rollout

## Verified scope and production mismatch

This repository is the Angular frontend. It contains no workspace bootstrap, membership writer, Firebase custom-claim writer, `parentChildLinks` persistence, parent-children backend service, or deployment configuration for an API. Those backend changes and the data migration must be delivered in the backend repository before this frontend is rolled out.

The frontend mismatch had two concrete causes:

1. `resolvePostAuthDestination` treated `registrationIntent === "personal"` plus an active `owner` membership as sufficient parent authority.
2. The shell filtered navigation by flattened effective roles, so the session's sole `owner` role produced no parent links. The compatibility guard nevertheless admitted that owner to `/parent/*`, where `ParentApi.children()` called the published `GET /parent/children` contract. A backend correctly requiring parent authority therefore returned 403.

No production request ID or production log source was supplied, so the backend-side branch that emitted the observed 403 cannot be distinguished here. Based on the supplied session, missing parent persona/capability is the first failed prerequisite. This frontend no longer infers that authority from ownership or registration intent.

## Session contract

Before (observed compatibility shape):

```json
{
  "activeWorkspaceId": "personal-…",
  "roles": ["owner"],
  "effectiveRoles": ["owner"],
  "memberships": [{ "workspaceRoles": ["owner"], "status": "active" }]
}
```

After (additive backend-owned fields consumed by this frontend):

```json
{
  "activeWorkspaceId": "personal-…",
  "activeWorkspace": { "id": "personal-…", "type": "personal", "name": "Personal", "status": "active" },
  "workspaceRoles": ["owner"],
  "personas": ["parent"],
  "capabilities": [
    "parent.children.read",
    "parent.observations.create",
    "family.activities.read",
    "support.requests.create"
  ],
  "effectiveRoles": ["owner", "parent"]
}
```

The flattened `effectiveRoles` field may remain temporarily for compatibility, but this frontend does not derive capabilities from it.

## Authority matrix

| Actor/context                                   | Governance          | Persona         | Required capability                              | Resource scope                               |
| ----------------------------------------------- | ------------------- | --------------- | ------------------------------------------------ | -------------------------------------------- |
| Personal parent owner                           | `owner`             | `parent`        | `parent.*`, `family.*`, or `support.*` per route | Active `parentChildLink` in active workspace |
| Organization administrator                      | `admin`             | none by default | Approved `admin.*` capability                    | Active organization membership               |
| Organization administrator who is also a parent | `admin`             | `parent`        | Both independently issued capability sets        | Parent data remains link-scoped              |
| Platform administrator                          | none required       | none implied    | Independently approved platform authority        | Explicit platform policy                     |
| Child                                           | membership-specific | `child`         | Child journey capabilities                       | Participant identity ownership               |
| Mentor                                          | membership-specific | `mentor`        | Mentor capabilities                              | Active team assignment                       |
| Observer                                        | membership-specific | `observer`      | Observer capabilities                            | Active observer grant                        |

`owner` never implies parent, admin, super-admin, access to an unlinked child, or cross-tenant authority.

## Backend rollout and migration gate

Before deploying this frontend, verify mounted routes against the published OpenAPI and implement the backend session projection and centralized authorization policies. Then dry-run an idempotent, checkpointed migration limited to active personal-workspace owners whose authoritative registration record says `personal`. The dry run must report before/after counts and ambiguous records; organization owners must not be inferred as parents. Record immutable audit evidence and retain the additive persona assignment so rollback can remove only migration-tagged assignments.

No migration dry run or execution was performed from this frontend repository. No backend or frontend deployment was performed.

## Rollback

1. Roll back the frontend deployment to the preceding release while retaining additive session fields.
2. Keep backend authorization relationship-scoped; do not restore owner-to-parent equivalence.
3. If migration data must be rolled back, remove only persona assignments carrying the migration's immutable audit identifier and re-project sessions/claims.
4. Confirm personal owners without an explicit parent assignment return 403, valid parents without links return `200 { "data": [] }`, and cross-workspace requests remain denied.

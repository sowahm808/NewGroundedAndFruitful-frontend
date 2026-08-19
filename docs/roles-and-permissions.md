# Roles and permissions

| Role        | UX scope                                                                                   |
| ----------- | ------------------------------------------------------------------------------------------ |
| child       | Own journey, private check-in, character, Bible, reading, project, composite team progress |
| parent      | Backend-linked children, observations, family activities, support requests, reports        |
| mentor      | Backend-assigned teams, guidance, encouragement                                            |
| observer    | Permitted positive observations only                                                       |
| admin       | Program configuration and scoped reporting                                                 |
| super_admin | Tenant-level administration                                                                |

Guards improve UX only. Rules and backend claim checks repeat every scope decision. Ordinary clients cannot award points, approve observations, assign roles/teams, alter history, impersonate children, or select unrelated children/teams.

## Current route matrix

| Route prefix | Allowed role(s)    | Current landing route    | Status                                                 |
| ------------ | ------------------ | ------------------------ | ------------------------------------------------------ |
| `/child`     | child              | `/child/today`           | Dashboard/character scaffold; remaining pages generic  |
| `/parent`    | parent             | `/parent/children`       | Dedicated API components / explicit unavailable states |
| `/mentor`    | mentor             | `/mentor/teams`          | Dedicated API components / explicit unavailable states |
| `/observer`  | observer           | `/observer/observations` | Explicit unavailable state pending an API contract     |
| `/admin`     | admin, super_admin | `/admin/users`           | Dedicated API components / explicit unavailable states |

Unauthenticated access to these prefixes returns to `/auth/login` with an application-local `returnUrl`. An authenticated role mismatch goes to `/unauthorized`; unknown URLs display a 404 experience. Backend authorization and resource relationship checks are still mandatory for every request.

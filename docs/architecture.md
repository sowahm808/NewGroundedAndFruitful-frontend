# Architecture

The repository began with only a placeholder README. It now uses an Angular standalone feature architecture: `core` owns cross-cutting authentication, guards, layout, models, Firebase boundaries, and errors; `shared` owns presentation primitives and pure utilities; `features` owns role and domain workflows.

The client is not an authorization boundary. Firebase Security Rules and protected functions must enforce linked-child, assigned-team, role, and admin scopes. Points are read-only backend results. Admin writes require server-verified custom claims and audited operations. Data is loaded on demand; admin collections must be page-limited.

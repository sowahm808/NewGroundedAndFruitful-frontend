# Frontend architecture

- Standalone route components are code split with `loadComponent`.
- Signals represent synchronous view/session state; RxJS is reserved for Firebase and HTTP streams.
- Typed repositories are the integration boundary; components must not call Firebase directly.
- `DataPageState<T>` is the required discriminated union for every data-backed page. It distinguishes initialization,
  reads, empty results, commands, success, validation, conflict, authorization, missing resources, throttling, network,
  dependency, and publication/disabled states. Empty results are successful outcomes, not errors.
- Command controls remain disabled while `saving` or `submitting`; retries reuse the caller-owned idempotency key until
  the server completes the command. A completion replaces local state with the returned server representation.
- Error normalization preserves backend request IDs. `role_required` is presented as forbidden only when the session
  lacks the route's canonical role, and backend/dependency failures are never presented as unpublished features.
- SCSS tokens and `gf-*` primitives provide visible focus, touch sizing, surfaces, progress, and responsive layout.
- Desktop uses a sidebar; mobile uses compact bottom navigation.

Team views exclude private emotions, notes, ratings, grades, and sensitive data. All points mutations remain backend responsibilities.

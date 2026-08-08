# Frontend architecture

- Standalone route components are code split with `loadComponent`.
- Signals represent synchronous view/session state; RxJS is reserved for Firebase and HTTP streams.
- Typed repositories are the integration boundary; components must not call Firebase directly.
- `LoadState<T>` consistently models idle, loading, success, empty, and categorized errors.
- SCSS tokens and `gf-*` primitives provide visible focus, touch sizing, surfaces, progress, and responsive layout.
- Desktop uses a sidebar; mobile uses compact bottom navigation.

Team views exclude private emotions, notes, ratings, grades, and sensitive data. All points mutations remain backend responsibilities.

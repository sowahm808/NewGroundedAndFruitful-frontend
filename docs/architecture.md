# Architecture

The repository began with only a placeholder README. It now uses an Angular standalone feature architecture: `core` owns cross-cutting authentication, guards, layout, models, Firebase boundaries, and errors; `shared` owns presentation primitives and pure utilities; `features` owns role and domain workflows.

The client is not an authorization boundary. The Node.js/Express REST API hosted on Render is the only application backend and owns all privileged business operations, including points, assignments, approvals, milestones, reports, and administration. Angular authenticates supported flows with Firebase Authentication, then the centralized API interceptor obtains the current ID token in memory and sends it to the API as a bearer token. ID tokens must never be persisted manually.

Angular must not write privileged Firestore records directly. The Render API verifies Firebase ID tokens and enforces linked-child, assigned-team, role, and admin scopes. Firebase continues to provide Authentication, Cloud Firestore, and Cloud Storage where required. Netlify hosts only the Angular static application; Netlify Functions are not used.

API base URLs are selected by Angular build configuration. Development uses the local Firebase Functions emulator, staging uses the staging host, and production uses `https://newgroundedandfruitful-backend.onrender.com/api/v1` until the custom API domain is publicly verified. Feature code uses `ApiClient`, whose normalized errors let the UI handle authentication, authorization, not-found, conflict, validation, rate-limit, and server failures consistently.

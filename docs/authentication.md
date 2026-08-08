# Authentication

Adults authenticate with Firebase email/password and use Firebase password reset. A child submits family code, handle, and PIN over TLS to a protected, rate-limited backend exchange endpoint. The backend validates the mapping and returns a Firebase custom token; the client creates only a Firebase Auth session and clears the PIN.

Roles come only from verified Firebase custom claims/session restoration—not forms, route parameters, or editable profiles. App Check must be initialized before production backend calls. Account-disabled and unauthorized states are distinct. Logout terminates Firebase Auth state. Application code never stores credentials, PINs, claims, or tokens in local storage.

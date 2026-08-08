# Testing

`npm run test` runs Jasmine/Karma. Unit tests cover progress bounds, five-answer completion, identical completion treatment for ratings 0 and 10, Bible-correctness independence, and role guards.

`npm run e2e` runs Playwright at desktop and mobile sizes. Public authentication and redirects for protected child, parent, mentor, and admin workflows are covered. For authenticated integration coverage, start `npx firebase-tools emulators:start`, seed users/custom claims using an emulator-only script, and run Playwright against the emulator project. Never use production projects for automated tests.

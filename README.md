# Grounded & Fruitful frontend

A mobile-first Angular 22 application for secure youth participation, reflection, learning, family connection, mentoring, and program administration.

## Exact commands

Prerequisites: Node.js 26, npm, Chrome/Chromium, and the Firebase CLI. The repository's
`.nvmrc` and `package.json` both declare the supported Node.js major version; when using
`nvm`, select it with:

```bash
nvm install
nvm use
```

Then install and start the application:

```bash
npm install
npm start
```

Open `http://localhost:4200`. To connect the Firebase Emulator Suite:

```bash
# Terminal 1
npx firebase-tools emulators:start
# Terminal 2
npm start
```

Validate and build:

```bash
npm run lint
npm run test
npm run e2e
npm run build
```

Firebase public web configuration belongs in `src/environments/environment*.ts` or a CI replacement step. Never commit service-account keys, PINs, ID tokens, or production secrets. Checked-in Firestore rules deny all access until collection-specific backend rules are reviewed.

See [architecture](docs/architecture.md), [frontend architecture](docs/frontend-architecture.md), [authentication](docs/authentication.md), [roles and route matrix](docs/roles-and-permissions.md), [API/environment/deployment setup](docs/api-integration-and-deployment.md), [testing](docs/testing.md), and the [production audit](docs/frontend-production-audit.md).

> **Release status:** the audit identifies contract and workflow blockers. Generic feature pages and hardcoded child views are scaffolding and must not be represented as live backend data.

## Product invariant

Points are backend-owned and reward participation, effort, milestones, and consistency. Character rating values, grades, Bible accuracy, spiritual performance, and child-to-child comparison never determine awards.

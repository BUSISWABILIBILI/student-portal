# Project Readiness

## Current State

- Database source of truth is `database/schema.sql`.
- Historical migrations are aligned with the current schema for older database
  upgrades.
- Seed data targets the current schema and includes demo academic data.
- Server import, validator, auth, and protected route smoke tests pass.
- Frontend lint and production build pass.
- The React portal covers the main admin and student workflows:
  authentication, dashboards, courses, registration, results, announcements,
  and user management.

## Verification Commands

Run these from the repository root:

```powershell
npm run server:test
npm run client:lint
npm run client:build
npm run e2e
```

The root `npm run check` script runs those checks in sequence.

`npm run e2e` starts the frontend and a mock API on isolated local ports,
launches a headless Chrome or Edge browser, and verifies the core admin and
student portal navigation. Backend behavior remains covered by the server smoke
tests.

## Remaining Production Work

- Expand browser-level end-to-end tests to cover create/edit/publish actions.
- Add a migration runner or deployment procedure for non-local databases.
- Add password reset and password change flows.
- Add production environment documentation for secrets, CORS origins, and MySQL
  backups.
- Add CI so tests, lint, and build run automatically on pull requests.

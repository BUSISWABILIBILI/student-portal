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
```

The root `npm run check` script runs those checks in sequence.

## Remaining Production Work

- Add browser-level end-to-end tests for the main admin and student workflows.
- Add a migration runner or deployment procedure for non-local databases.
- Add password reset and password change flows.
- Add production environment documentation for secrets, CORS origins, and MySQL
  backups.
- Add CI so tests, lint, and build run automatically on pull requests.

# Project Readiness

## Current State

- Database source of truth is `backend/database/schema.sql`.
- Historical migrations are aligned with the current schema for older database
  upgrades.
- Historical migrations can be applied or baselined with the tracked migration
  runner.
- Production environment, CORS, secret, migration, and MySQL backup procedures
  are documented.
- Seed data targets the current schema and includes demo academic data.
- Backend import, validator, auth, and protected route smoke tests pass.
- Frontend lint and production build pass.
- GitHub Actions CI runs backend tests, frontend lint, frontend build, and browser
  smoke coverage on pushes and pull requests targeting `main`.
- The React portal covers the main admin and student workflows:
  authentication, dashboards, courses, registration, results, announcements,
  and user management.
- Password change and token-based password reset flows are available through
  the API and React portal.
- Root workflow scripts can install, run, test, lint, and build the separated
  `backend/` and `frontend/` apps.
- Backend liveness and database readiness endpoints are available for
  deployment checks.
- Request IDs are returned on responses and included in production JSON logs
  for troubleshooting.
- A live database schema verifier compares MySQL metadata with
  `backend/database/schema.sql`.

## Verification Commands

Run these from the repository root:

```powershell
npm run backend:test
npm run frontend:lint
npm run frontend:build
npm run e2e
```

The root `npm run check` script runs those checks in sequence.

When MySQL is available, run `npm run db:verify` to confirm the live database
matches the committed schema.

`npm run e2e` starts the frontend and a mock API on isolated local ports,
launches a headless Chrome or Edge browser, verifies the core admin and student
portal navigation, and exercises administrator course, result, announcement,
and user management write flows plus student registration and cancellation.
Backend behavior remains covered by the backend smoke tests.

## Remaining Production Work

- No open readiness gaps are currently tracked.

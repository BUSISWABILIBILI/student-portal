# Production Operations

This guide covers the environment and database practices needed before running
the Student Portal outside local development.

## Runtime Environments

Use separate environments for development, staging, and production. Each
environment should have its own MySQL database, JWT secret, backend
environment, and frontend build configuration.

Do not commit real `.env` files. Use `backend/.env.example` and
`frontend/.env.example` only as templates.

## Backend Environment

Required backend variables:

| Variable | Purpose |
| --- | --- |
| `NODE_ENV` | Use `production` in production deployments. |
| `PORT` | HTTP port used by the Express API. |
| `CLIENT_URL` | Exact frontend origin allowed by CORS. |
| `DB_HOST` | MySQL host name or IP address. |
| `DB_PORT` | MySQL port, usually `3306`. |
| `DB_USER` | MySQL application user. |
| `DB_PASSWORD` | MySQL application password. |
| `DB_NAME` | MySQL database name. |
| `JWT_SECRET` | Long random secret used to sign access tokens. |
| `JWT_EXPIRES_IN` | Access-token lifetime, for example `1d`. |

The backend validates these values at startup. `PORT` and `DB_PORT` must be
valid TCP ports, `CLIENT_URL` must be an exact `http` or `https` origin without
a path, query, hash, or trailing slash, and `JWT_EXPIRES_IN` must use a duration
such as `15m`, `1h`, `1d`, or `7d`.

Production example:

```text
NODE_ENV=production
PORT=5000
CLIENT_URL=https://portal.example.edu

DB_HOST=mysql.internal.example.edu
DB_PORT=3306
DB_USER=student_portal_app
DB_PASSWORD=<stored-in-secret-manager>
DB_NAME=student_portal

JWT_SECRET=<stored-in-secret-manager>
JWT_EXPIRES_IN=1d
```

Generate `JWT_SECRET` with a cryptographically strong random value and store it
in the deployment platform's secret manager. Do not reuse local or staging
secrets in production. In production, the API refuses placeholder JWT secrets
and secrets shorter than 32 characters.

## Frontend Environment

Set the frontend API URL at build time:

```text
VITE_API_URL=https://api.portal.example.edu/api
```

After changing `VITE_API_URL`, rebuild the frontend. Vite embeds this value
into the production bundle.

## CORS

The API only allows requests from `CLIENT_URL`. In production, `CLIENT_URL`
must be the exact browser origin of the deployed frontend, including protocol
and host:

```text
CLIENT_URL=https://portal.example.edu
```

Do not use `*` with credentials. If the frontend URL changes, update
`CLIENT_URL`, restart the API, and verify browser login again.

## Auth Abuse Controls

Public login and password-reset routes are rate-limited by client IP. Keep
these limits enabled in production and make sure reverse proxies preserve the
originating client address before traffic reaches the API.

## Shutdown

The backend handles `SIGINT` and `SIGTERM` by closing the HTTP server and MySQL
connection pool before exiting. Configure process managers and hosting
platforms to send `SIGTERM` and allow at least 10 seconds for graceful shutdown
before force-killing the process.

## Observability

Every response includes an `X-Request-Id` header. If a client sends a valid
`X-Request-Id`, the API preserves it; otherwise the API generates one. Error
responses include the same `requestId` so support logs and user-visible errors
can be correlated.

In production, request and error logs are written as JSON lines with request
IDs, status codes, paths, and timing metadata. Configure the hosting platform
to capture standard output and standard error.

## MySQL Access

Use a dedicated MySQL user for the application. Grant only the permissions the
application needs on the application database:

```sql
CREATE USER 'student_portal_app'@'%' IDENTIFIED BY 'replace_this_password';

GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES
ON student_portal.*
TO 'student_portal_app'@'%';
```

Restrict network access so only the API host can connect to MySQL.

## Migrations

For an existing database, check pending migrations before deployment:

```powershell
npm run db:migrate:status
npm run db:migrate -- --dry-run
npm run db:verify
```

Apply pending migrations during a controlled deployment window:

```powershell
npm run db:migrate
npm run db:verify
```

For a new database created from `backend/database/schema.sql`, record the
historical migrations without executing them:

```powershell
npm run db:migrate -- --baseline
```

Only baseline after verifying the live database already matches the current
schema.

## Password Reset Delivery

Password reset tokens are returned in API responses only when `NODE_ENV` is not
`production`. In production, connect the reset request flow to a trusted email
provider and send users a link to:

```text
https://portal.example.edu/reset-password?token=<reset-token>
```

Never log reset tokens or send them through unsupported channels.

## Backups

Create encrypted, access-controlled MySQL backups before every deployment that
changes the database schema.

Example backup command:

```powershell
mysqldump `
  --host <db-host> `
  --port 3306 `
  --user <db-user> `
  --password `
  --single-transaction `
  --routines `
  --triggers `
  --set-gtid-purged=OFF `
  student_portal `
  > student_portal_YYYYMMDD_HHMM.sql
```

Store backups outside the application server. Use retention rules that match
the institution's data policy.

Test restore procedures regularly in a non-production environment:

```powershell
mysql `
  --host <restore-db-host> `
  --port 3306 `
  --user <db-user> `
  --password `
  student_portal_restore `
  < student_portal_YYYYMMDD_HHMM.sql
```

## Deployment Checklist

Before release:

- Confirm `NODE_ENV=production`.
- Confirm `CLIENT_URL` matches the deployed frontend origin.
- Confirm `VITE_API_URL` points to the production API.
- Run `npm run db:migrate -- --dry-run`.
- Run `npm run db:verify` against the target database.
- Take and verify a MySQL backup.
- Run `npm run backend:test`, `npm run frontend:lint`,
  `npm run frontend:build`,
  and `npm run e2e` in a staging-like environment.

After release:

- Check `GET /api/health`.
- Check `GET /api/ready` to confirm the API can reach MySQL.
- Sign in as an administrator and a student.
- Verify dashboard, course, result, announcement, and account pages.
- Confirm error logs do not contain secret values.

# Database

`schema.sql` is the source of truth for fresh local database creation. It should
represent the final schema expected by the current backend repositories.

Files in `migrations/` are historical upgrade steps for existing databases.
Do not run them after applying `schema.sql`, because the fresh schema already
contains their final state.

`seed.sql` targets the current `schema.sql` contract.

## Migration Runner

Existing databases can be upgraded with the backend migration runner:

```powershell
npm run db:migrate:status
npm run db:migrate -- --dry-run
npm run db:migrate
```

The runner reads `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME`
from the backend environment. It creates a `schema_migrations` tracking table,
runs pending files in lexical order, records a SHA-256 checksum for each applied
file, and ignores `USE ...;` statements inside migration files so the configured
`DB_NAME` remains the target database.

If a database was created from the current `schema.sql`, or the historical
migrations were already applied manually, record the existing migration files
without executing them:

```powershell
npm run db:migrate -- --baseline
```

Only use `--baseline` after confirming the live database already matches the
schema expected by the application.

## Schema Verification

After applying migrations or restoring a database, compare the live MySQL
schema with `backend/database/schema.sql`:

```powershell
npm run db:verify
```

The verifier checks required tables, columns, indexes, foreign keys, and check
constraints. It also reports unexpected application columns or tables while
allowing the migration runner's `schema_migrations` table.

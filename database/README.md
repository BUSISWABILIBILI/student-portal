# Database

`schema.sql` is the source of truth for fresh local database creation. It should
represent the final schema expected by the current server repositories.

Files in `migrations/` are historical upgrade steps for existing databases.
Do not run them after applying `schema.sql`, because the fresh schema already
contains their final state.

`seed.sql` targets the current `schema.sql` contract.

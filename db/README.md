# Database scripts

## Commands

```bash
pnpm db:schema        # print current DB schema as JSON
pnpm db:migrate       # apply all pending migrations
pnpm db:rollback      # roll back the last applied migration
pnpm db:rollback -- --steps 3  # roll back the last 3
```

All commands load `.env.local` automatically via `dotenv-cli`.

---

## Migrations

Files live in `db/migrations/` and must follow the naming convention:

```
NNN_description.sql   # e.g. 002_add_reviews_index.sql
```

Each file has two sections:

```sql
-- up
CREATE TABLE ...;

-- down
DROP TABLE ...;
```

The runner applies files in alphabetical order. Each migration runs inside a transaction — if it fails, it rolls back and stops.

Applied migrations are tracked in the `schema_migrations` table:

```sql
CREATE TABLE schema_migrations (
  version    TEXT        PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Bootstrapping an existing DB

If the tables already exist (e.g. created manually), create `schema_migrations` and register the baseline migration without re-running the DDL:

```sql
CREATE TABLE schema_migrations (
  version    TEXT        PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO schema_migrations (version) VALUES ('001_initial_schema');
```

---

## Scripts

| File | Description |
|------|-------------|
| `scripts/migrate.ts` | Migration runner (`up` / `down` commands) |
| `scripts/db_schema.ts` | Introspects tables, constraints, indexes, functions, and extensions from `information_schema` and `pg_catalog` |

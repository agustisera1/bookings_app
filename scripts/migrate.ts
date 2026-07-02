import { Pool, PoolClient } from "pg";
import * as fs from "fs";
import * as path from "path";

const pool = new Pool({
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT) || 5433,
  database: process.env.PGDATABASE,
});

const MIGRATIONS_DIR = path.join(process.cwd(), "db", "migrations");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function bootstrap(client: PoolClient) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version    TEXT        PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

function getMigrationFiles(): string[] {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.error(`Migrations directory not found: ${MIGRATIONS_DIR}`);
    process.exit(1);
  }
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
}

function parseMigration(filePath: string): { up: string; down: string } {
  const content = fs.readFileSync(filePath, "utf-8");

  const upMatch = content.match(/--\s*up\s*\n([\s\S]*?)(?=--\s*down\s*\n|$)/i);
  const downMatch = content.match(/--\s*down\s*\n([\s\S]*)$/i);

  const up = upMatch?.[1]?.trim() ?? "";
  const down = downMatch?.[1]?.trim() ?? "";

  if (!up) {
    console.error(`No "-- up" section found in ${path.basename(filePath)}`);
    process.exit(1);
  }

  return { up, down };
}

async function getApplied(client: PoolClient): Promise<Set<string>> {
  const result = await client.query<{ version: string }>(
    "SELECT version FROM schema_migrations ORDER BY version",
  );
  return new Set(result.rows.map((r) => r.version));
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

async function up() {
  const client = await pool.connect();
  try {
    await bootstrap(client);

    const files = getMigrationFiles();
    const applied = await getApplied(client);
    const pending = files.filter((f) => !applied.has(path.basename(f, ".sql")));

    if (pending.length === 0) {
      console.log("Already up to date.");
      return;
    }

    for (const file of pending) {
      const version = path.basename(file, ".sql");
      const { up: sql } = parseMigration(path.join(MIGRATIONS_DIR, file));

      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(
          "INSERT INTO schema_migrations (version) VALUES ($1)",
          [version],
        );
        await client.query("COMMIT");
        console.log(`  ✓ ${version}`);
      } catch (err) {
        await client.query("ROLLBACK");
        console.error(`  ✗ ${version}`);
        console.error(err);
        process.exit(1);
      }
    }

    console.log(`\n${pending.length} migration(s) applied.`);
  } finally {
    client.release();
  }
}

async function down(steps: number) {
  const client = await pool.connect();
  try {
    await bootstrap(client);

    const result = await client.query<{ version: string }>(
      "SELECT version FROM schema_migrations ORDER BY version DESC LIMIT $1",
      [steps],
    );

    if (result.rows.length === 0) {
      console.log("Nothing to roll back.");
      return;
    }

    for (const { version } of result.rows) {
      const filePath = path.join(MIGRATIONS_DIR, `${version}.sql`);

      if (!fs.existsSync(filePath)) {
        console.error(`Migration file not found: ${version}.sql`);
        process.exit(1);
      }

      const { down: sql } = parseMigration(filePath);

      if (!sql) {
        console.error(
          `No "-- down" section in ${version}.sql — cannot roll back`,
        );
        process.exit(1);
      }

      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("DELETE FROM schema_migrations WHERE version = $1", [
          version,
        ]);
        await client.query("COMMIT");
        console.log(`  ✓ rolled back ${version}`);
      } catch (err) {
        await client.query("ROLLBACK");
        console.error(`  ✗ ${version}`);
        console.error(err);
        process.exit(1);
      }
    }

    console.log(`\n${result.rows.length} migration(s) rolled back.`);
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const command = args[0];

if (command !== "up" && command !== "down") {
  console.error("Usage: migrate.ts <up|down> [--steps N]");
  process.exit(1);
}

const stepsFlag = args.indexOf("--steps");
const steps = stepsFlag !== -1 ? parseInt(args[stepsFlag + 1], 10) : 1;

if (command === "up") {
  up()
    .catch(console.error)
    .finally(() => pool.end());
} else {
  down(steps)
    .catch(console.error)
    .finally(() => pool.end());
}

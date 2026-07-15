/**
 * Migration runner.
 *
 *   pnpm db:status              ledger vs. files on disk
 *   pnpm db:migrate             apply every pending migration
 *   pnpm db:migrate --dry-run   print what `up` would apply, touch nothing
 *   pnpm db:rollback            roll back the last applied migration (asks first)
 *   pnpm db:rollback --steps 2  roll back the last N
 *   pnpm db:mark <version>      record a migration as applied WITHOUT running it
 *
 * Every migration runs inside its own transaction: it lands whole or not at all.
 * Postgres DDL is transactional, so a failed migration leaves nothing behind.
 *
 * Always apply migrations through this runner. Pasting a .sql into a GUI client
 * gets you no transaction, no ledger entry, and — depending on the editor —
 * statements split at the wrong line.
 */
import { Pool, PoolClient } from "pg";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline/promises";

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

function getVersions(): string[] {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.error(`Migrations directory not found: ${MIGRATIONS_DIR}`);
    process.exit(1);
  }
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .map((f) => path.basename(f, ".sql"))
    .sort();
}

function parseMigration(version: string): { up: string; down: string } {
  const filePath = path.join(MIGRATIONS_DIR, `${version}.sql`);

  if (!fs.existsSync(filePath)) {
    console.error(`Migration file not found: ${version}.sql`);
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const upMatch = content.match(/--\s*up\s*\n([\s\S]*?)(?=--\s*down\s*\n|$)/i);
  const downMatch = content.match(/--\s*down\s*\n([\s\S]*)$/i);

  const up = upMatch?.[1]?.trim() ?? "";
  const down = downMatch?.[1]?.trim() ?? "";

  if (!up) {
    console.error(`No "-- up" section found in ${version}.sql`);
    process.exit(1);
  }

  return { up, down };
}

async function getApplied(client: PoolClient): Promise<string[]> {
  const result = await client.query<{ version: string }>(
    "SELECT version FROM schema_migrations ORDER BY version",
  );
  return result.rows.map((r) => r.version);
}

/**
 * pg errors carry the useful part in `detail`/`hint`; the stack is noise from
 * inside the driver. Print what actually identifies the failing statement.
 */
function reportError(err: unknown) {
  const e = err as { message?: string; detail?: string; hint?: string; code?: string };
  console.error(`\n  ${e.message ?? String(err)}`);
  if (e.detail) console.error(`  detail: ${e.detail}`);
  if (e.hint) console.error(`  hint:   ${e.hint}`);
  if (e.code) console.error(`  code:   ${e.code}`);
}

async function confirm(question: string): Promise<boolean> {
  if (!process.stdin.isTTY) {
    console.error("Not a TTY — re-run with --yes to confirm non-interactively.");
    return false;
  }
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question(`${question} [y/N] `);
    return answer.trim().toLowerCase() === "y";
  } finally {
    rl.close();
  }
}

/** Runs one migration's SQL and updates the ledger, in a single transaction. */
async function runInTransaction(
  client: PoolClient,
  sql: string,
  ledgerUpdate: () => Promise<void>,
): Promise<boolean> {
  await client.query("BEGIN");
  try {
    await client.query(sql);
    await ledgerUpdate();
    await client.query("COMMIT");
    return true;
  } catch (err) {
    await client.query("ROLLBACK");
    reportError(err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

/**
 * Ledger vs. disk. The drift this catches — a migration applied by hand, so the
 * schema has it but the ledger doesn't — is invisible until `up` crashes into
 * an "already exists", or until `down` targets something far older than you
 * expect. Cheap to run, so run it before either.
 */
async function status() {
  const client = await pool.connect();
  try {
    await bootstrap(client);

    const files = getVersions();
    const applied = await getApplied(client);
    const appliedSet = new Set(applied);
    const fileSet = new Set(files);

    console.log("");
    for (const version of files) {
      console.log(`  ${appliedSet.has(version) ? "✓ applied" : "· pending"}  ${version}`);
    }

    // In the ledger but with no file: someone deleted or renamed a migration.
    // There is no `down` to roll these back.
    const orphans = applied.filter((v) => !fileSet.has(v));
    for (const version of orphans) {
      console.log(`  ⚠ no file  ${version}`);
    }

    const pending = files.filter((v) => !appliedSet.has(v));
    console.log("");
    console.log(`  ${applied.length} applied, ${pending.length} pending`);

    if (orphans.length > 0) {
      console.log(
        `\n  ⚠ ${orphans.length} version(s) in the ledger have no .sql file — cannot be rolled back.`,
      );
    }

    // Gaps mean the ledger and the schema disagree about history: something was
    // applied out of band. Flag it before `up` or `down` acts on a false view.
    const lastApplied = applied.filter((v) => fileSet.has(v)).at(-1);
    if (lastApplied) {
      const gaps = pending.filter((v) => v < lastApplied);
      if (gaps.length > 0) {
        console.log(
          `\n  ⚠ pending migration(s) older than the last applied (${lastApplied}): ${gaps.join(", ")}` +
            `\n    The ledger likely drifted from the schema. If these are already applied by hand,` +
            `\n    record them with: pnpm db:mark <version>`,
        );
      }
    }
    console.log("");
  } finally {
    client.release();
  }
}

async function up(dryRun: boolean) {
  const client = await pool.connect();
  try {
    await bootstrap(client);

    const applied = new Set(await getApplied(client));
    const pending = getVersions().filter((v) => !applied.has(v));

    if (pending.length === 0) {
      console.log("Already up to date.");
      return;
    }

    if (dryRun) {
      console.log(`\nWould apply ${pending.length} migration(s):\n`);
      for (const version of pending) {
        console.log(`─── ${version} ───`);
        console.log(parseMigration(version).up);
        console.log("");
      }
      console.log("Dry run — nothing was applied.");
      return;
    }

    for (const version of pending) {
      const { up: sql } = parseMigration(version);
      const ok = await runInTransaction(client, sql, async () => {
        await client.query("INSERT INTO schema_migrations (version) VALUES ($1)", [version]);
      });

      if (!ok) {
        console.error(`  ✗ ${version} — rolled back, nothing was applied`);
        console.error(`\nRun 'pnpm db:status' to compare the ledger against the files.`);
        process.exit(1);
      }
      console.log(`  ✓ ${version}`);
    }

    console.log(`\n${pending.length} migration(s) applied.`);
  } finally {
    client.release();
  }
}

/**
 * Rolls back the last N applied migrations, newest first.
 *
 * The target comes from the LEDGER, not from disk — so if the ledger drifted,
 * the newest recorded version can be far older than the schema really is, and
 * its `down` can be far more destructive than you expect. That's why this
 * prints the exact SQL and asks before running it.
 */
async function down(steps: number, skipConfirm: boolean) {
  const client = await pool.connect();
  try {
    await bootstrap(client);

    const applied = await getApplied(client);
    const targets = applied.slice(-steps).reverse();

    if (targets.length === 0) {
      console.log("Nothing to roll back.");
      return;
    }

    console.log(`\nAbout to roll back ${targets.length} migration(s):\n`);
    for (const version of targets) {
      const { down: sql } = parseMigration(version);
      if (!sql) {
        console.error(`No "-- down" section in ${version}.sql — cannot roll back.`);
        process.exit(1);
      }
      console.log(`─── ${version} ───`);
      console.log(sql);
      console.log("");
    }

    // The ledger's newest is older than files that exist: the schema is probably
    // ahead of what's recorded, and this `down` is not the one you want.
    const fileSet = new Set(getVersions());
    const newest = targets[0];
    const newerFiles = [...fileSet].filter((v) => v > newest && !applied.includes(v));
    if (newerFiles.length > 0) {
      console.log(
        `⚠ WARNING: ${newerFiles.length} migration file(s) newer than ${newest} are not in the ledger:` +
          `\n  ${newerFiles.join(", ")}` +
          `\n  The ledger may have drifted from the schema — check 'pnpm db:status' first.\n`,
      );
    }

    if (!skipConfirm && !(await confirm("Run the SQL above?"))) {
      console.log("Aborted — nothing was rolled back.");
      return;
    }

    for (const version of targets) {
      const { down: sql } = parseMigration(version);
      const ok = await runInTransaction(client, sql, async () => {
        await client.query("DELETE FROM schema_migrations WHERE version = $1", [version]);
      });

      if (!ok) {
        console.error(`  ✗ ${version} — rolled back, nothing was reverted`);
        process.exit(1);
      }
      console.log(`  ✓ rolled back ${version}`);
    }

    console.log(`\n${targets.length} migration(s) rolled back.`);
  } finally {
    client.release();
  }
}

/**
 * Records a migration as applied without running it — for when its effects are
 * already in the schema (applied by hand, or an environment baselined from a
 * dump). The escape hatch for the drift `status` reports.
 */
async function mark(version: string) {
  const client = await pool.connect();
  try {
    await bootstrap(client);

    parseMigration(version); // exits if the file doesn't exist

    const applied = await getApplied(client);
    if (applied.includes(version)) {
      console.log(`${version} is already recorded as applied.`);
      return;
    }

    console.log(
      `\nThis records ${version} as applied WITHOUT running its SQL.` +
        `\nOnly do this if its changes are already present in the schema.\n`,
    );

    if (!(await confirm(`Mark ${version} as applied?`))) {
      console.log("Aborted — the ledger was not modified.");
      return;
    }

    await client.query("INSERT INTO schema_migrations (version) VALUES ($1)", [version]);
    console.log(`  ✓ marked ${version} as applied`);
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const command = args[0];

const stepsFlag = args.indexOf("--steps");
const steps = stepsFlag !== -1 ? parseInt(args[stepsFlag + 1], 10) : 1;
const skipConfirm = args.includes("--yes");
const dryRun = args.includes("--dry-run");

async function main() {
  switch (command) {
    case "status":
      return status();
    case "up":
      return up(dryRun);
    case "down":
      if (!Number.isInteger(steps) || steps < 1) {
        console.error("--steps must be a positive integer");
        process.exit(1);
      }
      return down(steps, skipConfirm);
    case "mark": {
      const version = args[1];
      if (!version) {
        console.error("Usage: migrate.ts mark <version>");
        process.exit(1);
      }
      return mark(version);
    }
    default:
      console.error(
        "Usage: migrate.ts <status|up|down|mark>\n" +
          "  status                 compare the ledger against the files\n" +
          "  up [--dry-run]         apply pending migrations\n" +
          "  down [--steps N] [--yes]  roll back the last N (asks first)\n" +
          "  mark <version>         record as applied without running it",
      );
      process.exit(1);
  }
}

main()
  .catch((err) => {
    reportError(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());

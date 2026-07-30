/**
 * Data reset for local development.
 *
 *   pnpm db:reset             ask first, then wipe
 *   pnpm db:reset --dry-run   count what it would delete, touch nothing
 *   pnpm db:reset --yes       skip the prompt (CI / scripted runs)
 *
 * Wipes the transactional data and leaves the world re-seedable:
 *
 *   Postgres  bookings · reviews · sessions · outbox     (users SURVIVE)
 *   Mongo     listings · notifications · chats · messages
 *   S3        every object in the listings bucket
 *
 * The Mongo side uses `deleteMany({})`, never `drop()`: dropping a collection
 * takes its indexes with it, and they only exist because someone created them by
 * hand. The schema survives on both sides — this only removes rows.
 */
import { Pool } from "pg";
import { MongoClient } from "mongodb";
import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";
import * as readline from "readline/promises";

// `users` is deliberately absent: wiping it would invalidate every logged-in
// session and every `host_id` the seeded listings point at.
const PG_TABLES = ["bookings", "reviews", "sessions", "outbox"] as const;

// Each collection lives in its own database (see lib/repositories/*.mongo.ts).
const MONGO_COLLECTIONS = [
  { db: "listingsdb", collection: "listings" },
  { db: "notificationsdb", collection: "notifications" },
  { db: "chatsdb", collection: "chats" },
  { db: "messagesdb", collection: "messages" },
] as const;

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const skipConfirm = args.includes("--yes");

const pool = new Pool({
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT) || 5433,
  database: process.env.PGDATABASE,
});

async function confirm(question: string): Promise<boolean> {
  if (!process.stdin.isTTY) {
    console.error("Not a TTY — re-run with --yes to confirm non-interactively.");
    return false;
  }
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  try {
    const answer = await rl.question(`${question} [y/N] `);
    return answer.trim().toLowerCase() === "y";
  } finally {
    rl.close();
  }
}

// ---------------------------------------------------------------------------
// Postgres
// ---------------------------------------------------------------------------

async function countPgRows() {
  const counts = await Promise.all(
    PG_TABLES.map(async (table) => {
      const result = await pool.query<{ count: string }>(
        `SELECT count(*) FROM ${table}`,
      );
      return [table, Number(result.rows[0].count)] as const;
    }),
  );
  return counts;
}

async function resetPostgres() {
  // One TRUNCATE for all four: Postgres resolves the FKs between them itself.
  // No CASCADE on purpose — if a table outside this set references one of them,
  // this fails loudly instead of quietly wiping something nobody listed.
  await pool.query(`TRUNCATE TABLE ${PG_TABLES.join(", ")}`);
  console.log(`  ✓ postgres: truncated ${PG_TABLES.join(", ")}`);
}

// ---------------------------------------------------------------------------
// Mongo
// ---------------------------------------------------------------------------

async function withMongo<T>(fn: (client: MongoClient) => Promise<T>) {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Missing MONGODB_URI");

  const client = new MongoClient(uri);
  try {
    await client.connect();
    return await fn(client);
  } finally {
    await client.close();
  }
}

async function countMongoDocs(client: MongoClient) {
  return Promise.all(
    MONGO_COLLECTIONS.map(async ({ db, collection }) => {
      const count = await client
        .db(db)
        .collection(collection)
        .countDocuments({});
      return [`${db}.${collection}`, count] as const;
    }),
  );
}

async function resetMongo(client: MongoClient) {
  for (const { db, collection } of MONGO_COLLECTIONS) {
    const { deletedCount } = await client
      .db(db)
      .collection(collection)
      .deleteMany({});
    console.log(`  ✓ mongo: ${db}.${collection} — ${deletedCount} deleted`);
  }
}

// ---------------------------------------------------------------------------
// S3
// ---------------------------------------------------------------------------

const s3 = new S3Client({
  region: process.env.AWS_S3_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

async function* listBucketKeys(Bucket: string) {
  let ContinuationToken: string | undefined;
  do {
    const page = await s3.send(
      new ListObjectsV2Command({ Bucket, ContinuationToken }),
    );
    const keys = (page.Contents ?? [])
      .map((object) => object.Key)
      .filter((key): key is string => Boolean(key));
    if (keys.length > 0) yield keys;
    // A truncated page is the only signal there is more; the token is unset once
    // the listing is exhausted.
    ContinuationToken = page.IsTruncated
      ? page.NextContinuationToken
      : undefined;
  } while (ContinuationToken);
}

// `null` means the bucket could not be read at all — almost always a missing
// `s3:ListBucket` (a bucket-level action, granted on the bucket ARN rather than
// on `.../*`). The databases are the point of this script, so S3 degrades to a
// warning instead of taking the whole reset down with it.
async function countS3Objects(Bucket: string): Promise<number | null> {
  try {
    let total = 0;
    for await (const keys of listBucketKeys(Bucket)) total += keys.length;
    return total;
  } catch (err) {
    console.error(`\n⚠ s3: cannot list ${Bucket} — ${(err as Error).message}`);
    return null;
  }
}

async function resetS3(Bucket: string) {
  let deleted = 0;
  // DeleteObjects caps at 1000 keys per call, which is also the page size of
  // ListObjectsV2 — so one page maps to exactly one delete request.
  for await (const keys of listBucketKeys(Bucket)) {
    const result = await s3.send(
      new DeleteObjectsCommand({
        Bucket,
        Delete: { Objects: keys.map((Key) => ({ Key })), Quiet: true },
      }),
    );

    for (const error of result.Errors ?? []) {
      console.error(`  ✗ s3: ${error.Key} — ${error.Message}`);
    }
    deleted += keys.length - (result.Errors?.length ?? 0);
  }
  console.log(`  ✓ s3: ${deleted} object(s) deleted from ${Bucket}`);
}

// ---------------------------------------------------------------------------

async function main() {
  const bucket = process.env.AWS_LISTINGS_BUCKET;
  if (!bucket) throw new Error("Missing AWS_LISTINGS_BUCKET");

  await withMongo(async (mongo) => {
    const [pgCounts, mongoCounts, s3Count] = await Promise.all([
      countPgRows(),
      countMongoDocs(mongo),
      countS3Objects(bucket),
    ]);

    console.log(
      `\nTarget: ${process.env.PGDATABASE}@${process.env.PGHOST}:${process.env.PGPORT} · ${bucket}\n`,
    );
    console.log("This DELETES:\n");
    for (const [table, count] of pgCounts) {
      console.log(`  postgres  ${table.padEnd(24)} ${count} row(s)`);
    }
    for (const [name, count] of mongoCounts) {
      console.log(`  mongo     ${name.padEnd(24)} ${count} doc(s)`);
    }
    console.log(
      `  s3        ${bucket.padEnd(24)} ${
        s3Count === null ? "SKIPPED (not readable — empty it by hand)" : `${s3Count} object(s)`
      }`,
    );
    console.log("\nKEEPS: postgres `users`, every Mongo index, both schemas.\n");

    if (dryRun) {
      console.log("Dry run — nothing was deleted.");
      return;
    }

    if (!skipConfirm && !(await confirm("Delete all of the above?"))) {
      console.log("Aborted — nothing was deleted.");
      return;
    }

    console.log("");
    await resetPostgres();
    await resetMongo(mongo);
    if (s3Count === null) {
      console.log(`  – s3: skipped, ${bucket} was not readable`);
    } else {
      await resetS3(bucket);
    }
    console.log("\nDone. Re-seed with scripts/seed_listings.js.");
  });
}

main()
  .catch((err) => {
    console.error("\n[reset_data]", err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());

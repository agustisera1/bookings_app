import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, QueryResult, QueryResultRow } from "pg";
import type { ErrorCode } from "@/lib/shared/result";

const pool = new Pool({
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT),
  database: process.env.PGDATABASE,
});

export const db = drizzle({ client: pool });

export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export const query = <R extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[],
): Promise<QueryResult<R>> => {
  return pool.query<R>(text, params);
};

// PostgreSQL error code → ErrorCode
// https://www.postgresql.org/docs/current/errcodes-appendix.html
const PG_CONFLICT: ReadonlySet<string> = new Set([
  "23505", // unique_violation
  "23P01", // exclusion_violation (e.g. overlapping date ranges)
]);

const PG_NOT_FOUND: ReadonlySet<string> = new Set([
  "23503", // foreign_key_violation — referenced entity doesn't exist
]);

const PG_VALIDATION: ReadonlySet<string> = new Set([
  "23502", // not_null_violation
  "23514", // check_violation
  "22001", // string_data_right_truncation
  "22003", // numeric_value_out_of_range
  "22007", // invalid_datetime_format
  "22008", // datetime_field_overflow
]);

// Drizzle wraps driver errors in DrizzleQueryError: the pg code lives in `cause`.
function pgCode(error: unknown): string | undefined {
  const source = error instanceof Error && error.cause ? error.cause : error;
  if (source !== null && typeof source === "object" && "code" in source)
    return String(source.code);
}

export function pgErrorToCode(error: unknown): ErrorCode {
  const code = pgCode(error);
  if (code === undefined) return "UNEXPECTED";
  if (PG_CONFLICT.has(code)) return "CONFLICT";
  if (PG_NOT_FOUND.has(code)) return "NOT_FOUND";
  if (PG_VALIDATION.has(code)) return "VALIDATION";
  return "UNEXPECTED";
}

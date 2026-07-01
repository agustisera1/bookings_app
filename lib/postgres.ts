import { Pool, QueryResult, QueryResultRow } from "pg";
import type { ErrorCode } from "./types";

const pool = new Pool({
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT),
  database: process.env.PGDATABASE,
});

export const query = <R extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[]
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

export function pgErrorToCode(error: unknown): ErrorCode {
  if (error !== null && typeof error === "object" && "code" in error) {
    const pg = (error as { code: string }).code;
    if (PG_CONFLICT.has(pg)) return "CONFLICT";
    if (PG_NOT_FOUND.has(pg)) return "NOT_FOUND";
    if (PG_VALIDATION.has(pg)) return "VALIDATION";
  }
  return "UNEXPECTED";
}

import { Pool, QueryResult, QueryResultRow } from "pg";

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

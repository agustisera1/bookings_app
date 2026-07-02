import { Pool } from "pg";

const pool = new Pool({
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT) || 5433,
  database: process.env.PGDATABASE,
});

async function main() {
  const [columns, constraints, checks, indexes, functions_, extensions] =
    await Promise.all([
      pool.query(`
        SELECT
          c.table_name,
          c.column_name,
          c.data_type,
          c.udt_name,
          c.character_maximum_length,
          c.numeric_precision,
          c.numeric_scale,
          c.is_nullable,
          c.column_default,
          c.ordinal_position
        FROM information_schema.columns c
        JOIN information_schema.tables t
          ON t.table_name = c.table_name AND t.table_schema = c.table_schema
        WHERE c.table_schema = 'public' AND t.table_type = 'BASE TABLE'
        ORDER BY c.table_name, c.ordinal_position
      `),

      pool.query(`
        SELECT
          tc.table_name,
          tc.constraint_name,
          tc.constraint_type,
          kcu.column_name,
          ccu.table_name  AS foreign_table,
          ccu.column_name AS foreign_column,
          rc.update_rule,
          rc.delete_rule
        FROM information_schema.table_constraints tc
        LEFT JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema  = kcu.table_schema
        LEFT JOIN information_schema.constraint_column_usage ccu
          ON tc.constraint_name = ccu.constraint_name
          AND tc.table_schema  = ccu.table_schema
        LEFT JOIN information_schema.referential_constraints rc
          ON tc.constraint_name   = rc.constraint_name
          AND tc.table_schema     = rc.constraint_schema
        WHERE tc.table_schema = 'public' AND tc.constraint_type != 'CHECK'
        ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name, kcu.ordinal_position
      `),

      pool.query(`
        SELECT
          tc.table_name,
          tc.constraint_name,
          cc.check_clause
        FROM information_schema.table_constraints tc
        JOIN information_schema.check_constraints cc
          ON tc.constraint_name  = cc.constraint_name
          AND tc.table_schema    = cc.constraint_schema
        WHERE tc.table_schema = 'public'
        ORDER BY tc.table_name, tc.constraint_name
      `),

      pool.query(`
        SELECT indexname, tablename, indexdef
        FROM pg_indexes
        WHERE schemaname = 'public'
        ORDER BY tablename, indexname
      `),

      pool.query(`
        SELECT
          r.routine_name,
          r.data_type         AS return_type,
          r.external_language AS language,
          r.routine_definition,
          coalesce(
            string_agg(
              p.parameter_name || ' ' || p.data_type,
              ', ' ORDER BY p.ordinal_position
            ), ''
          ) AS parameters
        FROM information_schema.routines r
        LEFT JOIN information_schema.parameters p
          ON  r.specific_name   = p.specific_name
          AND r.specific_schema = p.specific_schema
          AND p.parameter_mode  = 'IN'
        WHERE r.routine_schema = 'public'
        GROUP BY r.routine_name, r.data_type, r.external_language, r.routine_definition
        ORDER BY r.routine_name
      `),

      pool.query(`
        SELECT extname, extversion FROM pg_extension ORDER BY extname
      `),
    ]);

  const tables: Record<string, object[]> = {};
  for (const col of columns.rows) {
    (tables[col.table_name] ??= []).push(col);
  }

  const output = {
    tables,
    constraints: constraints.rows,
    checkConstraints: checks.rows,
    indexes: indexes.rows,
    functions: functions_.rows,
    extensions: extensions.rows,
  };

  console.log(JSON.stringify(output, null, 2));
}

main()
  .catch(console.error)
  .finally(() => pool.end());

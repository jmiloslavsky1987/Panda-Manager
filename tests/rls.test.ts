/**
 * rls.test.ts — Wave 0 stub (RED)
 * Asserts that querying actions without setting app.current_project_id
 * returns 0 rows — RLS must ensure missing project scope is an empty result,
 * not the full table (no cross-project data leak).
 *
 * DATA-06: Row-Level Security enforcement.
 *
 * // RLS must ensure missing project scope = empty result, not full table
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://localhost:5432/bigpanda_test';

// Connect as app_user role (RLS-enforced role)
// The URL must point to a connection that uses the restricted role
const sql = postgres(DATABASE_URL, { max: 1 });

test('querying actions without app.current_project_id returns 0 rows (RLS)', async () => {
  // Explicitly do NOT set app.current_project_id — RLS should block all rows
  const rows = await sql`SELECT * FROM actions`;
  assert.strictEqual(
    rows.length,
    0,
    'Expected RLS to return 0 rows when app.current_project_id is not set'
  );
});

test('cross-project data leak is impossible (RLS isolation)', async () => {
  // Set project A scope, insert an action for project B — query must return 0 rows
  // This test will fail until RLS is implemented (correct RED state)
  await sql`SELECT set_config('app.current_project_id', '1', true)`;

  const rows = await sql`
    SELECT * FROM actions
    WHERE project_id != 1
  `;
  assert.strictEqual(
    rows.length,
    0,
    'Expected RLS to hide rows from other projects even when explicitly filtering'
  );
});

process.on('exit', () => { sql.end(); });

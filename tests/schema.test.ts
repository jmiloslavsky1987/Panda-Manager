/**
 * schema.test.ts — Wave 0 stub (RED)
 * Asserts all 13 domain tables exist in the PostgreSQL database.
 * These tests MUST FAIL until Plan 01-02 creates the schema.
 *
 * DATA-01: Table existence for all 13 domain tables.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://localhost:5432/bigpanda_test';

// Lazy connection — will fail on actual query if DB is not reachable (correct RED state)
let sql: ReturnType<typeof postgres>;
try {
  sql = postgres(DATABASE_URL, { max: 1, connect_timeout: 5 });
} catch {
  sql = postgres(DATABASE_URL, { max: 1 });
}

const EXPECTED_TABLES = [
  'projects',
  'workstreams',
  'actions',
  'risks',
  'milestones',
  'artifacts',
  'engagement_history',
  'key_decisions',
  'stakeholders',
  'tasks',
  'outputs',
  'plan_templates',
  'knowledge_base',
];

for (const table of EXPECTED_TABLES) {
  test(`table "${table}" exists`, async () => {
    const rows = await sql`
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = ${table}
    `;
    assert.strictEqual(rows.length, 1, `Expected table "${table}" to exist in public schema`);
  });
}

// Cleanup connection after all tests
process.on('exit', () => { sql.end(); });

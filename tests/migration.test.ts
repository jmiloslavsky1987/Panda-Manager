/**
 * migration.test.ts — Wave 0 stub (RED)
 * Asserts that after running migrate-local.ts:
 *   - projects table has at least 3 rows (KAISER, AMEX, Merck)
 *   - running the import twice produces the same row count (idempotency)
 *   - KAISER actions have external_id format A-KAISER-NNN
 *
 * DATA-03: YAML import migration
 * DATA-04: xlsx supplement import
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://localhost:5432/bigpanda_test';

const sql = postgres(DATABASE_URL, { max: 1 });

describe('migration script', () => {
  test('projects table has >= 3 rows after migration (KAISER, AMEX, Merck)', async () => {
    // Import and run the migration script (file doesn't exist yet — RED)
    await import('../scripts/migrate-local.js');

    const rows = await sql`SELECT COUNT(*)::int AS count FROM projects`;
    assert.ok(
      rows[0].count >= 3,
      `Expected >= 3 projects after migration, got ${rows[0].count}`
    );
  });

  test('migration is idempotent: running twice produces same row count', async () => {
    await import('../scripts/migrate-local.js');
    const [before] = await sql`SELECT COUNT(*)::int AS count FROM projects`;

    await import('../scripts/migrate-local.js');
    const [after] = await sql`SELECT COUNT(*)::int AS count FROM projects`;

    assert.strictEqual(
      after.count,
      before.count,
      `Expected idempotent migration: got ${before.count} before and ${after.count} after second run`
    );
  });

  test('KAISER actions have external_id format A-KAISER-NNN', async () => {
    // Actions from xlsx supplement must follow external_id format A-KAISER-NNN
    const rows = await sql`
      SELECT external_id FROM actions
      WHERE external_id LIKE 'A-KAISER-%'
      LIMIT 1
    `;
    assert.ok(rows.length >= 1, 'Expected at least one KAISER action with A-KAISER- prefix');
    assert.match(
      rows[0].external_id,
      /^A-KAISER-\d{3}$/,
      `Expected external_id format A-KAISER-NNN, got ${rows[0].external_id}`
    );
  });
});

process.on('exit', () => { sql.end(); });

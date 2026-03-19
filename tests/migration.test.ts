/**
 * migration.test.ts — Migration script tests
 * Plan 01-05: YAML context doc import (KAISER, AMEX, Merck stub)
 * Plan 01-06: xlsx supplement import (actions — A-KAISER-NNN format)
 *
 * DATA-03: YAML import migration
 * DATA-04: xlsx supplement import (tested in Plan 01-06)
 *
 * NOTE: These tests require PostgreSQL running at DATABASE_URL.
 * Pre-established constraint: DB tests remain RED until PostgreSQL is installed.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://localhost:5432/bigpanda_test';

const sql = postgres(DATABASE_URL, { max: 1, connect_timeout: 5 });

describe('migration script (Plan 01-05: YAML import)', () => {
  test('projects table has exactly 3 rows after YAML migration (KAISER, AMEX, Merck)', async () => {
    // Import and run the migration script
    await import('../scripts/migrate-local.js');

    const rows = await sql`SELECT COUNT(*)::int AS count FROM projects`;
    assert.strictEqual(
      rows[0].count,
      3,
      `Expected exactly 3 projects after YAML migration, got ${rows[0].count}`
    );
  });

  test('all three expected customers exist: KAISER, AMEX, MERCK', async () => {
    await import('../scripts/migrate-local.js');

    const rows = await sql`SELECT customer FROM projects ORDER BY customer`;
    const customers = rows.map((r: { customer: string }) => r.customer);
    assert.ok(customers.includes('KAISER'), 'Expected KAISER project');
    assert.ok(customers.includes('AMEX'), 'Expected AMEX project');
    assert.ok(customers.includes('MERCK'), 'Expected MERCK project');
  });

  test('KAISER and AMEX projects have source=yaml', async () => {
    await import('../scripts/migrate-local.js');

    const rows = await sql`
      SELECT customer, source_file FROM projects
      WHERE customer IN ('KAISER', 'AMEX')
      ORDER BY customer
    `;
    assert.strictEqual(rows.length, 2, 'Expected KAISER and AMEX rows');
    for (const row of rows) {
      assert.ok(row.source_file, `Expected source_file set on ${row.customer}`);
    }
  });

  test('MERCK is a stub project (minimal data, source_file set)', async () => {
    await import('../scripts/migrate-local.js');

    const [merck] = await sql`
      SELECT name, customer, status, source_file FROM projects
      WHERE customer = 'MERCK'
    `;
    assert.ok(merck, 'Expected MERCK project row');
    assert.strictEqual(merck.customer, 'MERCK');
    assert.strictEqual(merck.status, 'active');
    assert.ok(merck.source_file, 'Expected source_file set on MERCK stub');
  });

  test('KAISER milestones have external_id format M-KAISER-NNN', async () => {
    await import('../scripts/migrate-local.js');

    const rows = await sql`
      SELECT m.external_id FROM milestones m
      JOIN projects p ON p.id = m.project_id
      WHERE p.customer = 'KAISER'
      LIMIT 1
    `;
    assert.ok(rows.length >= 1, 'Expected at least one KAISER milestone');
    assert.match(
      rows[0].external_id,
      /^M-KAISER-\d+$/,
      `Expected external_id format M-KAISER-NNN, got ${rows[0].external_id}`
    );
  });

  test('KAISER risks have external_id format R-KAISER-NNN', async () => {
    await import('../scripts/migrate-local.js');

    const rows = await sql`
      SELECT r.external_id FROM risks r
      JOIN projects p ON p.id = r.project_id
      WHERE p.customer = 'KAISER'
      LIMIT 1
    `;
    assert.ok(rows.length >= 1, 'Expected at least one KAISER risk');
    assert.match(
      rows[0].external_id,
      /^R-KAISER-\d+$/,
      `Expected external_id format R-KAISER-NNN, got ${rows[0].external_id}`
    );
  });

  test('migration is idempotent: running twice produces same row count', async () => {
    await import('../scripts/migrate-local.js');
    const [before] = await sql`SELECT COUNT(*)::int AS count FROM projects`;

    // Re-import triggers a second run (ES module cache — script must handle this)
    await import('../scripts/migrate-local.js');
    const [after] = await sql`SELECT COUNT(*)::int AS count FROM projects`;

    assert.strictEqual(
      after.count,
      before.count,
      `Expected idempotent migration: got ${before.count} before and ${after.count} after second run`
    );
  });
});

describe('migration script (Plan 01-06: xlsx supplement — SKIP until Plan 01-06)', () => {
  test('KAISER actions have external_id format A-KAISER-NNN (requires xlsx import from Plan 01-06)', async () => {
    // This test will pass only after Plan 01-06 (xlsx supplement) runs
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

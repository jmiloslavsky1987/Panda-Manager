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
 * The migration script lives at bigpanda-app/scripts/migrate-local.ts.
 */

import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://localhost:5432/bigpanda_test';

const sql = postgres(DATABASE_URL, { max: 1, connect_timeout: 5 });

// Run migration once before all YAML import tests
describe('migration script (Plan 01-05: YAML import)', () => {
  before(async () => {
    const { runMigration } = await import('../bigpanda-app/scripts/migrate-local.js');
    await runMigration();
  });

  test('projects table has exactly 3 rows after YAML migration (KAISER, AMEX, Merck)', async () => {
    const rows = await sql`SELECT COUNT(*)::int AS count FROM projects`;
    assert.strictEqual(
      rows[0].count,
      3,
      `Expected exactly 3 projects after YAML migration, got ${rows[0].count}`
    );
  });

  test('all three expected customers exist: KAISER, AMEX, MERCK', async () => {
    const rows = await sql`SELECT customer FROM projects ORDER BY customer`;
    const customers = rows.map((r: { customer: string }) => r.customer);
    assert.ok(customers.includes('KAISER'), 'Expected KAISER project');
    assert.ok(customers.includes('AMEX'), 'Expected AMEX project');
    assert.ok(customers.includes('MERCK'), 'Expected MERCK project');
  });

  test('KAISER and AMEX projects have source_file set (source tracing)', async () => {
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

  test('MERCK is a stub project (status=active, source_file set)', async () => {
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
    const { runMigration } = await import('../bigpanda-app/scripts/migrate-local.js');
    const [before] = await sql`SELECT COUNT(*)::int AS count FROM projects`;

    await runMigration();
    const [after] = await sql`SELECT COUNT(*)::int AS count FROM projects`;

    assert.strictEqual(
      after.count,
      before.count,
      `Expected idempotent migration: got ${before.count} before and ${after.count} after second run`
    );
  });
});

describe('migration script (Plan 01-06: xlsx supplement)', () => {
  before(async () => {
    // Run xlsx import after YAML migration (importXlsx supplements YAML data)
    const { importXlsx } = await import('../bigpanda-app/scripts/migrate-local.js');
    await importXlsx();
  });

  test('KAISER actions have external_id format A-KAISER-NNN (Open Actions sheet)', async () => {
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

  test('actions table has rows with source=xlsx_open', async () => {
    const rows = await sql`SELECT COUNT(*)::int AS count FROM actions WHERE source = 'xlsx_open'`;
    assert.ok(rows[0].count >= 1, `Expected at least 1 xlsx_open action, got ${rows[0].count}`);
  });

  test('actions table has rows with source=xlsx_completed (Completed sheet)', async () => {
    const rows = await sql`SELECT COUNT(*)::int AS count FROM actions WHERE source = 'xlsx_completed'`;
    assert.ok(rows[0].count >= 1, `Expected at least 1 xlsx_completed action, got ${rows[0].count}`);
  });

  test('actions table has rows with type=question for Q-NNN IDs (Open Questions sheet)', async () => {
    const rows = await sql`SELECT COUNT(*)::int AS count FROM actions WHERE type = 'question'`;
    assert.ok(rows[0].count >= 1, `Expected at least 1 question action, got ${rows[0].count}`);
  });

  test('question actions have external_id format Q-KAISER-NNN or Q-AMEX-NNN', async () => {
    const rows = await sql`SELECT external_id FROM actions WHERE type = 'question' LIMIT 1`;
    assert.ok(rows.length >= 1, 'Expected at least one question action');
    assert.match(
      rows[0].external_id,
      /^Q-[A-Z]+-\d+$/,
      `Expected Q-CUSTOMER-NNN format, got ${rows[0].external_id}`
    );
  });

  test('risks table has rows with source=xlsx_risks (Open Risks sheet)', async () => {
    const rows = await sql`SELECT COUNT(*)::int AS count FROM risks WHERE source = 'xlsx_risks'`;
    assert.ok(rows[0].count >= 1, `Expected at least 1 xlsx_risks row, got ${rows[0].count}`);
  });

  test('no customer value Kaiser (mixed-case) exists in DB — normalized to KAISER', async () => {
    const rows = await sql`SELECT COUNT(*)::int AS count FROM projects WHERE customer = 'Kaiser'`;
    assert.strictEqual(rows[0].count, 0, 'Expected no Kaiser (mixed-case) — should be normalized to KAISER');
  });

  test('xlsx import is idempotent: running importXlsx() twice produces same row counts', async () => {
    const { importXlsx } = await import('../bigpanda-app/scripts/migrate-local.js');
    const [beforeActions] = await sql`SELECT COUNT(*)::int AS count FROM actions`;
    const [beforeRisks] = await sql`SELECT COUNT(*)::int AS count FROM risks`;

    await importXlsx();

    const [afterActions] = await sql`SELECT COUNT(*)::int AS count FROM actions`;
    const [afterRisks] = await sql`SELECT COUNT(*)::int AS count FROM risks`;

    assert.strictEqual(afterActions.count, beforeActions.count,
      `Expected idempotent import: actions ${beforeActions.count} before vs ${afterActions.count} after second run`);
    assert.strictEqual(afterRisks.count, beforeRisks.count,
      `Expected idempotent import: risks ${beforeRisks.count} before vs ${afterRisks.count} after second run`);
  });
});

process.on('exit', () => { sql.end(); });

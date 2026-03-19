/**
 * append-only.test.ts — Append-only trigger verification (GREEN after 01-02)
 * Asserts that UPDATE on engagement_history and DELETE on key_decisions
 * raise PostgreSQL-level exceptions (not application errors).
 *
 * DATA-02: Append-only enforcement via DB triggers.
 *
 * [Rule 1 - Bug fix] Corrected INSERT columns to match actual schema in
 * bigpanda-app/db/schema.ts (removed non-existent 'type' and 'recorded_at' columns).
 * Added project_id fixture setup — FK constraint requires a valid project to exist.
 * Uses SET app.current_project_id to satisfy RLS before DML operations.
 */

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://localhost:5432/bigpanda_test';

const sql = postgres(DATABASE_URL, { max: 1 });

let testProjectId: number;

before(async () => {
  // Insert a test project to satisfy FK constraints on engagement_history and key_decisions
  const [proj] = await sql`
    INSERT INTO projects (name, customer, status)
    VALUES ('Append-Only Test Project', 'TEST', 'active')
    RETURNING id
  `;
  testProjectId = proj.id;

  // Set RLS session variable so DML is allowed through RLS policy
  await sql`SELECT set_config('app.current_project_id', ${String(testProjectId)}, false)`;
});

after(async () => {
  // Clean up test data (FK cascade would handle children, but explicit cleanup is cleaner)
  if (testProjectId) {
    await sql`DELETE FROM engagement_history WHERE project_id = ${testProjectId}`;
    await sql`DELETE FROM key_decisions WHERE project_id = ${testProjectId}`;
    await sql`DELETE FROM projects WHERE id = ${testProjectId}`;
  }
  await sql.end();
});

test('UPDATE on engagement_history is rejected at DB level', async () => {
  // Insert a row using actual schema columns (date, content, source)
  const [row] = await sql`
    INSERT INTO engagement_history (project_id, date, content, source)
    VALUES (${testProjectId}, '2026-03-19', 'Initial content', 'test')
    RETURNING id
  `;

  await assert.rejects(
    async () => {
      await sql`
        UPDATE engagement_history SET content = 'modified' WHERE id = ${row.id}
      `;
    },
    (err: Error) => {
      assert.ok(
        err.message.toLowerCase().includes('append-only') ||
        err.message.toLowerCase().includes('immutable'),
        `Expected append-only error, got: ${err.message}`
      );
      return true;
    }
  );
});

test('DELETE on key_decisions is rejected at DB level', async () => {
  // Insert a row using actual schema columns (date, decision, context, source)
  const [row] = await sql`
    INSERT INTO key_decisions (project_id, decision, source)
    VALUES (${testProjectId}, 'Test decision', 'test')
    RETURNING id
  `;

  await assert.rejects(
    async () => {
      await sql`
        DELETE FROM key_decisions WHERE id = ${row.id}
      `;
    },
    (err: Error) => {
      assert.ok(
        err.message.toLowerCase().includes('append-only') ||
        err.message.toLowerCase().includes('immutable'),
        `Expected append-only error, got: ${err.message}`
      );
      return true;
    }
  );
});

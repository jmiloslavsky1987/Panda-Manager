/**
 * append-only.test.ts — Wave 0 stub (RED)
 * Asserts that UPDATE on engagement_history and DELETE on key_decisions
 * raise PostgreSQL-level exceptions (not application errors).
 *
 * DATA-02: Append-only enforcement via DB triggers.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://localhost:5432/bigpanda_test';

const sql = postgres(DATABASE_URL, { max: 1 });

test('UPDATE on engagement_history is rejected at DB level', async () => {
  // Insert a row first (will fail until schema exists — correct RED state)
  const [row] = await sql`
    INSERT INTO engagement_history (project_id, type, content, recorded_at)
    VALUES (1, 'call', 'Initial content', NOW())
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
  // Insert a row first (will fail until schema exists — correct RED state)
  const [row] = await sql`
    INSERT INTO key_decisions (project_id, decision, recorded_at)
    VALUES (1, 'Test decision', NOW())
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

process.on('exit', () => { sql.end(); });

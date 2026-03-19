/**
 * outputs.test.ts — Wave 0 stub (RED)
 * Asserts that inserting an output row:
 *   - has status='running' by default
 *   - idempotency_key is unique (duplicate insert throws)
 *
 * DATA-07: Outputs table idempotency key + status=running assertions.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://localhost:5432/bigpanda_test';

const sql = postgres(DATABASE_URL, { max: 1 });

describe('outputs table', () => {
  test('inserted output row has status=running', async () => {
    const key = `test-output-${Date.now()}`;

    const [row] = await sql`
      INSERT INTO outputs (idempotency_key, project_id, skill_name, status)
      VALUES (${key}, 1, 'test-skill', 'running')
      RETURNING status
    `;

    assert.strictEqual(row.status, 'running', `Expected status 'running', got '${row.status}'`);
  });

  test('duplicate idempotency_key throws unique constraint violation', async () => {
    const key = `test-idempotency-${Date.now()}`;

    // First insert (will fail until schema exists — correct RED state)
    await sql`
      INSERT INTO outputs (idempotency_key, project_id, skill_name, status)
      VALUES (${key}, 1, 'test-skill', 'running')
    `;

    // Second insert with same key must throw
    await assert.rejects(
      async () => {
        await sql`
          INSERT INTO outputs (idempotency_key, project_id, skill_name, status)
          VALUES (${key}, 1, 'test-skill', 'running')
        `;
      },
      (err: Error) => {
        assert.ok(
          err.message.toLowerCase().includes('unique') ||
          err.message.toLowerCase().includes('duplicate'),
          `Expected unique constraint violation, got: ${err.message}`
        );
        return true;
      }
    );
  });
});

process.on('exit', () => { sql.end(); });

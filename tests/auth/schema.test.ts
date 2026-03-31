/**
 * schema.test.ts — Verifies better-auth DB table columns via live DB introspection.
 *
 * Tests that:
 * - users.external_id is nullable (no NOT NULL constraint)
 * - users.role column default is 'user'
 * - users.active column default is true
 * - All 4 auth tables exist (users, sessions, accounts, verifications)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://localhost:5432/bigpanda_app';
let sql: ReturnType<typeof postgres>;

beforeAll(() => {
  sql = postgres(DATABASE_URL, { max: 1 });
});

afterAll(async () => {
  await sql.end();
});

describe('Auth schema tables exist', () => {
  const authTables = ['users', 'sessions', 'accounts', 'verifications'];

  authTables.forEach((tableName) => {
    it(`table "${tableName}" exists`, async () => {
      const rows = await sql`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = ${tableName}
      `;
      expect(rows.length).toBe(1);
    });
  });
});

describe('users table column constraints', () => {
  it('users.external_id is nullable (no NOT NULL constraint)', async () => {
    const rows = await sql`
      SELECT is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name = 'external_id'
    `;
    expect(rows.length).toBe(1);
    expect(rows[0].is_nullable).toBe('YES');
  });

  it('users.role column has default value "user"', async () => {
    const rows = await sql`
      SELECT column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name = 'role'
    `;
    expect(rows.length).toBe(1);
    expect(rows[0].column_default).toBe("'user'::text");
  });

  it('users.active column has default value true', async () => {
    const rows = await sql`
      SELECT column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name = 'active'
    `;
    expect(rows.length).toBe(1);
    expect(rows[0].column_default).toBe('true');
  });
});

/**
 * pool.test.ts — Singleton pool verification (GREEN after 01-02)
 * Asserts that importing bigpanda-app/db/index.ts twice returns the same db instance
 * via referential equality through globalThis.__pgConnection.
 *
 * DATA-08: Singleton pool — single connection object across all imports.
 *
 * [Rule 1 - Bug fix] Updated import path from '../db/index.js' to
 * '../bigpanda-app/db/index.js' — schema lives in bigpanda-app/db/ (plan 01-02).
 * Also updated assertion to check named export 'db' (not default) per schema.ts exports.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

test('db/index singleton: globalThis.__pgConnection is defined after import', async () => {
  // Dynamic import from bigpanda-app/db/index.ts
  await import('../bigpanda-app/db/index.js');
  assert.ok(
    (globalThis as Record<string, unknown>).__pgConnection !== undefined,
    'Expected globalThis.__pgConnection to be set after importing db/index'
  );
});

test('db/index singleton: two imports return the same reference', async () => {
  const [mod1, mod2] = await Promise.all([
    import('../bigpanda-app/db/index.js'),
    import('../bigpanda-app/db/index.js'),
  ]);

  // db named export must be the exact same object reference (module cache ensures this)
  assert.strictEqual(
    mod1.db,
    mod2.db,
    'Expected both db imports to return the identical singleton instance'
  );

  // globalThis.__pgConnection must be set (singleton pattern)
  assert.ok(
    (globalThis as Record<string, unknown>).__pgConnection !== undefined,
    'Expected globalThis.__pgConnection to be defined (singleton pattern)'
  );
});

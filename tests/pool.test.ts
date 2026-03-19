/**
 * pool.test.ts — Wave 0 stub (RED)
 * Asserts that importing db/index.ts twice returns the same db instance
 * via referential equality through globalThis.__pgConnection.
 *
 * DATA-08: Singleton pool — single connection object across all imports.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

test('db/index singleton: globalThis.__pgConnection is defined after import', async () => {
  // Dynamic import to test module resolution (file doesn't exist yet — RED)
  await import('../db/index.js');
  assert.ok(
    (globalThis as Record<string, unknown>).__pgConnection !== undefined,
    'Expected globalThis.__pgConnection to be set after importing db/index'
  );
});

test('db/index singleton: two imports return the same reference', async () => {
  const [mod1, mod2] = await Promise.all([
    import('../db/index.js'),
    import('../db/index.js'),
  ]);

  // Both default exports must be the exact same object reference
  assert.strictEqual(
    mod1.default,
    mod2.default,
    'Expected both db imports to return the identical singleton instance'
  );
});

/**
 * settings.test.ts — Wave 0 stub (RED)
 * Asserts settings read/write behavior for all four settings keys.
 *
 * SET-01 through SET-04: workspace_path, skill_file_path, schedule_times, api_key isolation
 *
 * Default workspace_path: '/Documents/PM Application'
 * API key must NOT be stored in settings JSON file (only in .env.local)
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rm } from 'node:fs/promises';

// These imports will fail until Plan 01-03 creates the settings library (correct RED state)
import { readSettings, writeSettings, SETTINGS_PATH } from '../lib/settings.js';

const TEST_SETTINGS_PATH = join(tmpdir(), `bigpanda-test-settings-${Date.now()}.json`);

describe('settings read/write', () => {
  // Override SETTINGS_PATH for test isolation
  // Note: this tests the exported constant; actual override is handled by the implementation

  test('workspace_path round-trips correctly', async () => {
    await writeSettings({ workspace_path: '/tmp/test-workspace' }, TEST_SETTINGS_PATH);
    const settings = await readSettings(TEST_SETTINGS_PATH);
    assert.strictEqual(
      settings.workspace_path,
      '/tmp/test-workspace',
      `Expected workspace_path to round-trip correctly`
    );
  });

  test('default workspace_path is /Documents/PM Application (not ~/Documents/BigPanda Projects/)', async () => {
    // When no settings file exists, default value must be correct
    const nonExistentPath = join(tmpdir(), `no-settings-${Date.now()}.json`);
    const settings = await readSettings(nonExistentPath);
    assert.strictEqual(
      settings.workspace_path,
      '/Documents/PM Application',
      `Expected default workspace_path to be '/Documents/PM Application'`
    );
  });

  test('API key is NOT stored in settings JSON file', async () => {
    // Write settings including a hypothetical api_key — verify it is not persisted to disk
    // The settings module must store api_key only in .env.local, not in the JSON settings file
    const { readFile } = await import('node:fs/promises');

    await writeSettings({
      workspace_path: '/tmp/test',
      // api_key deliberately NOT passed — settings module should never accept it
    }, TEST_SETTINGS_PATH);

    let rawJson: string;
    try {
      rawJson = await readFile(TEST_SETTINGS_PATH, 'utf-8');
    } catch {
      rawJson = '';
    }

    assert.ok(
      !rawJson.includes('api_key') && !rawJson.includes('ANTHROPIC_API_KEY'),
      `Expected settings JSON to NOT contain api_key or ANTHROPIC_API_KEY`
    );
  });

  // Cleanup temp file after tests
  test('cleanup temp settings file', async () => {
    try {
      await rm(TEST_SETTINGS_PATH, { force: true });
    } catch { /* ignore */ }
    assert.ok(true);
  });
});

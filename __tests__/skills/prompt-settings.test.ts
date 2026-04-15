import { describe, it, expect } from 'vitest';
import { readSettings, writeSettings } from '../../lib/settings-core';
import * as os from 'node:os';
import * as path from 'node:path';

describe('SKILL-03a: Prompt editing settings', () => {
  describe('Settings persistence', () => {
    it('prompt_editing_enabled persists through writeSettings/readSettings round-trip', async () => {
      // Arrange: use a temp file path to avoid polluting real settings
      const tmpPath = path.join(os.tmpdir(), `test-settings-${Date.now()}.json`);

      // Act: write prompt_editing_enabled=true, then read it back
      await writeSettings({ prompt_editing_enabled: true } as any, tmpPath);
      const settings = await readSettings(tmpPath);

      // Assert: field should persist
      expect((settings as any).prompt_editing_enabled).toBe(true);

      // Cleanup
      try {
        await import('fs/promises').then(fs => fs.unlink(tmpPath));
      } catch {
        // ignore cleanup errors
      }
    });

    it('prompt_editing_enabled defaults to false when not in settings file', async () => {
      // Arrange: use a non-existent file path
      const tmpPath = path.join(os.tmpdir(), `nonexistent-${Date.now()}.json`);

      // Act: read settings from non-existent file
      const settings = await readSettings(tmpPath);

      // Assert: default to false (undefined coerced)
      const enabled = (settings as any).prompt_editing_enabled ?? false;
      expect(enabled).toBe(false);
    });
  });

  describe('Admin guard for settings API', () => {
    it.todo('Settings POST endpoint rejects prompt_editing_enabled update when session role is not admin (expect 403)');

    it.todo('Settings POST accepts prompt_editing_enabled: true when session role is admin (expect 200)');
  });
});

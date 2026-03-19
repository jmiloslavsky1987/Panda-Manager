/**
 * settings.ts — Settings service for BigPanda Project Assistant
 *
 * Server-only: this module uses Node.js fs APIs and must not be imported in browser code.
 *
 * Storage locations:
 * - ~/.bigpanda-app/settings.json  — workspace_path, skill_path, schedule times (non-sensitive)
 * - bigpanda-app/.env.local        — ANTHROPIC_API_KEY (sensitive, gitignored)
 *
 * NEVER store api_key or ANTHROPIC_API_KEY in settings.json.
 */

import 'server-only';

import * as fs from 'node:fs';
import * as fsPromises from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

export interface AppSettings {
  workspace_path: string;
  skill_path: string;
  schedule: {
    morning_briefing: string;
    health_check: string;
    slack_sweep: string;
    tracker_weekly: string;
    weekly_status: string;
    biggy_briefing: string;
  };
}

export const SETTINGS_PATH = path.join(os.homedir(), '.bigpanda-app', 'settings.json');

const DEFAULTS: AppSettings = {
  workspace_path: '/Documents/PM Application',
  skill_path: path.join(os.homedir(), '.claude', 'get-shit-done'),
  schedule: {
    morning_briefing: '0 8 * * *',
    health_check: '0 8 * * *',
    slack_sweep: '0 9 * * *',
    tracker_weekly: '0 7 * * 1',
    weekly_status: '0 16 * * 4',
    biggy_briefing: '0 9 * * 5',
  },
};

/**
 * Read settings from the settings JSON file.
 * Returns DEFAULTS merged with any values found on disk.
 * File-not-found is handled gracefully — returns DEFAULTS.
 *
 * @param settingsPath - Optional override path (used in tests for isolation)
 */
export async function readSettings(settingsPath: string = SETTINGS_PATH): Promise<AppSettings> {
  try {
    const raw = await fsPromises.readFile(settingsPath, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    // Deep merge: schedule is nested, handle explicitly
    return {
      ...DEFAULTS,
      ...parsed,
      schedule: {
        ...DEFAULTS.schedule,
        ...(parsed.schedule ?? {}),
      },
    };
  } catch (err: unknown) {
    const nodeErr = err as NodeJS.ErrnoException;
    if (nodeErr.code === 'ENOENT') {
      return { ...DEFAULTS, schedule: { ...DEFAULTS.schedule } };
    }
    throw err;
  }
}

/**
 * Write partial settings update atomically (write-to-temp then rename).
 * Only non-sensitive fields are accepted — api_key is never written here.
 *
 * @param partial - Partial settings to merge and persist (must NOT include api_key)
 * @param settingsPath - Optional override path (used in tests for isolation)
 */
export async function writeSettings(
  partial: Partial<AppSettings>,
  settingsPath: string = SETTINGS_PATH
): Promise<void> {
  // Ensure directory exists
  const dir = path.dirname(settingsPath);
  await fsPromises.mkdir(dir, { recursive: true });

  // Read current settings and merge
  const current = await readSettings(settingsPath);
  const merged: AppSettings = {
    ...current,
    ...partial,
    schedule: {
      ...current.schedule,
      ...(partial.schedule ?? {}),
    },
  };

  // Safety: ensure api_key never makes it into the JSON
  const safe = merged as Record<string, unknown>;
  delete safe['api_key'];
  delete safe['ANTHROPIC_API_KEY'];

  const json = JSON.stringify(merged, null, 2);

  // Atomic write: write to temp file, then rename
  const tempPath = `${settingsPath}.tmp.${process.pid}`;
  await fsPromises.writeFile(tempPath, json, 'utf-8');
  fs.renameSync(tempPath, settingsPath);
}

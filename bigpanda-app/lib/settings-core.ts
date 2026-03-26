/**
 * settings-core.ts — Core settings logic without the Next.js server-only marker.
 *
 * Safe to import in worker process (Node.js, not Next.js RSC context).
 * bigpanda-app/lib/settings.ts re-exports from here + adds server-only guard.
 *
 * NEVER store api_key or ANTHROPIC_API_KEY in settings.json.
 */

import * as fs from 'node:fs';
import * as fsPromises from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

export interface MCPServerConfig {
  id: string;           // uuid — stable identifier for UI keying
  name: string;         // e.g. "glean", "slack", "gmail"
  url: string;          // e.g. "https://bigpanda-be.glean.com/mcp/default"
  apiKey: string;       // bearer token / OAuth user token
  enabled: boolean;     // soft-disable without removing
  allowedTools?: string[]; // optional allowlist; empty = all tools enabled
}

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
  mcp_servers: MCPServerConfig[];
}

export const SETTINGS_PATH = path.join(os.homedir(), '.bigpanda-app', 'settings.json');

export const DEFAULTS: AppSettings = {
  workspace_path: path.join(os.homedir(), 'Documents', 'PM Application'),
  skill_path: path.join(os.homedir(), '.claude', 'get-shit-done'),
  schedule: {
    morning_briefing: '0 8 * * *',
    health_check: '0 8 * * *',
    slack_sweep: '0 9 * * *',
    tracker_weekly: '0 7 * * 1',
    weekly_status: '0 16 * * 4',
    biggy_briefing: '0 9 * * 5',
  },
  mcp_servers: [],
};

export async function readSettings(settingsPath: string = SETTINGS_PATH): Promise<AppSettings> {
  try {
    const raw = await fsPromises.readFile(settingsPath, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    // Normalize workspace_path: if stored without homedir prefix (e.g. /Documents/...)
    // resolve it relative to os.homedir() so paths like '/Documents/PM Application'
    // expand correctly on every OS user account.
    let workspacePath = parsed.workspace_path ?? DEFAULTS.workspace_path;
    if (workspacePath && !workspacePath.startsWith(os.homedir()) && workspacePath.startsWith('/')) {
      workspacePath = path.join(os.homedir(), workspacePath);
    }
    return {
      ...DEFAULTS,
      ...parsed,
      workspace_path: workspacePath,
      schedule: {
        ...DEFAULTS.schedule,
        ...(parsed.schedule ?? {}),
      },
      mcp_servers: parsed.mcp_servers ?? DEFAULTS.mcp_servers,
    };
  } catch (err: unknown) {
    const nodeErr = err as NodeJS.ErrnoException;
    if (nodeErr.code === 'ENOENT') {
      return { ...DEFAULTS, schedule: { ...DEFAULTS.schedule } };
    }
    throw err;
  }
}

export async function writeSettings(
  partial: Partial<AppSettings>,
  settingsPath: string = SETTINGS_PATH
): Promise<void> {
  const dir = path.dirname(settingsPath);
  await fsPromises.mkdir(dir, { recursive: true });

  const current = await readSettings(settingsPath);
  const merged: AppSettings = {
    ...current,
    ...partial,
    schedule: {
      ...current.schedule,
      ...(partial.schedule ?? {}),
    },
  };

  const safe = merged as unknown as Record<string, unknown>;
  delete safe['api_key'];
  delete safe['ANTHROPIC_API_KEY'];

  const json = JSON.stringify(merged, null, 2);
  const tempPath = `${settingsPath}.tmp.${process.pid}`;
  await fsPromises.writeFile(tempPath, json, 'utf-8');
  fs.renameSync(tempPath, settingsPath);
}

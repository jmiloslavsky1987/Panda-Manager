/**
 * scripts/seed-settings.ts
 * Writes a default settings.json for Docker local installs.
 * Points workspace_path to /app/workspace (mounted as a Docker volume).
 * Idempotent — skips if settings.json already exists.
 */
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import os from 'os';

const SETTINGS_DIR = path.join(os.homedir(), '.bigpanda-app');
const SETTINGS_PATH = path.join(SETTINGS_DIR, 'settings.json');
const WORKSPACE_PATH = '/app/workspace';

if (existsSync(SETTINGS_PATH)) {
  console.log('settings.json already exists — skipping.');
  process.exit(0);
}

mkdirSync(SETTINGS_DIR, { recursive: true });
mkdirSync(WORKSPACE_PATH, { recursive: true });

const settings = {
  workspace_path: WORKSPACE_PATH,
  skill_path: '',
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

writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
console.log(`settings.json written → workspace_path: ${WORKSPACE_PATH}`);
process.exit(0);

/**
 * settings.ts — Settings service for BigPanda Project Assistant (server-only wrapper)
 *
 * API routes and RSC components import from here (unchanged — same exports).
 * Worker process imports from './settings-core' directly (no server-only boundary).
 *
 * NEVER store api_key or ANTHROPIC_API_KEY in settings.json.
 */

import 'server-only';

export {
  type AppSettings,
  SETTINGS_PATH,
  DEFAULTS,
  readSettings,
  writeSettings,
} from './settings-core';

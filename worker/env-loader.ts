/**
 * worker/env-loader.ts
 * Loads .env.local into process.env for the worker process.
 * Uses raw fs — no dotenv dependency, works regardless of dotenv API version.
 *
 * MUST be first import in worker/index.ts so env vars are set before
 * any module that reads process.env at module-load time (e.g. db/index.ts).
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';

try {
  const envPath = resolve(process.cwd(), '.env.local');
  const lines = readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    // Always overwrite — .env.local is authoritative for dev
    process.env[key] = value;
  }
  console.log('[env-loader] loaded .env.local');
} catch {
  console.warn('[env-loader] .env.local not found — relying on shell environment');
}

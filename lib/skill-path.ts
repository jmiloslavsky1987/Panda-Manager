// bigpanda-app/lib/skill-path.ts
// Shared skill-path resolution helper. Safe to import from both app/ (Next.js) and worker/ (BullMQ) contexts.

import path from 'path';
import os from 'os';

/**
 * resolveSkillsDir — Pure helper for SET-02 path resolution.
 *
 * Rules:
 *   1. If skillPath is set and absolute → use it as-is
 *   2. If skillPath is set but relative → resolve from homedir
 *   3. If skillPath is empty/whitespace → fall back to __dirname-relative path
 *
 * @param skillPath - The skill_path from settings.json
 * @param dirnameRef - Reference directory for fallback (defaults to this file's location)
 * @returns Absolute path to skills directory
 */
export function resolveSkillsDir(skillPath: string, dirnameRef: string = __dirname): string {
  const trimmed = skillPath.trim();
  if (!trimmed) {
    return path.join(dirnameRef, '../skills');
  }
  if (trimmed.startsWith('/')) {
    return trimmed;
  }
  return path.join(os.homedir(), trimmed);
}

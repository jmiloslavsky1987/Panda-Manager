import { describe, it, expect } from 'vitest';
import path from 'path';
import os from 'os';

// SET-02: Test the resolveSkillsDir pure helper extracted from skill-run.ts.
// This approach avoids mocking the entire dependency chain (db, BullMQ, MCP, etc.)
// while still verifying the path-resolution logic directly.

import { resolveSkillsDir } from '../worker/jobs/skill-run';

describe('skill-run SET-02: skill_path resolution', () => {
  it('SET-02: uses settings.skill_path when set and absolute', () => {
    const result = resolveSkillsDir('/custom/skills');
    expect(result).toBe('/custom/skills');
  });

  it('SET-02: falls back to __dirname-relative path when skill_path is empty', () => {
    const fakeDir = '/fake/worker/jobs';
    const result = resolveSkillsDir('', fakeDir);
    // Should resolve to /fake/worker/jobs/../../skills = /fake/skills
    expect(result).toBe(path.join(fakeDir, '../../skills'));
    // The resolved path always ends with /skills
    expect(result.endsWith('/skills')).toBe(true);
  });
});

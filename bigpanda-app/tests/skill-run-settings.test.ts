import { describe, it, expect, vi, beforeEach } from 'vitest';

// Wave 0 RED stubs — SET-02: skill_path resolution in skill-run.ts
// These tests fail immediately until plan 10-02 activates them.
// Pattern: expect(false, 'stub').toBe(true) as FIRST assertion — visibly RED.

describe('skill-run SET-02: skill_path resolution', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('SET-02: uses settings.skill_path when set and absolute', () => {
    expect(false, 'stub').toBe(true);
  });

  it('SET-02: falls back to __dirname-relative path when skill_path is empty', () => {
    expect(false, 'stub').toBe(true);
  });
});

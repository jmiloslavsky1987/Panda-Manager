import { describe, it } from 'vitest';

/**
 * SKILL-03b: Prompt read/write API stubs (RED phase)
 *
 * These tests define the contract for GET/PATCH endpoints at:
 * /api/skills/[skillName]/prompt
 *
 * Implementation will be added in GREEN phase (64-02).
 */

describe('GET /api/skills/[skillName]/prompt', () => {
  it.todo('returns { frontMatter: string, body: string } split at second --- delimiter');
});

describe('PATCH /api/skills/[skillName]/prompt', () => {
  it.todo('writes atomically and returns { ok: true } when given valid body');

  it.todo('rejects with 422/400 when Design Standard validation fails on reassembled file');

  it.todo('rejects with 403 when session is not admin');
});

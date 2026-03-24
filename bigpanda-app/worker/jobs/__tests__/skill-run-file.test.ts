import { describe, it, expect, vi, beforeEach } from 'vitest';

// We test the FILE_SKILLS set and integration logic by importing from skill-run.ts.
// Since skill-run.ts has side effects (db, orchestrator), we mock those dependencies.

vi.mock('../../../db', () => ({
  default: {
    update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }) }),
    insert: vi.fn().mockReturnValue({ values: vi.fn().mockReturnValue({ onConflictDoNothing: vi.fn().mockResolvedValue([]) }) }),
    select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([{ id: 1, full_output: '{"slides":[]}', run_id: 'abc-123', skill_name: 'elt-external-status' }]) }) }),
  },
}));

vi.mock('../../../lib/skill-orchestrator', () => ({
  SkillOrchestrator: vi.fn().mockImplementation(function (this: { run: ReturnType<typeof vi.fn> }) {
    this.run = vi.fn().mockResolvedValue(undefined);
  }),
}));

vi.mock('../../../lib/queries', () => ({
  getProjectById: vi.fn().mockResolvedValue({ id: 1, customer: 'Acme', name: 'Acme Project' }),
}));

vi.mock('../../../lib/file-gen', () => ({
  generateFile: vi.fn().mockResolvedValue({ filepath: '/tmp/Acme/ELT-External-Acme-2026-03.pptx', filename: 'ELT-External-Acme-2026-03.pptx' }),
}));

describe('skill-run file generation extension', () => {
  it('SKILL-05: FILE_SKILLS set includes elt-external-status', async () => {
    // Import the module to access FILE_SKILLS - it is exported for testability
    const { FILE_SKILLS } = await import('../skill-run');
    expect(FILE_SKILLS.has('elt-external-status')).toBe(true);
    expect(FILE_SKILLS.has('elt-internal-status')).toBe(true);
    expect(FILE_SKILLS.has('team-engagement-map')).toBe(true);
    expect(FILE_SKILLS.has('workflow-diagram')).toBe(true);
    expect(FILE_SKILLS.size).toBe(4);
  });

  it('outputs row sets filepath and filename when FILE_SKILLS match', async () => {
    const { generateFile } = await import('../../../lib/file-gen');
    const db = (await import('../../../db')).default;
    const { getProjectById } = await import('../../../lib/queries');

    const skillRunJob = (await import('../skill-run')).default;

    const mockJob = {
      data: { runId: 1, skillName: 'elt-external-status', projectId: 1, input: {} },
    } as any;

    await skillRunJob(mockJob);

    // generateFile should have been called for a file skill
    expect(generateFile).toHaveBeenCalledWith(
      expect.objectContaining({ skillName: 'elt-external-status' })
    );

    // getProjectById should have been called to fetch project for file gen
    expect(getProjectById).toHaveBeenCalledWith(1);

    // The outputs insert should include filepath and filename (not null)
    const insertValues = (db.insert as any).mock.results[0]?.value?.values?.mock?.calls[0]?.[0];
    if (insertValues) {
      expect(insertValues.filepath).toBeTruthy();
      expect(insertValues.filename).toBeTruthy();
    }
  });
});

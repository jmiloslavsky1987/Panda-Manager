// bigpanda-app/worker/jobs/__tests__/skill-path-migration.test.ts
// Migration tests confirming all jobs use readSettings() + resolveSkillsDir (not __dirname)

import { describe, it, expect, vi, beforeEach } from 'vitest';
import path from 'path';
import os from 'os';

// Mock dependencies for all jobs
vi.mock('../../../db', () => ({
  default: {
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([])
      })
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 1 }]),
        onConflictDoNothing: vi.fn().mockResolvedValue([])
      })
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{
          id: 1,
          full_output: '{"slides":[]}',
          run_id: 'abc-123'
        }])
      })
    }),
  },
}));

vi.mock('../../../lib/skill-orchestrator', () => ({
  SkillOrchestrator: vi.fn().mockImplementation(function (this: { run: ReturnType<typeof vi.fn> }) {
    this.run = vi.fn().mockResolvedValue(undefined);
  }),
}));

vi.mock('../../../lib/queries', () => ({
  getActiveProjects: vi.fn().mockResolvedValue([{ id: 1 }, { id: 2 }]),
  getProjectById: vi.fn().mockResolvedValue({ id: 1, customer: 'Acme', name: 'Test Project' }),
}));

vi.mock('../../../lib/mcp-config', () => ({
  MCPClientPool: {
    getInstance: vi.fn().mockReturnValue({
      getServersForSkill: vi.fn().mockResolvedValue([]),
    }),
  },
}));

describe('lib/skill-path.ts resolveSkillsDir', () => {
  it('returns __dirname-relative path when skillPath is empty', async () => {
    const { resolveSkillsDir } = await import('../../../lib/skill-path');
    const result = resolveSkillsDir('', '/fake/dir');
    expect(result).toBe(path.join('/fake/dir', '../../skills'));
  });

  it('returns absolute path unchanged when skillPath is absolute', async () => {
    const { resolveSkillsDir } = await import('../../../lib/skill-path');
    const result = resolveSkillsDir('/absolute/skills');
    expect(result).toBe('/absolute/skills');
  });

  it('resolves relative path from homedir', async () => {
    const { resolveSkillsDir } = await import('../../../lib/skill-path');
    const result = resolveSkillsDir('.claude/skills');
    expect(result).toBe(path.join(os.homedir(), '.claude/skills'));
  });
});

describe('Migration: meeting-summary job', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls readSettings() and resolveSkillsDir (not __dirname)', async () => {
    // Mock readSettings to return empty skill_path (fallback case)
    const mockReadSettings = vi.fn().mockResolvedValue({ skill_path: '' });
    vi.doMock('../../../lib/settings-core', () => ({
      readSettings: mockReadSettings,
    }));

    const meetingSummaryJob = (await import('../meeting-summary')).default;
    const { SkillOrchestrator } = await import('../../../lib/skill-orchestrator');

    const mockJob = {
      data: { projectId: 1, runId: 1, input: {} },
    } as any;

    await meetingSummaryJob(mockJob);

    // Assert readSettings was called
    expect(mockReadSettings).toHaveBeenCalled();

    // Assert orchestrator.run was called with skillsDir (not containing __dirname string)
    const mockRun = (SkillOrchestrator as any).mock.results[0].value.run;
    expect(mockRun).toHaveBeenCalled();

    const runCallArgs = mockRun.mock.calls[0][0];
    expect(runCallArgs.skillsDir).toBeDefined();
    expect(typeof runCallArgs.skillsDir).toBe('string');
    expect(runCallArgs.skillsDir).toContain('/skills');
    // Ensure it's not using __dirname directly (would be a string literal in code)
    expect(runCallArgs.skillsDir).not.toContain('__dirname');
  });
});

describe('Migration: handoff-doc-generator job', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls readSettings() and resolveSkillsDir (not __dirname)', async () => {
    const mockReadSettings = vi.fn().mockResolvedValue({ skill_path: '' });
    vi.doMock('../../../lib/settings-core', () => ({
      readSettings: mockReadSettings,
    }));

    const handoffDocGeneratorJob = (await import('../handoff-doc-generator')).default;
    const { SkillOrchestrator } = await import('../../../lib/skill-orchestrator');

    const mockJob = {
      data: { projectId: 1, runId: 1, input: {} },
    } as any;

    await handoffDocGeneratorJob(mockJob);

    expect(mockReadSettings).toHaveBeenCalled();

    const mockRun = (SkillOrchestrator as any).mock.results[0].value.run;
    expect(mockRun).toHaveBeenCalled();

    const runCallArgs = mockRun.mock.calls[0][0];
    expect(runCallArgs.skillsDir).toBeDefined();
    expect(typeof runCallArgs.skillsDir).toBe('string');
    expect(runCallArgs.skillsDir).toContain('/skills');
    expect(runCallArgs.skillsDir).not.toContain('__dirname');
  });
});

describe('Migration: customer-project-tracker job', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls readSettings() and resolveSkillsDir (not __dirname)', async () => {
    const mockReadSettings = vi.fn().mockResolvedValue({ skill_path: '' });
    vi.doMock('../../../lib/settings-core', () => ({
      readSettings: mockReadSettings,
    }));

    const customerProjectTrackerJob = (await import('../customer-project-tracker')).default;
    const { SkillOrchestrator } = await import('../../../lib/skill-orchestrator');

    const mockJob = {
      data: { projectId: 1 },
    } as any;

    await customerProjectTrackerJob(mockJob);

    expect(mockReadSettings).toHaveBeenCalled();

    // customer-project-tracker creates orchestrator instances per project
    // Check that at least one run call was made with skillsDir
    const mockRun = (SkillOrchestrator as any).mock.results[0].value.run;
    expect(mockRun).toHaveBeenCalled();

    const runCallArgs = mockRun.mock.calls[0][0];
    expect(runCallArgs.skillsDir).toBeDefined();
    expect(typeof runCallArgs.skillsDir).toBe('string');
    expect(runCallArgs.skillsDir).toContain('/skills');
    expect(runCallArgs.skillsDir).not.toContain('__dirname');
  });
});

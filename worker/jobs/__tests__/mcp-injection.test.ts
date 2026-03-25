import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Module mocks — must be at top level so vitest can hoist them.
// Pattern follows skill-run-file.test.ts exactly.
// ---------------------------------------------------------------------------

vi.mock('../../../db', () => ({
  default: {
    update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }) }),
    // insert supports both .returning() (scheduled handlers) and .onConflictDoNothing() (outputs insert)
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 1 }]),
        onConflictDoNothing: vi.fn().mockResolvedValue([]),
      }),
    }),
    select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([{ id: 1, full_output: 'output text', run_id: 'abc-123' }]) }) }),
    execute: vi.fn().mockResolvedValue([{ acquired: true }]),  // needed by context-updater advisory lock
  },
}));

vi.mock('../../../lib/skill-orchestrator', () => ({
  SkillOrchestrator: vi.fn().mockImplementation(function (this: { run: ReturnType<typeof vi.fn> }) {
    this.run = vi.fn().mockResolvedValue(undefined);
  }),
}));

vi.mock('../../../lib/queries', () => ({
  getActiveProjects: vi.fn().mockResolvedValue([{ id: 1 }]),
  getProjectById: vi.fn().mockResolvedValue({ id: 1, customer: 'Acme', name: 'Acme Project' }),
}));

vi.mock('../../../lib/file-gen', () => ({
  generateFile: vi.fn().mockResolvedValue({ filepath: '/tmp/test.pptx', filename: 'test.pptx' }),
}));

// MCPClientPool mock — new for Phase 9
vi.mock('../../../lib/mcp-config', () => ({
  MCPClientPool: {
    getInstance: vi.fn().mockReturnValue({
      getServersForSkill: vi.fn().mockResolvedValue([]),
    }),
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get the mocked getServersForSkill spy from MCPClientPool singleton. */
async function getMockGetServers() {
  const { MCPClientPool } = await import('../../../lib/mcp-config');
  return MCPClientPool.getInstance().getServersForSkill as ReturnType<typeof vi.fn>;
}

/** Get the mocked SkillOrchestrator instance's run spy.
 *  SkillOrchestrator is mocked as a constructor — each `new SkillOrchestrator()`
 *  returns an object with `this.run` set. The mock implementation captures each
 *  instance via mock.instances. We use the first instance created per module.
 */
async function getMockOrchestratorRun() {
  const { SkillOrchestrator } = await import('../../../lib/skill-orchestrator');
  const MockClass = SkillOrchestrator as unknown as ReturnType<typeof vi.fn>;
  // The constructor mock stores instances; get the most recently created one.
  const instances = MockClass.mock.instances;
  const latest = instances[instances.length - 1] as { run: ReturnType<typeof vi.fn> };
  return latest?.run;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MCP injection — all skill job handlers', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // SKILL-11: morning-briefing handler
  // -------------------------------------------------------------------------
  it('SKILL-11: morning-briefing calls getServersForSkill and passes mcpServers to orchestrator.run()', async () => {
    const mockGetServers = await getMockGetServers();

    const morningBriefingJob = (await import('../morning-briefing')).default;
    await morningBriefingJob({ data: { projectId: 1 } } as any);

    // MCPClientPool.getInstance().getServersForSkill must be called with the correct skill name
    expect(mockGetServers).toHaveBeenCalledWith('morning-briefing');

    // orchestrator.run() must receive mcpServers in its argument
    const mockRun = await getMockOrchestratorRun();
    expect(mockRun).toHaveBeenCalledWith(
      expect.objectContaining({ mcpServers: expect.any(Array) })
    );
  });

  // -------------------------------------------------------------------------
  // SKILL-12: context-updater handler
  // -------------------------------------------------------------------------
  it('SKILL-12: context-updater calls getServersForSkill and passes mcpServers to orchestrator.run()', async () => {
    const mockGetServers = await getMockGetServers();

    const contextUpdaterJob = (await import('../context-updater')).default;
    await contextUpdaterJob({ data: { projectId: 1 } } as any);

    expect(mockGetServers).toHaveBeenCalledWith('context-updater');

    const mockRun = await getMockOrchestratorRun();
    expect(mockRun).toHaveBeenCalledWith(
      expect.objectContaining({ mcpServers: expect.any(Array) })
    );
  });

  // -------------------------------------------------------------------------
  // SKILL-03: weekly-customer-status handler
  // -------------------------------------------------------------------------
  it('SKILL-03: weekly-customer-status calls getServersForSkill and passes mcpServers to orchestrator.run()', async () => {
    const mockGetServers = await getMockGetServers();

    const weeklyCustomerStatusJob = (await import('../weekly-customer-status')).default;
    await weeklyCustomerStatusJob({ data: { projectId: 1 } } as any);

    expect(mockGetServers).toHaveBeenCalledWith('weekly-customer-status');

    const mockRun = await getMockOrchestratorRun();
    expect(mockRun).toHaveBeenCalledWith(
      expect.objectContaining({ mcpServers: expect.any(Array) })
    );
  });

  // -------------------------------------------------------------------------
  // SKILL-01/SKILL-04: skill-run generic handler (dynamic skillName)
  // -------------------------------------------------------------------------
  it('SKILL-01/SKILL-04: skill-run calls getServersForSkill(skillName) dynamically and passes mcpServers to orchestrator.run()', async () => {
    const mockGetServers = await getMockGetServers();

    const skillRunJob = (await import('../skill-run')).default;
    await skillRunJob({
      data: { runId: 1, skillName: 'context-updater', projectId: 1 },
    } as any);

    // Must use the dynamic skillName from job.data — not a hardcoded string
    expect(mockGetServers).toHaveBeenCalledWith('context-updater');

    const mockRun = await getMockOrchestratorRun();
    expect(mockRun).toHaveBeenCalledWith(
      expect.objectContaining({ mcpServers: expect.any(Array) })
    );
  });

  // -------------------------------------------------------------------------
  // Non-MCP regression: handoff-doc-generator via skill-run
  // -------------------------------------------------------------------------
  it('non-MCP regression: handoff-doc-generator still runs via skill-run (mcpServers: [] is the correct non-MCP path)', async () => {
    const mockGetServers = await getMockGetServers();

    const skillRunJob = (await import('../skill-run')).default;
    await skillRunJob({
      data: { runId: 1, skillName: 'handoff-doc-generator', projectId: 1 },
    } as any);

    // getServersForSkill is still called — it returns [] for non-MCP skills
    expect(mockGetServers).toHaveBeenCalledWith('handoff-doc-generator');

    // orchestrator.run() is still called (no gate) — empty mcpServers is the non-MCP path
    const mockRun = await getMockOrchestratorRun();
    expect(mockRun).toHaveBeenCalledWith(
      expect.objectContaining({ mcpServers: expect.any(Array) })
    );
  });
});

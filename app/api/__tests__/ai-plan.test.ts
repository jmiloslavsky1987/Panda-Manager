import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks — must be declared before imports that load the modules
// ---------------------------------------------------------------------------

// Mock DB so no real Postgres connection is required
vi.mock('@/db', () => ({
  default: {
    insert: vi.fn(),
    select: vi.fn(),
    update: vi.fn(),
  },
}));

// Mock SkillOrchestrator as a real class so `new SkillOrchestrator()` works
vi.mock('@/lib/skill-orchestrator', () => {
  return {
    SkillOrchestrator: class MockSkillOrchestrator {
      async run() {
        return undefined;
      }
    },
  };
});

import db from '@/db';
import { POST } from '../projects/[projectId]/generate-plan/route';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildRequest(projectId: string) {
  return new NextRequest(`http://localhost/api/projects/${projectId}/generate-plan`, {
    method: 'POST',
  });
}

const MOCK_TASKS = [
  {
    title: 'Configure SNMP integration',
    description: 'Set up SNMP poller for Prod-1 host group',
    priority: 'high',
    type: 'technical',
    phase: 'Build',
    due: '2026-04-07',
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('generate-plan API route', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // DB mock chain: insert().values().returning() -> run row
    const mockReturning = vi.fn().mockResolvedValue([{ id: 42, run_id: 'test-uuid', skill_name: 'ai-plan-generator' }]);
    const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
    (db.insert as ReturnType<typeof vi.fn>).mockReturnValue({ values: mockValues });

    // DB mock: select().from().where() -> completed run with JSON output
    const mockWhere = vi.fn().mockResolvedValue([
      { id: 42, full_output: JSON.stringify({ tasks: MOCK_TASKS }) },
    ]);
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockFrom });

    // DB mock: update().set().where() -> no-op
    const mockUpdateWhere = vi.fn().mockResolvedValue([]);
    const mockSet = vi.fn().mockReturnValue({ where: mockUpdateWhere });
    (db.update as ReturnType<typeof vi.fn>).mockReturnValue({ set: mockSet });
  });

  it('PLAN-12: POST /api/projects/[id]/generate-plan returns 200 with tasks array', async () => {
    const req = buildRequest('1');
    const res = await POST(req, { params: Promise.resolve({ projectId: '1' }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toHaveProperty('tasks');
    expect(Array.isArray(body.tasks)).toBe(true);
    expect(body.tasks).toHaveLength(1);
    expect(body.tasks[0].title).toBe('Configure SNMP integration');
    expect(body.tasks[0].priority).toBe('high');
  });

  it('proposed tasks are not written to DB until commit', async () => {
    const req = buildRequest('1');
    await POST(req, { params: Promise.resolve({ projectId: '1' }) });

    // The route must NOT insert into the tasks table — only into skill_runs
    // db.insert is called once (for skill_runs), never for tasks table
    const insertMock = db.insert as ReturnType<typeof vi.fn>;
    expect(insertMock).toHaveBeenCalledTimes(1);

    // Verify the single insert was into skillRuns (not tasks)
    const { skillRuns } = await import('@/db/schema');
    expect(insertMock).toHaveBeenCalledWith(skillRuns);
  });
});

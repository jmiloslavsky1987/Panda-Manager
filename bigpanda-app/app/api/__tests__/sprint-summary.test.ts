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
import { GET, POST } from '../projects/[projectId]/sprint-summary/route';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildGetRequest(projectId: string) {
  return new NextRequest(`http://localhost/api/projects/${projectId}/sprint-summary`, {
    method: 'GET',
  });
}

function buildPostRequest(projectId: string) {
  return new NextRequest(`http://localhost/api/projects/${projectId}/sprint-summary`, {
    method: 'POST',
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('sprint-summary API route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('PLAN-13: GET /api/projects/[id]/sprint-summary returns stored text or empty', async () => {
    // DB mock: select().from().where() -> project row with stored summary
    const mockWhere = vi.fn().mockResolvedValue([
      { sprint_summary: 'Last week we completed X. This week we focus on Y.', sprint_summary_at: new Date('2026-03-20T10:00:00Z') },
    ]);
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockFrom });

    const req = buildGetRequest('1');
    const res = await GET(req, { params: Promise.resolve({ projectId: '1' }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toHaveProperty('summary');
    expect(body).toHaveProperty('generated_at');
    expect(body.summary).toBe('Last week we completed X. This week we focus on Y.');
  });

  it('GET returns null summary when no summary has been generated yet', async () => {
    // DB mock: project row with null sprint_summary
    const mockWhere = vi.fn().mockResolvedValue([
      { sprint_summary: null, sprint_summary_at: null },
    ]);
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockFrom });

    const req = buildGetRequest('2');
    const res = await GET(req, { params: Promise.resolve({ projectId: '2' }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.summary).toBeNull();
    expect(body.generated_at).toBeNull();
  });

  it('POST /api/projects/[id]/sprint-summary triggers new Claude call and stores result', async () => {
    const SUMMARY_TEXT = 'Generated sprint summary text from Claude.';

    // DB mock chain: insert().values().returning() -> skill_run row
    const mockReturning = vi.fn().mockResolvedValue([{ id: 99, run_id: 'test-uuid', skill_name: 'sprint-summary-generator' }]);
    const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
    (db.insert as ReturnType<typeof vi.fn>).mockReturnValue({ values: mockValues });

    // DB mock: select().from().where() -> completed run with full_output
    const mockWhere = vi.fn().mockResolvedValue([
      { id: 99, full_output: SUMMARY_TEXT },
    ]);
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockFrom });

    // DB mock: update().set().where() -> no-op (called twice: projects + skill_runs)
    const mockUpdateWhere = vi.fn().mockResolvedValue([]);
    const mockSet = vi.fn().mockReturnValue({ where: mockUpdateWhere });
    (db.update as ReturnType<typeof vi.fn>).mockReturnValue({ set: mockSet });

    const req = buildPostRequest('1');
    const res = await POST(req, { params: Promise.resolve({ projectId: '1' }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toHaveProperty('summary');
    expect(body.summary).toBe(SUMMARY_TEXT);
    expect(body).toHaveProperty('generated_at');

    // Verify insert was called for skill_runs (not outputs table — PLAN-13)
    const insertMock = db.insert as ReturnType<typeof vi.fn>;
    expect(insertMock).toHaveBeenCalledTimes(1);
    const { skillRuns } = await import('@/db/schema');
    expect(insertMock).toHaveBeenCalledWith(skillRuns);

    // Verify update was called twice (projects + skill_runs)
    const updateMock = db.update as ReturnType<typeof vi.fn>;
    expect(updateMock).toHaveBeenCalledTimes(2);
    const { projects } = await import('@/db/schema');
    expect(updateMock).toHaveBeenCalledWith(projects);
    expect(updateMock).toHaveBeenCalledWith(skillRuns);
  });
});

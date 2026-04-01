import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildChatContext } from '@/lib/chat-context-builder';
import { getProjectById, getWorkspaceData } from '@/lib/queries';

// Mock queries module to avoid DB connection in tests
vi.mock('@/lib/queries', () => ({
  getProjectById: vi.fn(),
  getWorkspaceData: vi.fn(),
}));

describe('chat-context-builder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getProjectById).mockResolvedValue({
      id: 1,
      name: 'Test Project',
      customer: 'Test Customer',
      overall_status: 'On Track',
      go_live_target: '2026-06-01',
      status_summary: 'All systems go',
    });
    vi.mocked(getWorkspaceData).mockResolvedValue({
      actions: [
        { external_id: 'A-12345-001', description: 'Test action', owner: 'John', due: '2026-04-15', status: 'open' },
        { external_id: 'A-12345-002', description: 'Completed action', owner: 'Jane', due: '2026-04-10', status: 'completed' },
      ],
      risks: [
        { external_id: 'R-12345-001', description: 'Test risk', severity: 'High', mitigation: 'Monitor closely', status: 'open' },
      ],
      milestones: [
        { external_id: 'M-12345-001', name: 'Go-Live', status: 'on-track', target: '2026-06-01', date: null },
      ],
      stakeholders: [
        { name: 'Bob Smith', role: 'PM', company: 'Test Corp' },
      ],
      workstreams: [
        { name: 'Development', track: 'Tech', current_status: 'In Progress', percent_complete: 75 },
      ],
      keyDecisions: [
        { date: '2026-03-15', decision: 'Chose tech stack' },
      ],
      engagementHistory: [
        { date: '2026-03-20', content: 'Weekly sync call' },
      ],
      artifacts: [],
    });
  });

  describe('CHAT-01: Basic context generation', () => {
    it('returns a non-empty string', async () => {
      const result = await buildChatContext(1);
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('context string contains project name', async () => {
      const result = await buildChatContext(1);
      expect(result).toContain('Test Project');
    });
  });

  describe('CHAT-02: Grounding requirements', () => {
    it('context string contains open action count as a number', async () => {
      const result = await buildChatContext(1);
      const match = result.match(/Open Actions.*?\((\d+)/);
      expect(match).toBeTruthy();
      expect(Number(match![1])).toBe(1);
    });

    it('context string includes record IDs in the format [LETTER-XXXXX-NNN]', async () => {
      const result = await buildChatContext(1);
      const idPattern = /\[[ARM]-\d{5}-\d{3}\]/;
      expect(idPattern.test(result)).toBe(true);
    });

    it('all DB queries filter by projectId - no cross-project leakage', async () => {
      await buildChatContext(123);
      expect(getProjectById).toHaveBeenCalledWith(123);
      expect(getWorkspaceData).toHaveBeenCalledWith(123);
    });
  });
});

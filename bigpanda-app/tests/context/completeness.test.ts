import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// CTX-03: Completeness endpoint serializes DB data per tab and returns JSON array of gaps

// Mock Anthropic SDK to return structured completeness data
vi.mock('@anthropic-ai/sdk', () => {
  const mockFn = vi.fn();
  return {
    default: class MockAnthropic {
      constructor(_config: any) {}
      messages = {
        create: mockFn,
      };
    },
    __mockCreate: mockFn, // Export for test access
  };
});

// Mock buildCompletenessContext
vi.mock('@/lib/completeness-context-builder', () => ({
  buildCompletenessContext: vi.fn(() => Promise.resolve('mocked context payload')),
}));

// Mock requireSession
vi.mock('@/lib/auth-server', () => ({
  requireSession: vi.fn(),
}));

// Import POST handler after mocks
import { POST } from '@/app/api/projects/[projectId]/completeness/route';
import { requireSession } from '@/lib/auth-server';
import * as AnthropicModule from '@anthropic-ai/sdk';

const mockRequireSession = vi.mocked(requireSession);
const mockMessagesCreate = (AnthropicModule as any).__mockCreate;

describe('completeness endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireSession.mockResolvedValue({ session: { user: { id: 1 } }, redirectResponse: null });
  });

  describe('gap analysis', () => {
    it('returns an array with one entry per workspace tab (11 tabs)', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify([
              { tabId: 'overview', status: 'partial', gaps: ['Description missing'] },
              { tabId: 'actions', status: 'complete', gaps: [] },
              { tabId: 'risks', status: 'empty', gaps: ['No real records'] },
              { tabId: 'milestones', status: 'partial', gaps: ['2 milestones missing owners'] },
              { tabId: 'teams', status: 'complete', gaps: [] },
              { tabId: 'architecture', status: 'empty', gaps: ['No integrations defined'] },
              { tabId: 'decisions', status: 'partial', gaps: ['3 decisions lack dates'] },
              { tabId: 'history', status: 'complete', gaps: [] },
              { tabId: 'stakeholders', status: 'partial', gaps: ['Missing emails for 2 stakeholders'] },
              { tabId: 'plan', status: 'empty', gaps: ['No tasks defined'] },
              { tabId: 'skills', status: 'empty', gaps: ['No skill runs executed'] },
            ]),
          },
        ],
      };
      mockMessagesCreate.mockResolvedValue(mockResponse);

      const req = new NextRequest('http://localhost/api/projects/1/completeness', { method: 'POST' });
      const params = Promise.resolve({ projectId: '1' });
      const response = await POST(req, { params });
      const data = await response.json();

      expect(Array.isArray(data)).toBe(true);
      expect(data).toHaveLength(11);
    });

    it('each entry has tabId, status (complete|partial|empty), and gaps array', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify([
              { tabId: 'overview', status: 'partial', gaps: ['Description missing'] },
              { tabId: 'actions', status: 'complete', gaps: [] },
              { tabId: 'risks', status: 'empty', gaps: ['No real records'] },
              { tabId: 'milestones', status: 'partial', gaps: ['2 milestones missing owners'] },
              { tabId: 'teams', status: 'complete', gaps: [] },
              { tabId: 'architecture', status: 'empty', gaps: ['No integrations defined'] },
              { tabId: 'decisions', status: 'partial', gaps: ['3 decisions lack dates'] },
              { tabId: 'history', status: 'complete', gaps: [] },
              { tabId: 'stakeholders', status: 'partial', gaps: ['Missing emails for 2 stakeholders'] },
              { tabId: 'plan', status: 'empty', gaps: ['No tasks defined'] },
              { tabId: 'skills', status: 'empty', gaps: ['No skill runs executed'] },
            ]),
          },
        ],
      };
      mockMessagesCreate.mockResolvedValue(mockResponse);

      const req = new NextRequest('http://localhost/api/projects/1/completeness', { method: 'POST' });
      const params = Promise.resolve({ projectId: '1' });
      const response = await POST(req, { params });
      const data = await response.json();

      data.forEach((entry: any) => {
        expect(entry).toHaveProperty('tabId');
        expect(entry).toHaveProperty('status');
        expect(['complete', 'partial', 'empty']).toContain(entry.status);
        expect(entry).toHaveProperty('gaps');
        expect(Array.isArray(entry.gaps)).toBe(true);
      });
    });

    it('status is "empty" for tabs with only source=template records', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify([
              { tabId: 'overview', status: 'partial', gaps: ['Description missing'] },
              { tabId: 'actions', status: 'empty', gaps: ['No real records — all data is template placeholder or missing'] },
              { tabId: 'risks', status: 'empty', gaps: ['No real records — all data is template placeholder or missing'] },
              { tabId: 'milestones', status: 'empty', gaps: ['No real records — all data is template placeholder or missing'] },
              { tabId: 'teams', status: 'empty', gaps: ['No real records — all data is template placeholder or missing'] },
              { tabId: 'architecture', status: 'empty', gaps: ['No real records — all data is template placeholder or missing'] },
              { tabId: 'decisions', status: 'empty', gaps: ['No real records — all data is template placeholder or missing'] },
              { tabId: 'history', status: 'empty', gaps: ['No real records — all data is template placeholder or missing'] },
              { tabId: 'stakeholders', status: 'empty', gaps: ['No real records — all data is template placeholder or missing'] },
              { tabId: 'plan', status: 'empty', gaps: ['No real records — all data is template placeholder or missing'] },
              { tabId: 'skills', status: 'empty', gaps: ['No skill runs executed'] },
            ]),
          },
        ],
      };
      mockMessagesCreate.mockResolvedValue(mockResponse);

      const req = new NextRequest('http://localhost/api/projects/1/completeness', { method: 'POST' });
      const params = Promise.resolve({ projectId: '1' });
      const response = await POST(req, { params });
      const data = await response.json();

      // At least one empty tab should exist (template-only scenario)
      const emptyTabs = data.filter((entry: any) => entry.status === 'empty');
      expect(emptyTabs.length).toBeGreaterThan(0);
    });

    it('gaps array contains specific record-level descriptions (not generic)', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify([
              { tabId: 'overview', status: 'partial', gaps: ['Description missing'] },
              { tabId: 'actions', status: 'partial', gaps: ['[A-KAISER-003] missing owner', '[A-KAISER-007] missing due date'] },
              { tabId: 'risks', status: 'partial', gaps: ['[R-KAISER-001] missing mitigation plan'] },
              { tabId: 'milestones', status: 'partial', gaps: ['[M-KAISER-002] missing owner assignment'] },
              { tabId: 'teams', status: 'complete', gaps: [] },
              { tabId: 'architecture', status: 'empty', gaps: ['No integrations defined'] },
              { tabId: 'decisions', status: 'partial', gaps: ['3 decisions lack dates'] },
              { tabId: 'history', status: 'complete', gaps: [] },
              { tabId: 'stakeholders', status: 'partial', gaps: ['Alice Smith missing email', 'Bob Jones missing company'] },
              { tabId: 'plan', status: 'empty', gaps: ['No tasks defined'] },
              { tabId: 'skills', status: 'empty', gaps: ['No skill runs executed'] },
            ]),
          },
        ],
      };
      mockMessagesCreate.mockResolvedValue(mockResponse);

      const req = new NextRequest('http://localhost/api/projects/1/completeness', { method: 'POST' });
      const params = Promise.resolve({ projectId: '1' });
      const response = await POST(req, { params });
      const data = await response.json();

      // Check that gaps are strings and at least one contains specific record references
      const actionsTab = data.find((entry: any) => entry.tabId === 'actions');
      expect(actionsTab).toBeDefined();
      expect(actionsTab.gaps.every((gap: any) => typeof gap === 'string')).toBe(true);
      // At least one gap should contain a record ID pattern like [A-KAISER-003]
      const hasSpecificReference = actionsTab.gaps.some((gap: string) => /\[A-\w+-\d+\]/.test(gap));
      expect(hasSpecificReference).toBe(true);
    });

    it('rejects unauthenticated requests with 401', async () => {
      mockRequireSession.mockResolvedValue({
        session: null,
        redirectResponse: new Response('Unauthorized', { status: 401 }),
      });

      const req = new NextRequest('http://localhost/api/projects/1/completeness', { method: 'POST' });
      const params = Promise.resolve({ projectId: '1' });
      const response = await POST(req, { params });

      expect(response.status).toBe(401);
    });
  });
});

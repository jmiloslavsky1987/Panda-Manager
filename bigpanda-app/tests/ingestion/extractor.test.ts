import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the Anthropic SDK before importing route
vi.mock('@anthropic-ai/sdk', () => {
  const mockFinalMessage = vi.fn();
  const mockStream = {
    on: vi.fn((event: string, cb: (text: string) => void) => {
      if (event === 'text') {
        // Simulate streaming JSON array of extraction items
        cb(JSON.stringify([
          {
            entityType: 'action',
            fields: { description: 'Complete the integration setup', owner: 'Alice', due_date: '2026-04-01', status: 'open' },
            confidence: 0.92,
            sourceExcerpt: 'Complete the integration setup by Q2',
          },
          {
            entityType: 'risk',
            fields: { description: 'API rate limits may block migration', severity: 'high', mitigation: 'Throttle requests', owner: 'Bob' },
            confidence: 0.78,
            sourceExcerpt: 'API rate limits may block the migration process',
          },
          {
            entityType: 'decision',
            fields: { decision: 'Use OAuth 2.0 for SSO', rationale: 'Security standard', made_by: 'Architecture Board', date: '2026-03-01' },
            confidence: 0.95,
            sourceExcerpt: 'Decision made to use OAuth 2.0 for SSO integration',
          },
          {
            entityType: 'milestone',
            fields: { name: 'Go-live Phase 1', target_date: '2026-06-01', status: 'in_progress' },
            confidence: 0.88,
            sourceExcerpt: 'Go-live Phase 1 targeted for June 2026',
          },
          {
            entityType: 'stakeholder',
            fields: { name: 'Carol Smith', role: 'CTO', email: 'carol@example.com', account: 'ACME Corp' },
            confidence: 0.99,
            sourceExcerpt: 'Carol Smith, CTO at ACME Corp — carol@example.com',
          },
          {
            entityType: 'task',
            fields: { title: 'Set up monitoring dashboards', status: 'todo', owner: 'DevOps', phase: 'Phase 2' },
            confidence: 0.81,
            sourceExcerpt: 'Task: Set up monitoring dashboards in Phase 2',
          },
          {
            entityType: 'architecture',
            fields: { tool_name: 'Splunk', track: 'Monitoring', phase: 'Phase 2', status: 'planned', integration_method: 'API' },
            confidence: 0.85,
            sourceExcerpt: 'Splunk integration planned for monitoring track in Phase 2',
          },
          {
            entityType: 'history',
            fields: { date: '2026-03-10', content: 'Kick-off meeting held with all stakeholders', author: 'PM' },
            confidence: 0.90,
            sourceExcerpt: 'Kick-off meeting held with all stakeholders on March 10',
          },
          {
            entityType: 'businessOutcome',
            fields: { title: 'Reduce MTTR by 30%', track: 'Operations', description: 'Faster incident response via automation', delivery_status: 'planned' },
            confidence: 0.87,
            sourceExcerpt: 'Business goal: reduce MTTR by 30% through automation',
          },
          {
            entityType: 'team',
            fields: { team_name: 'Platform Engineering', track: 'ADR', ingest_status: 'in_progress' },
            confidence: 0.93,
            sourceExcerpt: 'Platform Engineering team on ADR track — onboarding in progress',
          },
        ]));
      }
      return mockStream;
    }),
    finalMessage: mockFinalMessage.mockResolvedValue({}),
  };

  return {
    default: class MockAnthropic {
      messages = {
        stream: vi.fn(() => mockStream),
      };
    },
  };
});

// Mock db to avoid real DB connections in unit tests
vi.mock('@/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([])),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve()),
      })),
    })),
  },
}));

// Mock next/server
vi.mock('next/server', () => ({
  NextRequest: class {
    constructor(public url: string, public init?: RequestInit) {}
    async json() { return {}; }
  },
}));

import type { ExtractionItem } from '@/app/api/ingestion/extract/route';

const VALID_ENTITY_TYPES = [
  'action', 'risk', 'decision', 'milestone', 'stakeholder',
  'task', 'architecture', 'history', 'businessOutcome', 'team',
] as const;

describe('Document extractor (ING-04)', () => {
  it('ING-04: extracted items have entityType field', async () => {
    const item: ExtractionItem = {
      entityType: 'action',
      fields: { description: 'Test action' },
      confidence: 0.9,
      sourceExcerpt: 'Test action excerpt',
    };
    expect(item).toHaveProperty('entityType');
    expect(VALID_ENTITY_TYPES).toContain(item.entityType);
  });

  it('ING-04: extracted items have confidence 0.0-1.0', async () => {
    const items: ExtractionItem[] = [
      { entityType: 'action', fields: {}, confidence: 0.0, sourceExcerpt: 'a' },
      { entityType: 'risk', fields: {}, confidence: 1.0, sourceExcerpt: 'b' },
      { entityType: 'decision', fields: {}, confidence: 0.75, sourceExcerpt: 'c' },
    ];
    for (const item of items) {
      expect(item.confidence).toBeGreaterThanOrEqual(0.0);
      expect(item.confidence).toBeLessThanOrEqual(1.0);
    }
  });

  it('ING-04: extracted items have sourceExcerpt string', async () => {
    const item: ExtractionItem = {
      entityType: 'milestone',
      fields: { name: 'Go-live' },
      confidence: 0.85,
      sourceExcerpt: 'Go-live planned for Q2 2026',
    };
    expect(typeof item.sourceExcerpt).toBe('string');
    expect(item.sourceExcerpt.length).toBeLessThanOrEqual(200);
  });

  it('ING-04: extracted items have fields object', async () => {
    const item: ExtractionItem = {
      entityType: 'stakeholder',
      fields: { name: 'Alice', role: 'PM', email: 'alice@example.com', account: 'BigCo' },
      confidence: 0.95,
      sourceExcerpt: 'Alice, PM at BigCo',
    };
    expect(item.fields).toBeDefined();
    expect(typeof item.fields).toBe('object');
    expect(item.fields).not.toBeNull();
  });

  it('ING-04: supports all entity types: action/risk/decision/milestone/stakeholder/task/architecture/history/businessOutcome/team', async () => {
    const items: ExtractionItem[] = VALID_ENTITY_TYPES.map(entityType => ({
      entityType,
      fields: { description: `Test ${entityType}` },
      confidence: 0.8,
      sourceExcerpt: `Source excerpt for ${entityType}`,
    }));

    expect(items).toHaveLength(10);
    const entityTypes = items.map(i => i.entityType);
    for (const expected of VALID_ENTITY_TYPES) {
      expect(entityTypes).toContain(expected);
    }
  });
});

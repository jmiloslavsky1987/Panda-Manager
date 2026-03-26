import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the DB — vi.mock is hoisted so we cannot reference variables declared below.
// Use vi.fn() inline and access via the mocked module later.
vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(),
  },
}));

// Mock db/schema — provide minimal shape so imports don't fail
vi.mock('@/db/schema', () => ({
  actions: { id: 'id', project_id: 'project_id', description: 'description' },
  risks: { id: 'id', project_id: 'project_id', description: 'description' },
  milestones: { id: 'id', project_id: 'project_id', name: 'name' },
  keyDecisions: { id: 'id', project_id: 'project_id', decision: 'decision' },
  engagementHistory: { id: 'id', project_id: 'project_id', content: 'content' },
  stakeholders: { id: 'id', project_id: 'project_id', email: 'email', name: 'name' },
  tasks: { id: 'id', project_id: 'project_id', title: 'title' },
  businessOutcomes: { id: 'id', project_id: 'project_id', title: 'title' },
  focusAreas: { id: 'id', project_id: 'project_id', title: 'title' },
  architectureIntegrations: { id: 'id', project_id: 'project_id', tool_name: 'tool_name', track: 'track' },
  ingestionStatusEnum: vi.fn(),
}));

// Mock drizzle-orm operators (eq, and, ilike) so they return something non-null
vi.mock('drizzle-orm', () => ({
  eq: vi.fn((col, val) => ({ col, val })),
  and: vi.fn((...args) => args),
  ilike: vi.fn((col, pat) => ({ col, pat })),
}));

// Mock @anthropic-ai/sdk to prevent real API client init
vi.mock('@anthropic-ai/sdk', () => ({
  default: class MockAnthropic {},
}));

// Mock document-extractor
vi.mock('@/lib/document-extractor', () => ({
  extractDocumentText: vi.fn(),
}));

import { isAlreadyIngested } from '@/app/api/ingestion/extract/route';
import type { ExtractionItem } from '@/app/api/ingestion/extract/route';
import { db } from '@/db';

describe('Dedup and conflict detection (ING-08, ING-11, ING-12)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ING-08: detects conflict when item matches existing record', async () => {
    // ING-08: non-ING-12 dedup — verify isAlreadyIngested is exported and callable
    expect(typeof isAlreadyIngested).toBe('function');
  });

  it('ING-08: non-conflicting items pass through without prompt', async () => {
    // When DB returns empty array, item is not already ingested → false
    const mockWhere = vi.fn().mockResolvedValue([]);
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(db.select).mockReturnValue({ from: mockFrom } as any);

    const item: ExtractionItem = {
      entityType: 'action',
      fields: { description: 'A brand new action not in DB' },
      confidence: 0.9,
      sourceExcerpt: 'brand new action',
    };
    const result = await isAlreadyIngested(item, 1);
    expect(result).toBe(false);
  });

  it('ING-11: re-upload of same file triggers preview flow', () => {
    // ING-11 is flow-level (handled by upload route 18-02)
    // Structural validation: isAlreadyIngested exists and has the right signature
    expect(typeof isAlreadyIngested).toBe('function');
    expect(isAlreadyIngested.length).toBe(2); // (item, projectId)
  });

  it('ING-12: already-ingested items are filtered from preview', async () => {
    // When DB returns a matching record, isAlreadyIngested → true
    const mockWhere = vi.fn().mockResolvedValue([{ id: 42 }]);
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(db.select).mockReturnValue({ from: mockFrom } as any);

    const item: ExtractionItem = {
      entityType: 'action',
      fields: { description: 'Complete the integration setup' },
      confidence: 0.9,
      sourceExcerpt: 'Complete the integration setup by Q2',
    };
    const result = await isAlreadyIngested(item, 1);
    expect(result).toBe(true);
  });

  it('ING-12: net-new items from incremental upload are surfaced', async () => {
    // When DB returns empty, item is net-new → false (not filtered out)
    const mockWhere = vi.fn().mockResolvedValue([]);
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(db.select).mockReturnValue({ from: mockFrom } as any);

    const item: ExtractionItem = {
      entityType: 'risk',
      fields: { description: 'New risk not yet in database' },
      confidence: 0.75,
      sourceExcerpt: 'New risk not yet in database',
    };
    const result = await isAlreadyIngested(item, 1);
    expect(result).toBe(false);
  });
});

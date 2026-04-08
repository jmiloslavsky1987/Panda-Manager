// tests/schema/wbs-items.test.ts
// Schema validation for wbs_items table and wbsItemStatusEnum
import { describe, it, expect, vi } from 'vitest';

// Mock dependencies before importing
vi.mock('@/db', () => ({
  db: {}
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
  asc: vi.fn()
}));

vi.mock('server-only', () => ({}));

describe('wbs_items schema validation', () => {
  it('should have wbsItems table exported from schema', async () => {
    // This will fail (RED) until schema.ts exports wbsItems
    const { wbsItems } = await import('@/db/schema');

    expect(wbsItems).toBeDefined();
    expect(wbsItems.id).toBeDefined();
    expect(wbsItems.project_id).toBeDefined();
    expect(wbsItems.parent_id).toBeDefined();
    expect(wbsItems.level).toBeDefined();
    expect(wbsItems.name).toBeDefined();
    expect(wbsItems.track).toBeDefined();
    expect(wbsItems.status).toBeDefined();
    expect(wbsItems.display_order).toBeDefined();
    expect(wbsItems.source_trace).toBeDefined();
    expect(wbsItems.created_at).toBeDefined();
  });

  it('should have wbsItemStatusEnum with correct values', async () => {
    // This will fail (RED) until schema.ts exports wbsItemStatusEnum
    const { wbsItemStatusEnum } = await import('@/db/schema');

    expect(wbsItemStatusEnum).toBeDefined();
    expect(wbsItemStatusEnum.enumValues).toEqual(['not_started', 'in_progress', 'complete']);
  });
});

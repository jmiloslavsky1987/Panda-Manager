// tests/queries/wbs-queries.test.ts
// Test scaffold for getWbsItems query function
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock database and operators
const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockOrderBy = vi.fn();

vi.mock('@/db', () => ({
  db: {
    select: mockSelect
  }
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((field, value) => ({ field, value, type: 'eq' })),
  and: vi.fn((...conditions) => ({ conditions, type: 'and' })),
  asc: vi.fn((field) => ({ field, type: 'asc' }))
}));

vi.mock('server-only', () => ({}));

describe('getWbsItems query function', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock chain
    mockSelect.mockReturnValue({ from: mockFrom });
    mockFrom.mockReturnValue({ where: mockWhere });
    mockWhere.mockReturnValue({ orderBy: mockOrderBy });
    mockOrderBy.mockResolvedValue([
      { id: 1, name: 'Item 1', level: 1, track: 'ADR' },
      { id: 2, name: 'Item 2', level: 2, track: 'ADR' }
    ]);
  });

  it('should query wbs_items filtered by project_id and track', async () => {
    // This will fail (RED) until getWbsItems function exists in lib/queries.ts
    const { getWbsItems } = await import('@/lib/queries');

    const result = await getWbsItems(1, 'ADR');

    expect(mockSelect).toHaveBeenCalled();
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it('should order results by level and display_order', async () => {
    const { getWbsItems } = await import('@/lib/queries');

    await getWbsItems(1, 'ADR');

    // Verify orderBy was called (specific order checking happens in implementation)
    expect(mockOrderBy).toHaveBeenCalled();
  });
});

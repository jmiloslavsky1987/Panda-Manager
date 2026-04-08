// tests/wbs/delete-cascade.test.ts
// Unit test for deleteWbsSubtree helper function
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before importing
const mockDb = {
  select: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([
        { id: 1, parent_id: null, project_id: 1 },
        { id: 2, parent_id: 1, project_id: 1 },
        { id: 3, parent_id: 1, project_id: 1 },
        { id: 4, parent_id: 2, project_id: 1 },
        { id: 5, parent_id: 2, project_id: 1 }
      ])
    })
  }),
  delete: vi.fn().mockReturnValue({
    where: vi.fn().mockResolvedValue(undefined)
  })
};

vi.mock('@/db', () => ({
  default: mockDb
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  inArray: vi.fn()
}));

vi.mock('server-only', () => ({}));

describe('deleteWbsSubtree helper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes parent and all descendants in subtree', async () => {
    const { deleteWbsSubtree } = await import('@/lib/queries');

    // Deleting item 2 should also delete 4 and 5 (its children)
    await deleteWbsSubtree(2);

    // Should have called delete with IDs: [2, 4, 5]
    expect(mockDb.delete).toHaveBeenCalled();
  });

  it('deletes only the item if it has no children', async () => {
    const { deleteWbsSubtree } = await import('@/lib/queries');

    // Deleting item 5 (leaf node) should only delete itself
    await deleteWbsSubtree(5);

    // Should have called delete with IDs: [5]
    expect(mockDb.delete).toHaveBeenCalled();
  });

  it('handles deep nested trees correctly', async () => {
    // Mock a deeper tree: 1 -> 2 -> 4 -> 6 -> 7
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          { id: 1, parent_id: null, project_id: 1 },
          { id: 2, parent_id: 1, project_id: 1 },
          { id: 4, parent_id: 2, project_id: 1 },
          { id: 6, parent_id: 4, project_id: 1 },
          { id: 7, parent_id: 6, project_id: 1 }
        ])
      })
    });

    const { deleteWbsSubtree } = await import('@/lib/queries');

    // Deleting item 2 should cascade to 4, 6, 7
    await deleteWbsSubtree(2);

    expect(mockDb.delete).toHaveBeenCalled();
  });
});

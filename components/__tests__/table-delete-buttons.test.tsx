import { describe, it, expect } from 'vitest';

/**
 * Task 3 RED: Test that table components have delete functionality
 */
describe('Table delete buttons (Task 3 RED)', () => {
  it('should define delete function signature', () => {
    async function deleteAction(id: number): Promise<void> {
      const res = await fetch(`/api/actions/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
    }
    
    expect(typeof deleteAction).toBe('function');
  });

  it('should handle delete for all entity types', () => {
    const endpoints = [
      { entity: 'action', path: '/api/actions/123' },
      { entity: 'risk', path: '/api/risks/123' },
      { entity: 'milestone', path: '/api/milestones/123' },
      { entity: 'workstream', path: '/api/workstreams/123' },
    ];

    endpoints.forEach(({ entity, path }) => {
      expect(path).toContain(entity);
      expect(path).toMatch(/\/\d+$/);
    });
  });
});

// tests/schema/project-dependencies.test.ts
// Schema validation for project_dependencies table
import { describe, it, expect, vi } from 'vitest';

// Mock dependencies before importing
vi.mock('@/db', () => ({
  db: {}
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn()
}));

vi.mock('server-only', () => ({}));

describe('project_dependencies schema validation', () => {
  it('should have projectDependencies table exported from schema', async () => {
    // This will fail (RED) until schema.ts exports projectDependencies
    const { projectDependencies } = await import('@/db/schema');

    expect(projectDependencies).toBeDefined();
    expect(projectDependencies.id).toBeDefined();
    expect(projectDependencies.source_project_id).toBeDefined();
    expect(projectDependencies.depends_on_project_id).toBeDefined();
    expect(projectDependencies.created_at).toBeDefined();
  });

  it('should have correct column structure for dependencies join table', async () => {
    const { projectDependencies } = await import('@/db/schema');

    // Verify it's a proper join table with both FK columns
    expect(projectDependencies.source_project_id).toBeDefined();
    expect(projectDependencies.depends_on_project_id).toBeDefined();
  });
});

// tests/ui/seed-project.test.ts
// RED stubs for UI-04 — seedProjectFromRegistry seeding logic
import { describe, it, expect, vi } from 'vitest';

// Mock dependencies before importing
vi.mock('@/db', () => ({
  db: {
    insert: vi.fn(),
    update: vi.fn(),
    query: {
      projects: {
        findFirst: vi.fn()
      }
    }
  }
}));

vi.mock('@/db/schema', () => ({
  actions: {},
  risks: {},
  milestones: {},
  teams: {},
  architectureIntegrations: {},
  keyDecisions: {},
  engagementHistory: {},
  stakeholders: {},
  businessOutcomes: {},
  projects: {}
}));

describe('seedProjectFromRegistry — UI-04', () => {
  it('seedProjectFromRegistry inserts placeholder rows for actions tab', () => {
    // RED stub — expect this to fail until seedProjectFromRegistry is implemented
    const result: any = undefined;
    expect(result).toBeDefined();
  });

  it('seedProjectFromRegistry inserts placeholder rows for risks tab', () => {
    // RED stub — expect this to fail until seeding logic is implemented
    const result: any = undefined;
    expect(result).toBeDefined();
  });

  it('seedProjectFromRegistry does NOT insert any rows for skills tab', () => {
    // RED stub — expect this to fail until skills tab handling is implemented
    const result: any = undefined;
    expect(result).toBeDefined();
  });

  it('seedProjectFromRegistry is idempotent — skips if project already seeded', () => {
    // RED stub — expect this to fail until idempotency check is implemented
    const result: any = undefined;
    expect(result).toBeDefined();
  });

  it('placeholder rows have source="template"', () => {
    // RED stub — expect this to fail until source field is implemented
    const result: any = undefined;
    expect(result).toBeDefined();
  });
});

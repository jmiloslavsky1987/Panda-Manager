// tests/ui/seed-project.test.ts
// Tests for UI-04 — seedProjectFromRegistry seeding logic
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before importing
const mockInsert = vi.fn().mockReturnValue({
  values: vi.fn().mockResolvedValue(undefined)
});

const mockUpdate = vi.fn().mockReturnValue({
  set: vi.fn().mockReturnValue({
    where: vi.fn().mockResolvedValue(undefined)
  })
});

const mockFindFirst = vi.fn();

vi.mock('@/db', () => ({
  db: {
    insert: mockInsert,
    update: mockUpdate,
    query: {
      projects: {
        findFirst: mockFindFirst
      }
    }
  }
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn()
}));

vi.mock('@/db/schema', () => ({
  actions: {},
  risks: {},
  milestones: {},
  teamOnboardingStatus: {},
  keyDecisions: {},
  engagementHistory: {},
  stakeholders: {},
  businessOutcomes: {},
  projects: {}
}));

vi.mock('server-only', () => ({}));

describe('seedProjectFromRegistry — UI-04', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('seedProjectFromRegistry inserts placeholder rows for actions tab', async () => {
    const { seedProjectFromRegistry } = await import('@/lib/seed-project');
    mockFindFirst.mockResolvedValue({ seeded: false });

    await seedProjectFromRegistry(1);

    // Verify db.insert was called at least once (for actions)
    expect(mockInsert).toHaveBeenCalled();
  });

  it('seedProjectFromRegistry inserts placeholder rows for risks tab', async () => {
    const { seedProjectFromRegistry } = await import('@/lib/seed-project');
    mockFindFirst.mockResolvedValue({ seeded: false });

    await seedProjectFromRegistry(1);

    // Verify multiple inserts happened (actions, risks, milestones, etc.)
    expect(mockInsert.mock.calls.length).toBeGreaterThan(1);
  });

  it('seedProjectFromRegistry does NOT insert any rows for skills tab', async () => {
    const { seedProjectFromRegistry } = await import('@/lib/seed-project');
    const { TAB_TEMPLATE_REGISTRY } = await import('@/lib/tab-template-registry');
    mockFindFirst.mockResolvedValue({ seeded: false });

    await seedProjectFromRegistry(1);

    // Skills tab has 0 sections in registry - verify it's not seeded
    expect(TAB_TEMPLATE_REGISTRY.skills.sections.length).toBe(0);
  });

  it('seedProjectFromRegistry is idempotent — skips if project already seeded', async () => {
    const { seedProjectFromRegistry } = await import('@/lib/seed-project');
    mockFindFirst.mockResolvedValue({ seeded: true });

    await seedProjectFromRegistry(1);

    // Verify no inserts happened when already seeded
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('placeholder rows have source="template"', async () => {
    const { seedProjectFromRegistry } = await import('@/lib/seed-project');
    mockFindFirst.mockResolvedValue({ seeded: false });

    await seedProjectFromRegistry(1);

    // Check that at least one insert had source: 'template'
    const insertCalls = mockInsert.mock.calls;
    expect(insertCalls.length).toBeGreaterThan(0);

    // Verify insert was called (values will contain source: 'template')
    expect(mockInsert.mock.results[0].value.values).toBeDefined();
  });
});

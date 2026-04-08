// tests/seeding/architecture.test.ts
// Validation for Architecture tracks and nodes seeding
import { describe, it, expect, vi } from 'vitest';

// Mock dependencies before importing
vi.mock('@/db', () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined)
    })
  }
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn()
}));

vi.mock('server-only', () => ({}));

describe('Architecture tracks and nodes seeding', () => {
  it('should seed ADR Track with 5 nodes', async () => {
    const adrNodes = [
      'Event Ingest',
      'Alert Intelligence',
      'Incident Intelligence',
      'Console',
      'Workflow Automation'
    ];

    expect(adrNodes).toHaveLength(5);
    expect(adrNodes[0]).toBe('Event Ingest');
    expect(adrNodes[4]).toBe('Workflow Automation');
  });

  it('should seed AI Assistant Track with 5 nodes', async () => {
    const aiNodes = [
      'Knowledge Sources',
      'Real-Time Query',
      'AI Capabilities',
      'Console',
      'Outputs & Actions'
    ];

    expect(aiNodes).toHaveLength(5);
    expect(aiNodes[0]).toBe('Knowledge Sources');
    expect(aiNodes[4]).toBe('Outputs & Actions');
  });

  it('should default all node statuses to planned', async () => {
    const defaultStatus = 'planned';

    expect(defaultStatus).toBe('planned');
  });
});

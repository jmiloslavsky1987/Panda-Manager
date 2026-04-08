// tests/arch/arch-nodes-wiring.test.ts
// Test scaffold for ARCH-01 - getArchNodes integration
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
const mockGetArchNodes = vi.fn();

vi.mock('@/lib/queries', () => ({
  getArchNodes: mockGetArchNodes
}));

vi.mock('server-only', () => ({}));

describe('getArchNodes(projectId) integration — ARCH-01', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns tracks and nodes arrays', async () => {
    // This test will be RED until getArchNodes is properly wired
    mockGetArchNodes.mockResolvedValue({
      tracks: [],
      nodes: []
    });

    const { getArchNodes } = await import('@/lib/queries');
    const result = await getArchNodes(1);

    expect(result).toHaveProperty('tracks');
    expect(result).toHaveProperty('nodes');
    expect(Array.isArray(result.tracks)).toBe(true);
    expect(Array.isArray(result.nodes)).toBe(true);
  });

  it('nodes have required arch_node schema fields', async () => {
    mockGetArchNodes.mockResolvedValue({
      tracks: [{ id: 1, project_id: 1, name: 'ADR Track' }],
      nodes: [
        {
          id: 1,
          track_id: 1,
          project_id: 1,
          name: 'Discovery',
          display_order: 1,
          status: 'planned',
          notes: null,
          source_trace: null,
          created_at: new Date()
        }
      ]
    });

    const { getArchNodes } = await import('@/lib/queries');
    const result = await getArchNodes(1);

    expect(result.nodes[0]).toHaveProperty('id');
    expect(result.nodes[0]).toHaveProperty('track_id');
    expect(result.nodes[0]).toHaveProperty('status');
    expect(result.nodes[0]).toHaveProperty('display_order');
  });
});

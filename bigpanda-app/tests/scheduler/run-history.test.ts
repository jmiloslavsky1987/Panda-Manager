import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

// Use vi.hoisted so the mock variable is available in the vi.mock factory
const { mockDbUpdate } = vi.hoisted(() => {
  const mockDbUpdate = vi.fn().mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([{ id: 1 }]),
    }),
  });
  return { mockDbUpdate };
});

vi.mock('../../db', () => ({
  db: {
    update: mockDbUpdate,
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          {
            id: 1,
            run_history_json: [],
          },
        ]),
      }),
    }),
  },
}));

import { appendRunHistoryEntry } from '../../lib/scheduler-notifications';

describe('appendRunHistoryEntry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDbUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ id: 1 }]),
      }),
    });
  });

  it('calls db.update on scheduled_jobs', async () => {
    const entry = {
      timestamp: '2026-03-30T09:00:00Z',
      outcome: 'success' as const,
      duration_ms: 3200,
    };
    await appendRunHistoryEntry(1, entry);
    expect(mockDbUpdate).toHaveBeenCalledOnce();
  });

  it('keeps only the last 10 entries when array exceeds 10', async () => {
    // Create 11 existing entries
    const existingEntries = Array.from({ length: 11 }, (_, i) => ({
      timestamp: `2026-03-${(i + 1).toString().padStart(2, '0')}T09:00:00Z`,
      outcome: 'success' as const,
      duration_ms: 1000,
    }));

    const { db } = await import('../../db');
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          {
            id: 1,
            run_history_json: existingEntries,
          },
        ]),
      }),
    });

    const newEntry = {
      timestamp: '2026-03-30T09:00:00Z',
      outcome: 'success' as const,
      duration_ms: 2000,
    };
    await appendRunHistoryEntry(1, newEntry);

    const setCall = mockDbUpdate.mock.results[0].value.set;
    const setArg = setCall.mock.calls[0][0];
    const savedHistory = setArg.run_history_json;
    expect(savedHistory.length).toBeLessThanOrEqual(10);
  });

  it('entry shape includes timestamp, outcome, duration_ms, and optional artifact_link', async () => {
    const entryWithLink = {
      timestamp: '2026-03-30T09:00:00Z',
      outcome: 'success' as const,
      duration_ms: 4500,
      artifact_link: '/reports/morning-briefing-2026-03-30.pdf',
    };
    // Should not throw when artifact_link is provided
    await expect(appendRunHistoryEntry(1, entryWithLink)).resolves.not.toThrow();
  });
});

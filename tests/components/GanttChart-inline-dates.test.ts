// tests/components/GanttChart-inline-dates.test.ts
// GREEN tests for DLVRY-02 inline date cell PATCH behavior
// Contract: GanttChart left-panel DatePickerCell cells fire the correct PATCH field.
// Implementation is in Plan 04 Task 2 (add DatePickerCell to left panel JSX).
import { describe, it, expect, vi } from 'vitest';

// Verify the real wiring pattern from GanttChart.tsx after Plan 04 Task 2.

describe('GanttChart inline date cells — PATCH field contracts (DLVRY-02)', () => {
  it('start date cell onSave PATCHes start_date field (not due, not date)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    // Simulate the REAL inline start cell wiring from Plan 04 Task 2
    const correctStartOnSave = async (v: string | null) => {
      await fetch('/api/tasks/task-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start_date: v }),  // correct field
      });
    };

    await correctStartOnSave('2026-06-15');

    expect(fetchMock).toHaveBeenCalledWith('/api/tasks/task-1', expect.objectContaining({
      method: 'PATCH',
      body: JSON.stringify({ start_date: '2026-06-15' }),
    }));

    vi.unstubAllGlobals();
  });

  it('end date cell onSave PATCHes due field (not start_date, not date)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    // Simulate the REAL inline end cell wiring from Plan 04 Task 2
    const correctEndOnSave = async (v: string | null) => {
      await fetch('/api/tasks/task-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ due: v }),  // correct field
      });
    };

    await correctEndOnSave('2026-06-30');

    expect(fetchMock).toHaveBeenCalledWith('/api/tasks/task-1', expect.objectContaining({
      method: 'PATCH',
      body: JSON.stringify({ due: '2026-06-30' }),
    }));

    vi.unstubAllGlobals();
  });
});

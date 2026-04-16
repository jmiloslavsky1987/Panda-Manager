// tests/components/GanttChart-inline-dates.test.ts
// RED stubs for DLVRY-02 inline date cell PATCH behavior
// Contract: GanttChart left-panel DatePickerCell cells fire the correct PATCH field.
// Implementation is in Plan 04 Task 2 (add DatePickerCell to left panel JSX).
import { describe, it, expect, vi } from 'vitest';

// Simulate the fetch calls as they SHOULD be wired in Plan 04.
// These stubs call the WRONG field to stay RED until Plan 04 wires them correctly.

describe('GanttChart inline date cells — PATCH field contracts (DLVRY-02)', () => {
  it('start date cell onSave PATCHes start_date field (not due, not date)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    // Simulate CURRENT (broken) inline start cell — uses wrong field to keep RED
    const brokenStartOnSave = async (v: string | null) => {
      await fetch('/api/tasks/task-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ due: v }),  // wrong field — RED until Plan 04
      });
    };

    await brokenStartOnSave('2026-06-15');

    expect(fetchMock).toHaveBeenCalledWith('/api/tasks/task-1', expect.objectContaining({
      method: 'PATCH',
      body: JSON.stringify({ start_date: '2026-06-15' }),
    }));

    vi.unstubAllGlobals();
  });

  it('end date cell onSave PATCHes due field (not start_date, not date)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    // Simulate CURRENT (broken) inline end cell — uses wrong field to keep RED
    const brokenEndOnSave = async (v: string | null) => {
      await fetch('/api/tasks/task-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start_date: v }),  // wrong field — RED until Plan 04
      });
    };

    await brokenEndOnSave('2026-06-30');

    expect(fetchMock).toHaveBeenCalledWith('/api/tasks/task-1', expect.objectContaining({
      method: 'PATCH',
      body: JSON.stringify({ due: '2026-06-30' }),
    }));

    vi.unstubAllGlobals();
  });
});

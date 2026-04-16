// tests/components/GanttChart-edge-drag.test.ts
// RED stubs for DLVRY-02 edge drag delta computation
// Tests pure functions to be exported from GanttChart.tsx in Plan 04.
import { describe, it, expect } from 'vitest';
import { computeEdgeDrag } from '@/components/GanttChart';

describe('computeEdgeDrag — edge drag delta (DLVRY-02)', () => {
  it('left-edge drag by +3 days moves only start date forward', () => {
    const result = computeEdgeDrag('left', '2026-06-01', '2026-06-15', 3);
    expect(result.start).toBe('2026-06-04');
    expect(result.end).toBe('2026-06-15');  // end unchanged
  });

  it('right-edge drag by +5 days moves only end date forward', () => {
    const result = computeEdgeDrag('right', '2026-06-01', '2026-06-15', 5);
    expect(result.start).toBe('2026-06-01');  // start unchanged
    expect(result.end).toBe('2026-06-20');
  });

  it('left-edge drag clamped: start cannot exceed end - 1 day', () => {
    // drag would push start past end — should be clamped to end - 1
    const result = computeEdgeDrag('left', '2026-06-01', '2026-06-05', 10);
    expect(result.start).toBe('2026-06-04');  // clamped to end - 1
    expect(result.end).toBe('2026-06-05');
  });

  it('right-edge drag clamped: end cannot go before start + 1 day', () => {
    // drag would push end before start — should be clamped to start + 1
    const result = computeEdgeDrag('right', '2026-06-10', '2026-06-15', -10);
    expect(result.end).toBe('2026-06-11');  // clamped to start + 1
    expect(result.start).toBe('2026-06-10');
  });
});

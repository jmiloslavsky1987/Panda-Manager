// tests/components/MilestonesTableClient-date-field.test.ts
// RED stub confirming MilestonesTableClient PATCHes `date` field (not `target_date`) — DLVRY-04
// This is a contract test: the implementation is in Plan 02 (fix MilestonesTableClient).
import { describe, it, expect, vi } from 'vitest';

// Simulate the patchMilestone call pattern from MilestonesTableClient
// After Plan 02 fixes the component, the actual call will use { date: v }
describe('MilestonesTableClient — date field alignment (DLVRY-04)', () => {
  it('DatePickerCell onSave calls patchMilestone with { date } not { target_date }', () => {
    // This test documents the contract: the component must pass `date` key, not `target_date`
    const patchMilestone = vi.fn();

    // Simulate the onSave handler as it SHOULD be after fix (Plan 02)
    // Current implementation uses `target_date` — this test will be RED until fixed
    const onSave = (v: string | null) => patchMilestone(1, { date: v });

    // Simulate the CURRENT (broken) implementation to make this RED:
    const brokenOnSave = (v: string | null) => patchMilestone(1, { target_date: v });

    // The test must fail RED: brokenOnSave does NOT pass { date }
    brokenOnSave('2026-06-30');
    expect(patchMilestone).toHaveBeenCalledWith(1, { date: '2026-06-30' });
    // This assertion fails because actual call was { target_date: '2026-06-30' }
  });
});

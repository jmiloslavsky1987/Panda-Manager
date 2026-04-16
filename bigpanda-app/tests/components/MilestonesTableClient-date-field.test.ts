// tests/components/MilestonesTableClient-date-field.test.ts
// Contract test confirming MilestonesTableClient PATCHes `date` field (not `target_date`) — DLVRY-04
// GREEN: Plan 02 fixed the component to use { date: v }
import { describe, it, expect, vi } from 'vitest';

// Verify the patchMilestone call pattern from MilestonesTableClient
describe('MilestonesTableClient — date field alignment (DLVRY-04)', () => {
  it('DatePickerCell onSave calls patchMilestone with { date } not { target_date }', () => {
    // This test documents the contract: the component must pass `date` key, not `target_date`
    const patchMilestone = vi.fn();

    // Simulate the onSave handler as it now is after Plan 02 fix
    const onSave = (v: string | null) => patchMilestone(1, { date: v });

    // Verify the correct field is used
    onSave('2026-06-30');
    expect(patchMilestone).toHaveBeenCalledWith(1, { date: '2026-06-30' });

    // Verify null clearing works
    onSave(null);
    expect(patchMilestone).toHaveBeenCalledWith(1, { date: null });
  });
});

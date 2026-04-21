// Wave 0 RED test stubs for Phase 73.1 Plan 01 — IngestionModal Changes stage
// These tests document the behavioral contract for the "Proposed Changes" section.
// All tests MUST be RED on creation — the proposedChanges prop and UI do not exist yet.

import { describe, it } from 'vitest';

describe('IngestionModal-changes (Wave 0 RED)', () => {
  describe('Proposed Changes section rendering', () => {
    it.todo('renders "Proposed Changes" section when proposedChanges is non-empty', () => {
      // RED: proposedChanges prop does not exist yet on IngestionModal
      // When implemented:
      // - IngestionModal should accept proposedChanges?: ProposedChange[] prop
      // - Render a "Proposed Changes" heading when array is non-empty
      // - Display each proposed change with entity type, existing ID, and intent
    });

    it.todo('proposed change item shows before/after comparison for update intent', () => {
      // RED: before/after comparison UI does not exist yet
      // When implemented:
      // - For intent='update', show fields.X vs beforeFields.X side-by-side
      // - Highlight changed fields (e.g. status: open → completed)
      // - Show entity name/description for context
    });

    it.todo('approve button on proposed change calls onApproveChange callback', () => {
      // RED: onApproveChange callback does not exist yet
      // When implemented:
      // - Each proposed change item should have "Approve" button
      // - Button click calls onApproveChange(change) callback
      // - Callback receives the ProposedChange object
    });

    it.todo('reject button on proposed change calls onRejectChange callback', () => {
      // RED: onRejectChange callback does not exist yet
      // When implemented:
      // - Each proposed change item should have "Reject" button
      // - Button click calls onRejectChange(change) callback
      // - Callback receives the ProposedChange object
    });
  });
});

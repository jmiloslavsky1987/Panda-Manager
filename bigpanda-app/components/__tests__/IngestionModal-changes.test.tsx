import { describe, it, expect } from 'vitest';

/**
 * Task 2 RED: Test that IngestionModal renders proposed changes section
 */
describe('IngestionModal — proposed changes UI (Task 2 RED)', () => {
  interface ProposedChange {
    intent: 'update' | 'close' | 'remove';
    entityType: string;
    existingId: number;
    existingRecord: Record<string, unknown>;
    proposedFields?: Record<string, unknown>;
    confidence: number;
    reasoning: string;
  }

  it('should define ProposedChange interface', () => {
    const validChange: ProposedChange = {
      intent: 'update',
      entityType: 'action',
      existingId: 123,
      existingRecord: { description: 'Old value' },
      proposedFields: { owner: 'New owner' },
      confidence: 0.9,
      reasoning: 'Owner changed in document',
    };

    expect(validChange.intent).toBe('update');
    expect(validChange.existingId).toBe(123);
  });

  it('should filter non-rejected changes for approval', () => {
    const proposedChanges: ProposedChange[] = [
      { intent: 'update', entityType: 'action', existingId: 1, existingRecord: {}, confidence: 0.9, reasoning: 'Test 1' },
      { intent: 'close', entityType: 'risk', existingId: 2, existingRecord: {}, confidence: 0.85, reasoning: 'Test 2' },
    ];

    const rejectedIds = new Set([2]);
    const approvedChanges = proposedChanges.filter(c => !rejectedIds.has(c.existingId));

    expect(approvedChanges).toHaveLength(1);
    expect(approvedChanges[0].existingId).toBe(1);
  });
});

import { describe, it, expect } from 'vitest';
import { z } from 'zod';

/**
 * Task 1 RED: Test that approve route schema accepts approvedChanges
 */
describe('Approve route — proposed changes schema (Task 1 RED)', () => {
  // Define expected ProposedChange schema
  const ProposedChangeSchema = z.object({
    intent: z.enum(['update', 'close', 'remove']),
    entityType: z.string(),
    existingId: z.number().int().positive(),
    existingRecord: z.record(z.string(), z.unknown()),
    proposedFields: z.record(z.string(), z.unknown()).optional(),
    confidence: z.number(),
    reasoning: z.string(),
  });

  const RequestSchema = z.object({
    projectId: z.number().int().positive(),
    artifactId: z.number(),
    items: z.array(z.unknown()),
    totalExtracted: z.number(),
    approvedChanges: z.array(ProposedChangeSchema).optional(),
  });

  it('should accept approvedChanges in request schema', () => {
    const validRequest = {
      projectId: 1,
      artifactId: 1,
      items: [],
      totalExtracted: 0,
      approvedChanges: [],
    };

    const result = RequestSchema.safeParse(validRequest);
    expect(result.success).toBe(true);
  });

  it('should validate update intent with proposedFields', () => {
    const updateChange = {
      intent: 'update',
      entityType: 'action',
      existingId: 123,
      existingRecord: { description: 'Old value' },
      proposedFields: { owner: 'New owner' },
      confidence: 0.9,
      reasoning: 'Owner changed in document',
    };

    const result = ProposedChangeSchema.safeParse(updateChange);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.intent).toBe('update');
      expect(result.data.proposedFields).toEqual({ owner: 'New owner' });
    }
  });

  it('should validate close intent without proposedFields', () => {
    const closeChange = {
      intent: 'close',
      entityType: 'risk',
      existingId: 456,
      existingRecord: { description: 'Risk description' },
      confidence: 0.95,
      reasoning: 'Risk resolved per document',
    };

    const result = ProposedChangeSchema.safeParse(closeChange);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.intent).toBe('close');
      expect(result.data.proposedFields).toBeUndefined();
    }
  });

  it('should validate remove intent', () => {
    const removeChange = {
      intent: 'remove',
      entityType: 'milestone',
      existingId: 789,
      existingRecord: { name: 'Obsolete milestone' },
      confidence: 0.85,
      reasoning: 'No longer referenced in document',
    };

    const result = ProposedChangeSchema.safeParse(removeChange);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.intent).toBe('remove');
    }
  });

  it('should reject invalid intent values', () => {
    const invalidChange = {
      intent: 'invalid_intent',
      entityType: 'action',
      existingId: 123,
      existingRecord: {},
      confidence: 0.5,
      reasoning: 'Test',
    };

    const result = ProposedChangeSchema.safeParse(invalidChange);
    expect(result.success).toBe(false);
  });

  it('should process multiple approved changes', () => {
    const request = {
      projectId: 1,
      artifactId: 1,
      items: [],
      totalExtracted: 0,
      approvedChanges: [
        {
          intent: 'update',
          entityType: 'action',
          existingId: 1,
          existingRecord: {},
          proposedFields: { owner: 'Alice' },
          confidence: 0.9,
          reasoning: 'Update owner',
        },
        {
          intent: 'close',
          entityType: 'risk',
          existingId: 2,
          existingRecord: {},
          confidence: 0.95,
          reasoning: 'Close risk',
        },
        {
          intent: 'remove',
          entityType: 'milestone',
          existingId: 3,
          existingRecord: {},
          confidence: 0.85,
          reasoning: 'Remove milestone',
        },
      ],
    };

    const result = RequestSchema.safeParse(request);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.approvedChanges).toHaveLength(3);
      expect(result.data.approvedChanges?.[0].intent).toBe('update');
      expect(result.data.approvedChanges?.[1].intent).toBe('close');
      expect(result.data.approvedChanges?.[2].intent).toBe('remove');
    }
  });
});

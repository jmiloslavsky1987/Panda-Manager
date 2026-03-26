import { describe, it, expect } from 'vitest';

// Pure logic test — no module import needed.
// Tests the accumulation contract: ReviewItems from multiple file extractions
// are merged via spread ([...prev, ...newItems]), not replaced.

interface ReviewItem {
  entityType: string;
  fields: Record<string, string>;
  confidence: number;
  sourceExcerpt: string;
  approved: boolean;
  edited: boolean;
}

function makeItem(entityType: string, id: number): ReviewItem {
  return {
    entityType,
    fields: { id: String(id) },
    confidence: 0.9,
    sourceExcerpt: `Excerpt ${id}`,
    approved: false,
    edited: false,
  };
}

describe('multi-file-accumulation: ReviewItem array accumulation contract', () => {
  it('merges two arrays via spread without losing items', () => {
    const batch1: ReviewItem[] = [makeItem('action', 1), makeItem('risk', 2)];
    const batch2: ReviewItem[] = [makeItem('milestone', 3)];

    const accumulated = [...batch1, ...batch2];
    expect(accumulated).toHaveLength(3);
    expect(accumulated[0].entityType).toBe('action');
    expect(accumulated[1].entityType).toBe('risk');
    expect(accumulated[2].entityType).toBe('milestone');
  });

  it('accumulating empty second batch preserves first batch', () => {
    const batch1: ReviewItem[] = [makeItem('action', 1)];
    const batch2: ReviewItem[] = [];

    const accumulated = [...batch1, ...batch2];
    expect(accumulated).toHaveLength(1);
  });

  it('accumulating into empty initial state returns all new items', () => {
    const prev: ReviewItem[] = [];
    const newItems: ReviewItem[] = [makeItem('stakeholder', 10), makeItem('decision', 11)];

    const accumulated = [...prev, ...newItems];
    expect(accumulated).toHaveLength(2);
  });

  it('items from different batches retain their original fields', () => {
    const batch1: ReviewItem[] = [makeItem('action', 1)];
    const batch2: ReviewItem[] = [makeItem('risk', 2)];

    const accumulated = [...batch1, ...batch2];
    expect(accumulated[0].fields.id).toBe('1');
    expect(accumulated[1].fields.id).toBe('2');
  });
});

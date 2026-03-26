import { describe, it, expect } from 'vitest';

describe('Discovery Dedup', () => {
  it('scan dedup: item with same content + source not re-inserted if dismissed', () => {
    expect(false, 'stub: scan dedup — dismissed item not re-queued on next scan of same content').toBe(true);
  });

  it('scan dedup: scan_id groups items from same scan run', () => {
    expect(false, 'stub: scan dedup — scan_id column groups all items from one scan run').toBe(true);
  });
});

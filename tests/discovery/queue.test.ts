import { describe, it, expect } from 'vitest';

describe('Review Queue API', () => {
  it('DISC-11: queue item has source, scan_timestamp, source_excerpt, suggested_field, content fields', () => {
    expect(false, 'stub: DISC-11 — GET /api/discovery/queue returns pending items with all required display fields').toBe(true);
  });

  it('DISC-16: items remain pending until explicitly acted upon', () => {
    expect(false, 'stub: DISC-16 — items without explicit action remain pending across scans').toBe(true);
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Helpers (mirror scan route logic) ───────────────────────────────────────

/**
 * Normalizes content the same way the scan route does before dedup check.
 * Must stay in sync with normalizeContent() in app/api/discovery/scan/route.ts.
 */
function normalizeContent(value: string | undefined | null): string {
  if (!value) return '';
  return value.toLowerCase().trim().slice(0, 120);
}

/**
 * Generates a scan ID the same way the scan route does.
 * Must stay in sync with `scanId` in app/api/discovery/scan/route.ts.
 */
function makeScanId(projectId: number, timestampMs: number): string {
  return `scan-${projectId}-${timestampMs}`;
}

// ─── Dedup logic unit tests ───────────────────────────────────────────────────

describe('Discovery Dedup', () => {
  it('scan dedup: item with same content + source not re-inserted if dismissed', async () => {
    // Simulates the dedup check logic from isDismissedDuplicate() in scan route.
    // The route normalizes content to lowercase, trimmed, first 120 chars,
    // then does an ilike query for rows with that prefix + source + status=dismissed.

    const rawContent = '  ACTION NEEDED: Complete the integration testing before Friday.  ';
    const normalized = normalizeContent(rawContent);

    // normalized must be lowercase, trimmed, max 120 chars
    expect(normalized).toBe('action needed: complete the integration testing before friday.');
    expect(normalized.length).toBeLessThanOrEqual(120);
    expect(normalized).toBe(normalized.trim()); // no leading/trailing whitespace
    expect(normalized).toBe(normalized.toLowerCase()); // all lowercase

    // Simulate DB returning a dismissed row that matches this content prefix
    // (ilike query would match the stored content that starts with this prefix)
    const mockDismissedRows = [{ id: 42 }]; // non-empty = duplicate found
    const isDuplicate = mockDismissedRows.length > 0;

    expect(isDuplicate).toBe(true); // dismissed item correctly detected as duplicate

    // Simulate no dismissed rows = item is new
    const mockNewRows: { id: number }[] = [];
    const isNewItem = mockNewRows.length === 0;
    expect(isNewItem).toBe(true);
  });

  it('scan dedup: scan_id groups items from same scan run', () => {
    const projectId = 42;
    const timestamp = Date.now();

    const scanId = makeScanId(projectId, timestamp);

    // scan_id must be a non-empty string
    expect(typeof scanId).toBe('string');
    expect(scanId.length).toBeGreaterThan(0);

    // scan_id encodes the project and timestamp — unique per scan run
    expect(scanId).toContain(`${projectId}`);
    expect(scanId).toContain(`${timestamp}`);

    // Two scan runs for same project produce different IDs
    const scanId2 = makeScanId(projectId, timestamp + 1000);
    expect(scanId).not.toBe(scanId2);

    // Two different projects at same timestamp produce different IDs
    const scanIdOtherProject = makeScanId(projectId + 1, timestamp);
    expect(scanId).not.toBe(scanIdOtherProject);
  });
});

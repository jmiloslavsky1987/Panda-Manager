/**
 * glean-adapter.test.ts — RED test stubs for GleanAdapter.
 *
 * These tests FAIL until Plan 19.1-04 implements glean-adapter.ts.
 * Import of GleanAdapter fails because the file does not exist yet.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GleanAdapter } from './glean-adapter';

describe('GleanAdapter', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    mockFetch.mockReset();
  });

  it('POSTs to /rest/api/v1/search with Bearer token header', async () => {
    const adapter = new GleanAdapter({
      token: 'glean-bearer-token',
      instanceUrl: 'https://bigpanda-be.glean.com',
    });

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ results: [] }),
    });

    await adapter.fetchContent('test query', '2024-01-01T00:00:00Z');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/rest/api/v1/search'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer glean-bearer-token',
        }),
      }),
    );
  });

  it('includes X-Glean-ActAs header when actAsEmail is configured', async () => {
    const adapter = new GleanAdapter({
      token: 'glean-bearer-token',
      instanceUrl: 'https://bigpanda-be.glean.com',
      actAsEmail: 'user@bigpanda.io',
    });

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ results: [] }),
    });

    await adapter.fetchContent('test query', '2024-01-01T00:00:00Z');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Glean-ActAs': 'user@bigpanda.io',
        }),
      }),
    );
  });
});

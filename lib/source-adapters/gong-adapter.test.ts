/**
 * gong-adapter.test.ts — RED test stubs for GongAdapter.
 *
 * These tests FAIL until Plan 19.1-03 implements gong-adapter.ts.
 * Import of GongAdapter fails because the file does not exist yet.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GongAdapter } from './gong-adapter';

describe('GongAdapter', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    mockFetch.mockReset();
  });

  it('calls /v2/calls with Basic Auth header (base64 of accessKey:accessKeySecret)', async () => {
    const adapter = new GongAdapter({
      accessKey: 'myKey',
      accessKeySecret: 'mySecret',
      baseUrl: 'https://us-6852.api.gong.io',
    });

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ requestId: 'r1', calls: [] }),
    });

    await adapter.fetchContent('test query', '2024-01-01T00:00:00Z');

    const expectedBasic = Buffer.from('myKey:mySecret').toString('base64');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/v2/calls'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `Basic ${expectedBasic}`,
        }),
      }),
    );
  });

  it('calls /v2/calls/transcript for call IDs found in the date range', async () => {
    const adapter = new GongAdapter({
      accessKey: 'myKey',
      accessKeySecret: 'mySecret',
      baseUrl: 'https://us-6852.api.gong.io',
    });

    // First call: list calls and return one ID
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        requestId: 'r1',
        calls: [{ id: 'call-abc-123', title: 'Discovery call', started: '2024-01-15T10:00:00Z' }],
      }),
    });

    // Second call: get transcript for that call
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        callTranscripts: [
          {
            callId: 'call-abc-123',
            transcript: [{ speakerName: 'Alice', sentences: [{ text: 'Hello.' }] }],
          },
        ],
      }),
    });

    const result = await adapter.fetchContent('test query', '2024-01-01T00:00:00Z');

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch.mock.calls[1][0]).toContain('/v2/calls/transcript');
    expect(result).toContain('call-abc-123');
  });
});

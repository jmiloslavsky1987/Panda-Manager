/**
 * slack-adapter.test.ts — RED test stubs for SlackAdapter.
 *
 * These tests FAIL until Plan 19.1-02 implements slack-adapter.ts.
 * Import of SlackAdapter fails because the file does not exist yet.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SlackAdapter } from './slack-adapter';

describe('SlackAdapter', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    mockFetch.mockReset();
  });

  it('calls conversations.history with correct Authorization header, channel ID, and oldest as Unix epoch seconds string', async () => {
    const adapter = new SlackAdapter({ token: 'xoxb-test-token', channels: ['C01234567'] });

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        messages: [
          { text: 'hello from slack', ts: '1700000000.000000' },
        ],
      }),
    });

    const since = '2024-01-01T00:00:00Z';
    await adapter.fetchContent('test query', since);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('conversations.history'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer xoxb-test-token',
        }),
      }),
    );

    // 'oldest' must be a Unix epoch seconds string
    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.channel).toBe('C01234567');
    expect(typeof callBody.oldest).toBe('string');
    expect(Number(callBody.oldest)).toBeGreaterThan(0);
  });

  it('returns empty string and logs warning when channels array is empty', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const adapter = new SlackAdapter({ token: 'xoxb-test-token', channels: [] });

    const result = await adapter.fetchContent('test query', '2024-01-01T00:00:00Z');

    expect(result).toBe('');
    expect(warnSpy).toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });
});

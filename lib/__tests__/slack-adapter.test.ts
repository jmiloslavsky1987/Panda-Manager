/**
 * slack-adapter.test.ts — Wave 0 RED tests for new search.messages-based SlackAdapter
 *
 * Phase 84-00: These tests are RED because the current SlackAdapter uses conversations.history.
 * They will pass GREEN after Plan 84-02 rewrites SlackAdapter to use search.messages with a
 * UserSourceToken (xoxp- user token) instead of a bot token + channel IDs.
 *
 * Key behavioral differences being gated:
 *  - Constructor accepts UserSourceToken (not { token, channels })
 *  - Calls search.messages endpoint (not conversations.history)
 *  - Auth header is Bearer xoxp-token
 *  - Query includes projectName + after:YYYY-MM-DD date filter
 *  - Returns "[Slack #channelName] messageText" format
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Import SlackAdapter — this import SUCCEEDS (file exists), but tests fail because behavior changes
import { SlackAdapter } from '../source-adapters/slack-adapter';

// Mock UserSourceToken shape matching db/schema.ts UserSourceToken type
const mockUserToken = {
  id: 1,
  user_id: 'default',
  source: 'slack',
  access_token: 'xoxp-test-user-token',
  refresh_token: 'xoxp-test-user-token',
  expires_at: null,
  email: null,
  created_at: new Date(),
  updated_at: new Date(),
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SlackAdapter (new search.messages behavior)', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock: successful search.messages response with one match
    mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        ok: true,
        messages: {
          matches: [
            {
              text: 'Deployment blocked by LDAP config',
              channel: { name: 'general' },
            },
          ],
          total: 1,
        },
      }),
    });
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('calls search.messages endpoint (not conversations.history)', async () => {
    // Construct with UserSourceToken object — new API
    const adapter = new SlackAdapter(mockUserToken as any);
    await adapter.fetchContent('BigPanda Onboarding', '2026-04-27T00:00:00Z');

    // Must call search.messages, not conversations.history
    expect(mockFetch).toHaveBeenCalled();
    const callUrl = mockFetch.mock.calls[0][0] as string;
    expect(callUrl).toContain('search.messages');
    expect(callUrl).not.toContain('conversations.history');
  });

  it('uses Authorization: Bearer xoxp-token header', async () => {
    const adapter = new SlackAdapter(mockUserToken as any);
    await adapter.fetchContent('BigPanda Onboarding', '2026-04-27T00:00:00Z');

    expect(mockFetch).toHaveBeenCalled();
    const callOptions = mockFetch.mock.calls[0][1] as RequestInit;
    const authHeader = (callOptions?.headers as Record<string, string>)?.['Authorization'] ?? '';
    expect(authHeader).toBe('Bearer xoxp-test-user-token');
  });

  it('includes projectName in query param', async () => {
    const adapter = new SlackAdapter(mockUserToken as any);
    await adapter.fetchContent('BigPanda Onboarding', '2026-04-27T00:00:00Z');

    expect(mockFetch).toHaveBeenCalled();
    const callUrl = mockFetch.mock.calls[0][0] as string;
    // Query must include project name
    expect(decodeURIComponent(callUrl)).toContain('BigPanda Onboarding');
  });

  it('includes after:YYYY-MM-DD date filter in query param', async () => {
    const adapter = new SlackAdapter(mockUserToken as any);
    await adapter.fetchContent('BigPanda', '2026-04-27T00:00:00Z');

    expect(mockFetch).toHaveBeenCalled();
    const callUrl = mockFetch.mock.calls[0][0] as string;
    // Date filter must use after: format in query string
    expect(decodeURIComponent(callUrl)).toContain('after:2026-04-27');
  });

  it('returns "[Slack #channelName] messageText" format per match', async () => {
    const adapter = new SlackAdapter(mockUserToken as any);
    const result = await adapter.fetchContent('BigPanda', '2026-04-27T00:00:00Z');

    expect(result).toContain('[Slack #general]');
    expect(result).toContain('Deployment blocked by LDAP config');
  });

  it('returns empty string when data.messages.matches is empty', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        ok: true,
        messages: { matches: [], total: 0 },
      }),
    });

    const adapter = new SlackAdapter(mockUserToken as any);
    const result = await adapter.fetchContent('BigPanda', '2026-04-27T00:00:00Z');

    expect(result).toBe('');
  });

  it('returns empty string when data.ok is false', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        ok: false,
        error: 'not_authed',
      }),
    });

    const adapter = new SlackAdapter(mockUserToken as any);
    const result = await adapter.fetchContent('BigPanda', '2026-04-27T00:00:00Z');

    expect(result).toBe('');
  });
});

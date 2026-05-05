/**
 * slack-adapter.ts — SlackAdapter implementing SourceAdapter
 *
 * Phase 84-02: Dual-mode adapter.
 *
 * OAuth mode (UserSourceToken):
 *   Uses search.messages API with xoxp- user token.
 *   Query includes projectName + after:YYYY-MM-DD date modifier.
 *   No channel IDs required — searches all channels the user can access.
 *
 * Legacy mode ({ token, channels }):
 *   Uses conversations.history API with xoxb- bot token per channel.
 *   Preserves existing behavior for orgs that have configured a bot token.
 */

import type { SourceAdapter, UserSourceToken } from './index';

// ─── Union input type for dual-mode constructor ────────────────────────────────

type SlackAdapterInput = UserSourceToken | { token: string; channels: string[] };

// ─── SlackAdapter ─────────────────────────────────────────────────────────────

export class SlackAdapter implements SourceAdapter {
  private readonly token: string;
  private readonly mode: 'oauth' | 'legacy';
  private readonly channels: string[];

  constructor(input: SlackAdapterInput) {
    if ('channels' in input) {
      // Legacy bot token path — { token, channels }
      this.token = input.token;
      this.mode = 'legacy';
      this.channels = input.channels;
    } else {
      // User OAuth token path — UserSourceToken
      this.token = input.access_token ?? '';
      this.mode = 'oauth';
      this.channels = [];
    }
  }

  async fetchContent(query: string, since: string): Promise<string> {
    if (this.mode === 'oauth') {
      return this._fetchOAuth(query, since);
    }
    return this._fetchLegacy(since);
  }

  // ─── OAuth path: search.messages ──────────────────────────────────────────

  private async _fetchOAuth(query: string, since: string): Promise<string> {
    // Parse date using UTC methods to avoid local timezone offset shifting the date
    const sinceDate = new Date(since);
    const dateStr = `${sinceDate.getUTCFullYear()}-${String(sinceDate.getUTCMonth() + 1).padStart(2, '0')}-${String(sinceDate.getUTCDate()).padStart(2, '0')}`;
    const searchQuery = `${query} after:${dateStr}`;

    // Build URL manually so spaces encode as %20 (URLSearchParams uses + for spaces,
    // which decodeURIComponent does not reverse — tests and some Slack clients expect %20)
    const url = `https://slack.com/api/search.messages?query=${encodeURIComponent(searchQuery)}&sort=timestamp&sort_dir=desc&count=20`;

    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${this.token}` },
    });

    const data = await resp.json() as {
      ok: boolean;
      error?: string;
      messages?: { matches: Array<{ text: string; channel: { name: string }; permalink: string }> };
    };

    if (!data.ok) {
      console.error(`[SlackAdapter] search.messages error: ${data.error ?? 'unknown'}`);
      return '';
    }

    const matches = data.messages?.matches ?? [];
    if (matches.length === 0) {
      return '';
    }

    return matches.map(m => `[Slack #${m.channel.name}] ${m.text}`).join('\n');
  }

  // ─── Legacy path: conversations.history ───────────────────────────────────

  private async _fetchLegacy(since: string): Promise<string> {
    if (this.channels.length === 0) {
      console.warn('[SlackAdapter] No channels configured — skipping. Add channel IDs to Settings > Source Connections > Slack.');
      return '';
    }

    // Convert ISO date to Unix epoch seconds (Slack 'oldest' parameter format)
    const oldest = String(new Date(since).getTime() / 1000);
    const parts: string[] = [];

    for (const channelId of this.channels) {
      try {
        const resp = await fetch('https://slack.com/api/conversations.history', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ channel: channelId, oldest, limit: 100 }),
        });

        const data = await resp.json() as { ok: boolean; messages?: Array<{ text?: string }> };

        if (!data.ok) {
          console.error(`[SlackAdapter] channel ${channelId}: Slack API error — ok: false`);
          continue;
        }

        const messages = data.messages ?? [];
        for (const msg of messages) {
          if (msg.text) {
            parts.push(`[Slack #${channelId}] ${msg.text}`);
          }
        }
      } catch (err) {
        console.error(
          `[SlackAdapter] channel ${channelId} fetch failed:`,
          err instanceof Error ? err.message : err,
        );
      }
    }

    return parts.join('\n');
  }
}

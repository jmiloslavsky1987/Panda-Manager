/**
 * slack-adapter.ts — SlackAdapter implementing SourceAdapter
 *
 * Phase 19.1 Plan 02: Fetches channel messages from Slack conversations.history API.
 * Auth: Bot token (xoxb-) via Bearer header.
 * oldest param: ISO date → Unix epoch seconds (Slack requirement).
 */

import type { SourceAdapter } from './index';

export class SlackAdapter implements SourceAdapter {
  private readonly token: string;
  private readonly channels: string[];

  constructor(creds: { token: string; channels: string[] }) {
    this.token = creds.token;
    this.channels = creds.channels;
  }

  async fetchContent(_query: string, since: string): Promise<string> {
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

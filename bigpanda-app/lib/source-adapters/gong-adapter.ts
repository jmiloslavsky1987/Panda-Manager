/**
 * gong-adapter.ts — GongAdapter implementing SourceAdapter
 *
 * Phase 19.1 Plan 02: Fetches call transcripts from Gong.
 * Auth: Basic Auth (base64 of accessKey:accessKeySecret).
 * Two-step: GET /v2/calls (with cursor pagination, max 3 pages) → POST /v2/calls/transcript.
 */

import type { SourceAdapter } from './index';

interface GongCall {
  id: string;
  title?: string;
}

export class GongAdapter implements SourceAdapter {
  private readonly basicAuth: string;
  private readonly baseUrl: string;

  constructor(creds: { accessKey: string; accessKeySecret: string; baseUrl: string }) {
    this.basicAuth = Buffer.from(`${creds.accessKey}:${creds.accessKeySecret}`).toString('base64');
    this.baseUrl = creds.baseUrl;
  }

  async fetchContent(_query: string, since: string): Promise<string> {
    try {
      // Step 1: List calls in date range with cursor pagination (max 3 pages)
      const callIds: string[] = [];
      let cursor: string | undefined;
      let page = 0;

      do {
        const url = new URL(`${this.baseUrl}/v2/calls`);
        url.searchParams.set('fromDateTime', since);
        if (cursor) url.searchParams.set('cursor', cursor);

        const listResp = await fetch(url.toString(), {
          headers: { Authorization: `Basic ${this.basicAuth}` },
        });

        const listData = await listResp.json() as { calls?: GongCall[]; cursor?: string };
        (listData.calls ?? []).forEach(c => callIds.push(c.id));
        cursor = listData.cursor;
        page++;
      } while (cursor && page < 3);

      if (callIds.length === 0) return '';

      // Step 2: Fetch transcripts for those call IDs
      const transcriptResp = await fetch(`${this.baseUrl}/v2/calls/transcript`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${this.basicAuth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filter: { callIds } }),
      });

      const transcriptData = await transcriptResp.json() as {
        callTranscripts?: Array<{
          callId: string;
          transcript?: Array<{
            speakerName?: string;
            sentences?: Array<{ text: string }>;
          }>;
        }>;
      };

      const parts: string[] = [];
      for (const ct of transcriptData.callTranscripts ?? []) {
        for (const seg of ct.transcript ?? []) {
          const text = (seg.sentences ?? []).map(s => s.text).join(' ');
          if (text) {
            parts.push(`[Gong Call: ${ct.callId}] ${seg.speakerName ?? 'Unknown'}: ${text}`);
          }
        }
      }

      return parts.join('\n');
    } catch (err) {
      console.error('[GongAdapter] fetch failed:', err instanceof Error ? err.message : err);
      return '';
    }
  }
}

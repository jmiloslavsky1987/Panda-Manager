// bigpanda-app/lib/source-adapters/glean-adapter.ts
// GleanAdapter — REST adapter for Glean search API.
//
// Plan 19.1-03: Implements SourceAdapter for Glean.
// Key behavior:
//   - POSTs to ${instanceUrl}/rest/api/v1/search with Bearer token
//   - Includes X-Glean-ActAs header only when actAsEmail is configured
//   - When actAsEmail is missing: logs warning (global tokens require ActAs for non-403 responses)
//   - Returns empty string on 403, non-OK, or network errors (non-fatal)

import type { SourceAdapter } from './index';

export class GleanAdapter implements SourceAdapter {
  private readonly token: string;
  private readonly instanceUrl: string;
  private readonly actAsEmail?: string;

  constructor(creds: { token: string; instanceUrl: string; actAsEmail?: string }) {
    this.token = creds.token;
    this.instanceUrl = creds.instanceUrl;
    this.actAsEmail = creds.actAsEmail;
  }

  async fetchContent(query: string, _since: string): Promise<string> {
    if (!this.actAsEmail) {
      console.warn('[GleanAdapter] actAsEmail not configured — X-Glean-ActAs header omitted; global tokens may return 403');
    }

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    };
    if (this.actAsEmail) {
      headers['X-Glean-ActAs'] = this.actAsEmail;
    }

    try {
      const resp = await fetch(`${this.instanceUrl}/rest/api/v1/search`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query, pageSize: 20 }),
      });

      if (resp.status === 403) {
        console.error('[GleanAdapter] 403 Forbidden — check actAsEmail configuration in Settings');
        return '';
      }

      if (!resp.ok) {
        console.error(`[GleanAdapter] HTTP ${resp.status} from Glean search endpoint`);
        return '';
      }

      const data = await resp.json() as {
        results?: Array<{
          title?: string;
          snippets?: Array<{ text?: string }>;
        }>;
      };

      const parts = (data.results ?? []).map(r => {
        const title = r.title ?? 'Untitled';
        const snippet = r.snippets?.[0]?.text ?? '';
        return `[Glean] ${title}: ${snippet}`;
      });

      return parts.join('\n');
    } catch (err) {
      console.error('[GleanAdapter] fetch failed:', err instanceof Error ? err.message : err);
      return '';
    }
  }
}

/**
 * source-adapters/index.ts — SourceAdapter interface, contracts, and factory.
 *
 * Wave 0 contracts: Interface and type definitions that Wave 1 adapter implementations
 * depend on. resolveAdapter fully implemented in Plan 19.1-05.
 *
 * Priority rule: REST credentials take precedence over MCP fallback.
 * null is returned when no credentials are configured — scanner emits SSE warning.
 */

import type { MCPServerConfig } from '../settings-core';
import { SlackAdapter } from './slack-adapter';
import { GongAdapter } from './gong-adapter';
import { GleanAdapter } from './glean-adapter';
import { GmailAdapter } from './gmail-adapter';
import { MCPAdapter } from './mcp-adapter';

// ─── Core Interface ───────────────────────────────────────────────────────────

export interface SourceAdapter {
  fetchContent(query: string, since: string): Promise<string>;
}

// ─── Source Type ──────────────────────────────────────────────────────────────

export type SourceName = 'slack' | 'gong' | 'glean' | 'gmail';

// ─── Org-level REST Credentials ──────────────────────────────────────────────

export interface SourceCredentials {
  slack?: {
    token: string;        // xoxb- bot token
    channels?: string[];  // channel IDs (e.g. ['C01234567']); empty = skip with warning
  };
  gong?: {
    accessKey: string;
    accessKeySecret: string;
    baseUrl: string;      // region-specific, e.g. 'https://us-6852.api.gong.io'
  };
  glean?: {
    token: string;
    instanceUrl: string;  // e.g. 'https://bigpanda-be.glean.com'
    actAsEmail?: string;  // required for global tokens
  };
}

// ─── Per-user OAuth Token (from DB) ──────────────────────────────────────────

export interface UserSourceToken {
  id: number;
  user_id: string;
  source: string;
  access_token: string | null;
  refresh_token: string;
  expires_at: Date | null;
  email: string | null;
}

// ─── MCP Tool Map ─────────────────────────────────────────────────────────────

const SOURCE_TOOL_MAP: Record<string, string> = {
  slack: 'search_messages',
  gmail: 'search_emails',
  glean: 'search_documents',
  gong: 'get_transcripts',
};

// ─── Adapter Factory ──────────────────────────────────────────────────────────

/**
 * resolveAdapter — returns the appropriate SourceAdapter for a given source.
 *
 * Priority order:
 * 1. REST credentials (org-level) — takes priority over MCP
 * 2. MCP fallback — when no REST creds but MCP server configured and enabled
 * 3. null — no credentials at all; caller should emit SSE warning and skip
 *
 * @param source         - Source name: 'slack' | 'gong' | 'glean' | 'gmail'
 * @param orgCredentials - Org-level REST credentials from settings.json
 * @param userToken      - Per-user OAuth token from DB (Gmail only)
 * @param mcpServer      - MCP server config for this source (optional fallback)
 */
export function resolveAdapter(
  source: SourceName,
  orgCredentials: SourceCredentials,
  userToken: UserSourceToken | null,
  mcpServer: MCPServerConfig | undefined,
): SourceAdapter | null {
  // REST credentials take priority over MCP (per user decision)

  if (source === 'slack' && orgCredentials.slack?.token) {
    return new SlackAdapter({
      token: orgCredentials.slack.token,
      channels: orgCredentials.slack.channels ?? [],
    });
  }

  if (
    source === 'gong' &&
    orgCredentials.gong?.accessKey &&
    orgCredentials.gong?.accessKeySecret &&
    orgCredentials.gong?.baseUrl
  ) {
    return new GongAdapter({
      accessKey: orgCredentials.gong.accessKey,
      accessKeySecret: orgCredentials.gong.accessKeySecret,
      baseUrl: orgCredentials.gong.baseUrl,
    });
  }

  if (source === 'glean' && orgCredentials.glean?.token && orgCredentials.glean?.instanceUrl) {
    return new GleanAdapter({
      token: orgCredentials.glean.token,
      instanceUrl: orgCredentials.glean.instanceUrl,
      actAsEmail: orgCredentials.glean.actAsEmail,
    });
  }

  if (source === 'gmail' && userToken) {
    return new GmailAdapter(userToken);
  }

  // MCP fallback — only when no REST credentials available
  if (mcpServer?.enabled) {
    const toolName = SOURCE_TOOL_MAP[source];
    if (toolName) {
      return new MCPAdapter(mcpServer, toolName);
    }
  }

  return null; // No credentials configured — scanner will emit SSE warning
}

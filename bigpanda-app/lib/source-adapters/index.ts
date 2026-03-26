/**
 * source-adapters/index.ts — SourceAdapter interface, contracts, and factory stub.
 *
 * Wave 0 contracts: Interface and type definitions that Wave 1 adapter implementations
 * depend on. resolveAdapter is a stub (returns null) until Plan 19.1-05 implements logic.
 */

import type { MCPServerConfig } from '../settings-core';

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

// ─── Factory Stub ─────────────────────────────────────────────────────────────
// Fully implemented in Plan 19.1-05.
// Returns null for all inputs until then; scanner emits SSE warning and skips.

export function resolveAdapter(
  _source: SourceName,
  _orgCredentials: SourceCredentials,
  _userToken: UserSourceToken | null,
  _mcpServer: MCPServerConfig | undefined,
): SourceAdapter | null {
  return null;
}

/**
 * index.test.ts — Tests for resolveAdapter factory.
 *
 * Covers: REST adapters for each source, MCP fallback, null when no creds,
 * and REST-priority-over-MCP rule (per user decision).
 *
 * Tests are GREEN after Plan 19.1-05 implements resolveAdapter.
 */
import { describe, it, expect } from 'vitest';
import { resolveAdapter, type SourceCredentials, type UserSourceToken } from './index';
import type { MCPServerConfig } from '../settings-core';

const noToken: UserSourceToken | null = null;
const noMcp: MCPServerConfig | undefined = undefined;

const slackCreds: SourceCredentials = {
  slack: { token: 'xoxb-test', channels: ['C01234567'] },
};

const gongCreds: SourceCredentials = {
  gong: { accessKey: 'key-abc', accessKeySecret: 'secret-xyz', baseUrl: 'https://us-6852.api.gong.io' },
};

const gleanCreds: SourceCredentials = {
  glean: { token: 'glean-token', instanceUrl: 'https://bigpanda-be.glean.com', actAsEmail: 'pm@bigpanda.io' },
};

const gmailUserToken: UserSourceToken = {
  id: 1,
  user_id: 'default',
  source: 'gmail',
  access_token: 'ya29-token',
  refresh_token: 'refresh-token',
  expires_at: null,
  email: 'pm@bigpanda.io',
};

const mockMcp: MCPServerConfig = {
  id: 'mcp-glean-1',
  name: 'glean',
  url: 'https://bigpanda-be.glean.com/mcp/default',
  apiKey: 'mcp-api-key',
  enabled: true,
};

describe('resolveAdapter', () => {
  it('returns a REST adapter instance when slack org credentials exist', () => {
    const adapter = resolveAdapter('slack', slackCreds, noToken, noMcp);
    expect(adapter).not.toBeNull();
    expect(typeof adapter!.fetchContent).toBe('function');
  });

  it('returns a REST adapter instance when gong org credentials exist', () => {
    const adapter = resolveAdapter('gong', gongCreds, noToken, noMcp);
    expect(adapter).not.toBeNull();
    expect(typeof adapter!.fetchContent).toBe('function');
  });

  it('returns a REST adapter instance when glean org credentials exist', () => {
    const adapter = resolveAdapter('glean', gleanCreds, noToken, noMcp);
    expect(adapter).not.toBeNull();
    expect(typeof adapter!.fetchContent).toBe('function');
  });

  it('returns GmailAdapter when userToken is provided (no REST creds for gmail)', () => {
    const adapter = resolveAdapter('gmail', {}, gmailUserToken, noMcp);
    expect(adapter).not.toBeNull();
    expect(typeof adapter!.fetchContent).toBe('function');
  });

  it('returns MCPAdapter when no REST credentials but MCP server is configured', () => {
    const adapter = resolveAdapter('glean', {}, noToken, mockMcp);
    expect(adapter).not.toBeNull();
    expect(typeof adapter!.fetchContent).toBe('function');
  });

  it('returns null when neither REST credentials nor MCP is configured', () => {
    const adapter = resolveAdapter('slack', {}, noToken, noMcp);
    expect(adapter).toBeNull();
  });

  it('returns null when gmail has no userToken and no MCP configured', () => {
    const adapter = resolveAdapter('gmail', {}, null, undefined);
    expect(adapter).toBeNull();
  });

  it('REST credentials take priority over MCP when both are configured (slack)', () => {
    const adapterWithRest = resolveAdapter('slack', slackCreds, noToken, mockMcp);
    const adapterMcpOnly = resolveAdapter('slack', {}, noToken, mockMcp);

    expect(adapterWithRest).not.toBeNull();
    expect(adapterMcpOnly).not.toBeNull();

    // Both return adapters — REST case should return SlackAdapter (not MCPAdapter)
    // MCPAdapter is used for Anthropic API; REST adapters use direct HTTP
    // Verify constructor names differ
    expect(adapterWithRest!.constructor.name).toBe('SlackAdapter');
    expect(adapterMcpOnly!.constructor.name).toBe('MCPAdapter');
  });

  it('returns null when MCP server is disabled even if no REST creds', () => {
    const disabledMcp: MCPServerConfig = { ...mockMcp, enabled: false };
    const adapter = resolveAdapter('glean', {}, noToken, disabledMcp);
    expect(adapter).toBeNull();
  });
});

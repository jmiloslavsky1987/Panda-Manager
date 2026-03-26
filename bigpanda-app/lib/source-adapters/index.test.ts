/**
 * index.test.ts — RED test stubs for resolveAdapter factory.
 *
 * resolveAdapter currently returns null for all inputs (stub).
 * Tests asserting REST or MCP adapter instances will fail RED until Plan 19.1-05.
 */
import { describe, it, expect } from 'vitest';
import { resolveAdapter, type SourceCredentials, type UserSourceToken } from './index';
import type { MCPServerConfig } from '../settings-core';

const noToken: UserSourceToken | null = null;
const noMcp: MCPServerConfig | undefined = undefined;

const slackCreds: SourceCredentials = {
  slack: { token: 'xoxb-test', channels: ['C01234567'] },
};

const mockMcp: MCPServerConfig = {
  id: 'mcp-glean-1',
  name: 'glean',
  url: 'https://bigpanda-be.glean.com/mcp/default',
  apiKey: 'mcp-api-key',
  enabled: true,
};

describe('resolveAdapter', () => {
  it('returns a REST adapter instance when org credentials exist for that source', () => {
    const adapter = resolveAdapter('slack', slackCreds, noToken, noMcp);
    // Stub returns null — this will be RED until Plan 19.1-05
    expect(adapter).not.toBeNull();
    expect(typeof adapter!.fetchContent).toBe('function');
  });

  it('returns MCPAdapter when no REST credentials but MCP server is configured', () => {
    const adapter = resolveAdapter('glean', {}, noToken, mockMcp);
    // Stub returns null — this will be RED until Plan 19.1-05
    expect(adapter).not.toBeNull();
    expect(typeof adapter!.fetchContent).toBe('function');
  });

  it('returns null when neither REST credentials nor MCP is configured', () => {
    const adapter = resolveAdapter('slack', {}, noToken, noMcp);
    expect(adapter).toBeNull();
  });
});

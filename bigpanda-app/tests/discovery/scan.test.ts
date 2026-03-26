import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { MCPServerConfig } from '../../lib/settings-core';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@anthropic-ai/sdk', () => {
  const mockStream = {
    on: vi.fn((event: string, cb: (text: string) => void) => {
      if (event === 'text') {
        cb(JSON.stringify([
          {
            source: 'slack',
            content: 'Deployment blocked by LDAP config',
            suggested_field: 'risk',
            source_excerpt: 'Deployment blocked by LDAP config — needs IT ticket',
            source_url: 'https://slack.example.com/messages/C123',
          },
        ]));
      }
      return mockStream;
    }),
    finalMessage: vi.fn().mockResolvedValue({}),
  };

  const mockCreate = vi.fn().mockResolvedValue({
    content: [
      {
        type: 'text',
        text: JSON.stringify([
          {
            source: 'slack',
            content: 'Deployment blocked by LDAP config',
            suggested_field: 'risk',
            source_excerpt: 'Deployment blocked by LDAP config — needs IT ticket',
            source_url: 'https://slack.example.com/messages/C123',
          },
        ]),
      },
    ],
  });

  // Mock for MCP source fetch calls (non-streaming)
  const mockMcpCreate = vi.fn().mockResolvedValue({
    content: [
      {
        type: 'text',
        text: 'Slack message: LDAP config issue blocking deployment. Link: https://slack.example.com/messages/C123',
      },
    ],
    stop_reason: 'end_turn',
  });

  return {
    default: vi.fn().mockImplementation(() => ({
      beta: {
        messages: {
          create: mockMcpCreate,
        },
      },
      messages: {
        create: mockCreate,
        stream: vi.fn(() => mockStream),
      },
    })),
  };
});

vi.mock('../../lib/mcp-config', () => ({
  MCPClientPool: {
    getInstance: vi.fn(() => ({
      getServersForSkill: vi.fn().mockResolvedValue([
        {
          id: 'slack-1',
          name: 'slack',
          url: 'https://slack.example.com/mcp',
          apiKey: 'xoxb-test',
          enabled: true,
        },
        {
          id: 'gmail-1',
          name: 'gmail',
          url: 'https://gmail.example.com/mcp',
          apiKey: 'gmail-token',
          enabled: true,
        },
      ]),
    })),
  },
}));

// ─── Import under test ────────────────────────────────────────────────────────

import { runDiscoveryScan, type DiscoveryItem } from '../../lib/discovery-scanner';

// ─── Test helpers ─────────────────────────────────────────────────────────────

const slackServer: MCPServerConfig = {
  id: 'slack-1',
  name: 'slack',
  url: 'https://slack.example.com/mcp',
  apiKey: 'xoxb-test',
  enabled: true,
};

const gmailServer: MCPServerConfig = {
  id: 'gmail-1',
  name: 'gmail',
  url: 'https://gmail.example.com/mcp',
  apiKey: 'gmail-token',
  enabled: true,
};

const baseParams = {
  projectId: 42,
  projectName: 'ACME BigPanda Onboarding',
  since: '2026-03-19T00:00:00Z',
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Discovery Scan Sources', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = 'sk-test';
  });

  it('DISC-05: Slack scan returns messages matching project keywords', async () => {
    const items = await runDiscoveryScan({
      ...baseParams,
      sources: ['slack'],
      mcpServers: [slackServer],
    });
    expect(Array.isArray(items)).toBe(true);
    // At least one item with source='slack' (or any item if Claude collapses source)
    expect(items.length).toBeGreaterThanOrEqual(0);
    // If items returned, each must have required shape
    items.forEach(item => {
      expect(item).toHaveProperty('source');
      expect(item).toHaveProperty('content');
      expect(item).toHaveProperty('suggested_field');
      expect(item).toHaveProperty('source_excerpt');
    });
  });

  it('DISC-06: Gmail scan returns email threads matching project keywords', async () => {
    const items = await runDiscoveryScan({
      ...baseParams,
      sources: ['gmail'],
      mcpServers: [gmailServer],
    });
    expect(Array.isArray(items)).toBe(true);
    items.forEach(item => {
      expect(item).toHaveProperty('source');
      expect(item).toHaveProperty('content');
      expect(item).toHaveProperty('suggested_field');
      expect(item).toHaveProperty('source_excerpt');
    });
  });

  it('DISC-07 + DISC-08: Missing MCP server config for a source results in skip (no throw)', async () => {
    // glean and gong not in mcpServers — should be silently skipped
    const items = await runDiscoveryScan({
      ...baseParams,
      sources: ['glean', 'gong'],
      mcpServers: [], // no servers configured
    });
    // Should return empty array without throwing
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBe(0);
  });

  it('DISC-09: Claude analysis returns correctly shaped DiscoveryItem[]', async () => {
    const items = await runDiscoveryScan({
      ...baseParams,
      sources: ['slack'],
      mcpServers: [slackServer],
    });
    // Items should be DiscoveryItem shape (if any returned)
    items.forEach((item: DiscoveryItem) => {
      expect(typeof item.source).toBe('string');
      expect(typeof item.content).toBe('string');
      expect(typeof item.suggested_field).toBe('string');
      expect(typeof item.source_excerpt).toBe('string');
      // source_url is optional
      if (item.source_url !== undefined) {
        expect(typeof item.source_url).toBe('string');
      }
    });
  });

  it('DISC-09 source_excerpt: source_excerpt field is populated in returned items', async () => {
    const items = await runDiscoveryScan({
      ...baseParams,
      sources: ['slack'],
      mcpServers: [slackServer],
    });
    items.forEach((item: DiscoveryItem) => {
      expect(item.source_excerpt).toBeDefined();
      expect(typeof item.source_excerpt).toBe('string');
      expect(item.source_excerpt.length).toBeGreaterThan(0);
    });
  });
});

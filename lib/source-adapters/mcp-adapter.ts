// bigpanda-app/lib/source-adapters/mcp-adapter.ts
// MCPAdapter — SourceAdapter wrapper around the Anthropic beta MCP API.
//
// Plan 19.1-03: Pure extraction of the MCP call pattern from discovery-scanner.ts.
// The anthropic.beta.messages.create call and response extraction logic are
// preserved verbatim — this is the SRC-07 backward compatibility guarantee.
//
// discovery-scanner.ts is NOT modified in this plan (refactor happens in Plan 19.1-05).

import Anthropic from '@anthropic-ai/sdk';
import type { SourceAdapter } from './index';
import type { MCPServerConfig } from '../settings-core';

const MODEL = 'claude-sonnet-4-6';

export class MCPAdapter implements SourceAdapter {
  private readonly anthropic: Anthropic;

  constructor(
    private readonly server: MCPServerConfig,
    private readonly toolName: string, // e.g. 'search_messages', 'search_emails', 'search_documents', 'get_transcripts'
  ) {
    this.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  async fetchContent(query: string, since: string): Promise<string> {
    const searchPrompt = `Search for recent communications about "${query}" since ${since}. ` +
      `Use the ${this.toolName} tool to retrieve relevant content.`;

    const resp = await this.anthropic.beta.messages.create(
      {
        model: MODEL,
        max_tokens: 4096,
        mcp_servers: [
          {
            type: 'url' as const,
            url: this.server.url,
            name: this.server.name,
            authorization_token: this.server.apiKey,
          },
        ],
        tools: [
          {
            type: 'mcp_toolset' as const,
            mcp_server_name: this.server.name,
          },
        ],
        messages: [{ role: 'user', content: searchPrompt }],
      },
      { headers: { 'anthropic-beta': 'mcp-client-2025-11-20' } },
    );

    const textParts = resp.content
      .filter((block: { type: string }) => block.type === 'text')
      .map((block: { type: string; text?: string }) => (block as { type: string; text: string }).text)
      .join('\n');

    return textParts;
  }
}

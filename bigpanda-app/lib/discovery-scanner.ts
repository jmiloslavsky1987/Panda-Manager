// bigpanda-app/lib/discovery-scanner.ts
// Discovery scan service — fetches content from configured MCP sources (Slack, Gmail, Glean, Gong)
// then uses Claude to extract structured DiscoveryItem records.
//
// Called by: app/api/discovery/scan/route.ts
// Pattern: MCP beta API (same as skill-orchestrator.ts) + jsonrepair fallback (same as 18-06)

import Anthropic from '@anthropic-ai/sdk';
import { jsonrepair } from 'jsonrepair';
import type { MCPServerConfig } from './settings-core';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DiscoveryItem {
  source: string;
  content: string;
  suggested_field: string;
  source_excerpt: string;
  source_url?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MODEL = 'claude-sonnet-4-6';

// Maps source name to the primary MCP tool name to invoke
const SOURCE_TOOL_MAP: Record<string, string> = {
  slack: 'search_messages',
  gmail: 'search_emails',
  glean: 'search_documents',
  gong: 'get_transcripts',
};

const DISCOVERY_SYSTEM = `You are analyzing communication data for a BigPanda implementation project. \
Extract structured items that represent: action items, decisions, risks, blockers, or status updates. \
For each item, return JSON with: source (the communication channel this came from), content (the extracted insight), \
suggested_field (one of: action|risk|decision|milestone|stakeholder), \
source_excerpt (verbatim 100-200 char snippet from source), \
source_url (if available). \
Return ONLY a JSON array — no prose, no markdown fences.`;

// ─── Params ───────────────────────────────────────────────────────────────────

export interface DiscoveryScanParams {
  projectId: number;
  projectName: string;
  sources: string[];
  since: string;
  mcpServers: MCPServerConfig[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseDiscoveryItems(text: string): DiscoveryItem[] {
  const stripped = text.trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();
  try {
    const repaired = jsonrepair(stripped);
    const parsed = JSON.parse(repaired);
    return Array.isArray(parsed) ? (parsed as DiscoveryItem[]) : [];
  } catch {
    return [];
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * runDiscoveryScan — fetches content from each configured MCP source, then calls
 * Claude to extract structured DiscoveryItem[] from the combined results.
 *
 * @param params.projectId   - DB project ID (for context)
 * @param params.projectName - Human-readable customer/project name (used as search query)
 * @param params.sources     - Source names to query: ['slack', 'gmail', 'glean', 'gong']
 * @param params.since       - ISO timestamp for date-filtering source results
 * @param params.mcpServers  - Active MCPServerConfig entries (pre-filtered by caller)
 * @returns DiscoveryItem[] extracted and shaped by Claude
 */
export async function runDiscoveryScan(params: DiscoveryScanParams): Promise<DiscoveryItem[]> {
  const { projectName, sources, since, mcpServers } = params;

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Map server name → config for O(1) lookup
  const serverByName = new Map<string, MCPServerConfig>(
    mcpServers.map(s => [s.name, s])
  );

  // ─── Phase 1: Fetch from each source via MCP ─────────────────────────────────
  const sourceResults: Record<string, string> = {};

  for (const source of sources) {
    const server = serverByName.get(source);
    if (!server || !server.enabled) {
      console.warn(`[discovery-scanner] No enabled MCP server found for source '${source}' — skipping`);
      continue;
    }

    const toolName = SOURCE_TOOL_MAP[source];
    if (!toolName) {
      console.warn(`[discovery-scanner] Unknown source '${source}' — no tool mapping — skipping`);
      continue;
    }

    const searchPrompt = `Search for recent communications about "${projectName}" since ${since}. ` +
      `Use the ${toolName} tool to retrieve relevant ${source} content.`;

    try {
      // Use Anthropic beta MCP API (same pattern as skill-orchestrator.ts)
      const resp = await anthropic.beta.messages.create(
        {
          model: MODEL,
          max_tokens: 4096,
          mcp_servers: [
            {
              type: 'url' as const,
              url: server.url,
              name: server.name,
              authorization_token: server.apiKey,
            },
          ],
          tools: [
            {
              type: 'mcp_toolset' as const,
              mcp_server_name: server.name,
            },
          ],
          messages: [{ role: 'user', content: searchPrompt }],
        },
        { headers: { 'anthropic-beta': 'mcp-client-2025-11-20' } }
      );

      // Extract text content from response
      const textParts = resp.content
        .filter((block: { type: string }) => block.type === 'text')
        .map((block: { type: string; text?: string }) => (block as { type: string; text: string }).text)
        .join('\n');

      if (textParts) {
        sourceResults[source] = textParts;
        console.log(`[discovery-scanner] ${source}: fetched ${textParts.length} chars`);
      } else {
        console.log(`[discovery-scanner] ${source}: no text content returned`);
      }
    } catch (err) {
      console.error(`[discovery-scanner] ${source} fetch failed:`, err instanceof Error ? err.message : err);
      // Continue with other sources — partial results are valid
    }
  }

  // If no source results, return empty array
  if (Object.keys(sourceResults).length === 0) {
    return [];
  }

  // ─── Phase 2: Claude analysis of combined results ─────────────────────────────

  const combinedPrompt = Object.entries(sourceResults)
    .map(([src, text]) => `=== ${src.toUpperCase()} RESULTS ===\n${text}`)
    .join('\n\n');

  const userMessage = `Analyze the following communication data for the project "${projectName}" ` +
    `and extract all actionable items, decisions, risks, and status updates.\n\n${combinedPrompt}`;

  let analysisText = '';

  try {
    // Use streaming for analysis call (same pattern as extract route)
    const stream = anthropic.messages.stream({
      model: MODEL,
      max_tokens: 8192,
      system: DISCOVERY_SYSTEM,
      messages: [{ role: 'user', content: userMessage }],
    });

    stream.on('text', (text: string) => {
      analysisText += text;
    });

    await stream.finalMessage();
  } catch (err) {
    console.error('[discovery-scanner] Claude analysis failed:', err instanceof Error ? err.message : err);
    return [];
  }

  // Parse accumulated response — never mid-stream
  const items = parseDiscoveryItems(analysisText);

  console.log(`[discovery-scanner] analysis complete: ${items.length} items extracted`);

  return items;
}

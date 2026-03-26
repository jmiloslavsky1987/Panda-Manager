// bigpanda-app/lib/discovery-scanner.ts
// Discovery scan service — fetches content from configured sources via adapter pattern,
// then uses Claude to extract structured DiscoveryItem records.
//
// Called by: app/api/discovery/scan/route.ts
// Pattern: Adapter factory (resolveAdapter) selects correct adapter per source.
//          Claude analysis uses streaming (same as skill-orchestrator.ts + 18-06).
//          jsonrepair fallback for malformed JSON (same as 18-06).

import Anthropic from '@anthropic-ai/sdk';
import { jsonrepair } from 'jsonrepair';
import type { MCPServerConfig } from './settings-core';
import {
  resolveAdapter,
  type SourceCredentials,
  type UserSourceToken,
  type SourceName,
} from './source-adapters/index';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DiscoveryItem {
  source: string;
  content: string;
  suggested_field: string;
  source_excerpt: string;
  source_url?: string;
  likely_duplicate?: boolean;   // true when Claude determines item duplicates existing project data
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MODEL = 'claude-sonnet-4-6';

const DISCOVERY_SYSTEM = `You are analyzing communication data for a BigPanda implementation project. \
Extract structured items that represent: action items, decisions, risks, blockers, or status updates. \
For each item, return JSON with: source (the communication channel), content (the extracted insight), \
suggested_field (one of: action|risk|decision|milestone|stakeholder), \
source_excerpt (verbatim 100-200 char snippet from source), \
source_url (if available), \
likely_duplicate (boolean: true if this item appears to already be captured in the existing project data provided, false otherwise). \
Return ONLY a JSON array — no prose, no markdown fences.`;

// ─── Params ───────────────────────────────────────────────────────────────────

export interface DiscoveryScanParams {
  projectId: number;
  projectName: string;
  sources: string[];
  since: string;
  mcpServers: MCPServerConfig[];        // preserved for MCP fallback via MCPAdapter
  source_credentials: SourceCredentials; // org-level REST credentials from settings.json
  userTokens: UserSourceToken[];         // per-user OAuth tokens from DB (Gmail)
  existingProjectSummary: string;        // compact summary of current project items for dedup context
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
 * runDiscoveryScan — fetches content from each configured source via adapter pattern,
 * then calls Claude to extract structured DiscoveryItem[] from the combined results.
 *
 * Phase 1: For each source, resolveAdapter selects the best adapter:
 *   - REST adapter when org credentials configured (Slack/Gong/Glean) or user token (Gmail)
 *   - MCPAdapter as fallback when MCP server is configured and enabled
 *   - null → warn and skip (no credentials configured)
 *
 * Phase 2: Claude streaming analysis extracts structured items from combined source data.
 *
 * @param params.projectId          - DB project ID (for context)
 * @param params.projectName        - Human-readable customer/project name (search query)
 * @param params.sources            - Source names to query: ['slack', 'gmail', 'glean', 'gong']
 * @param params.since              - ISO timestamp for date-filtering source results
 * @param params.mcpServers         - Active MCPServerConfig entries (MCP fallback path)
 * @param params.source_credentials - Org-level REST credentials from settings.json
 * @param params.userTokens         - Per-user OAuth tokens from DB (Gmail OAuth)
 * @returns DiscoveryItem[] extracted and shaped by Claude
 */
export async function runDiscoveryScan(params: DiscoveryScanParams): Promise<DiscoveryItem[]> {
  const { projectName, sources, since, mcpServers, source_credentials, userTokens, existingProjectSummary } = params;

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Map server name → config for O(1) lookup
  const serverByName = new Map<string, MCPServerConfig>(
    mcpServers.map(s => [s.name, s])
  );

  // ─── Phase 1: Fetch from each source via adapter ──────────────────────────────
  const sourceResults: Record<string, string> = {};

  for (const source of sources) {
    const server = serverByName.get(source);
    const userToken = userTokens.find(t => t.source === source) ?? null;
    const adapter = resolveAdapter(
      source as SourceName,
      source_credentials,
      userToken,
      server?.enabled ? server : undefined,
    );

    if (!adapter) {
      console.warn(
        `[discovery-scanner] No credentials for source '${source}' — skipping. ` +
        `Configure in Settings > Source Connections.`
      );
      continue;
    }

    try {
      const content = await adapter.fetchContent(projectName, since);
      if (content) {
        sourceResults[source] = content;
        console.log(
          `[discovery-scanner] ${source}: fetched ${content.length} chars via ${adapter.constructor.name}`
        );
      } else {
        console.log(`[discovery-scanner] ${source}: no content returned`);
      }
    } catch (err) {
      console.error(
        `[discovery-scanner] ${source} fetch failed:`,
        err instanceof Error ? err.message : err
      );
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

  const projectContextSection = existingProjectSummary
    ? `\n\n=== EXISTING PROJECT DATA (for deduplication) ===\n${existingProjectSummary}\n\nFor each item you extract, set "likely_duplicate": true if it appears to already be captured in the existing project data above, false otherwise. A likely duplicate means the core insight or action item is already tracked — even if worded differently.`
    : '';

  const userMessage =
    `Analyze the following communication data for the project "${projectName}" ` +
    `and extract all actionable items, decisions, risks, and status updates.${projectContextSection}\n\n${combinedPrompt}`;

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

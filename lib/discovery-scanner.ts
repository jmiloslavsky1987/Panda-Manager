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
  entity_match?: string;                        // NEW: existing entity name to enrich
  suggested_position?: { after: string };       // NEW: workflow_step only — insert after this step
}

export interface DiscoveryScanResult {
  items: DiscoveryItem[];
  sourceSummary: Record<string, { fetched: number; skipped: boolean; reason?: string }>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MODEL = 'claude-sonnet-4-6';

export const DISCOVERY_SYSTEM_TEMPLATE = `You are analyzing communication data for a BigPanda implementation project.
Extract structured items representing substantive project intelligence. Skip scheduling noise (meeting invites, cancellations, rescheduling, attendance confirmations) — only extract items if they contain a concrete action, decision, risk, technical update, or meaningful progress note.

For each item return JSON with fields:
  source: communication channel name
  content: extracted insight (plain text for most types; JSON string for arch_node, workflow, workflow_step, team_engagement — see below)
  suggested_field: one of the valid types listed below
  source_excerpt: verbatim 100-200 char snippet from source
  source_url: if available
  likely_duplicate: true if this maps to existing project data, false otherwise
  entity_match: (optional) for workflow_step, history-on-workflow, and team_engagement — set to the EXACT name from the existing structure list below. For workflows the list shows "Team / WorkflowName" format — use ONLY the workflow_name portion after the slash (e.g. for "GOC / MIM/GOC Major Incident Management Workflow (Biggy)" use "GOC Major Incident Management Workflow (Biggy)"). For engagement sections use the exact section name.
  suggested_position: (optional, workflow_step only) JSON object {"after": "<existing step label>"}

Valid suggested_field values:
  action — a concrete task or next step assigned to someone
  risk — a concern, blocker, or potential issue
  decision — a confirmed choice or direction that was made
  milestone — a key date, deadline, or deliverable
  history — significant status update or progress note (NOT scheduling/logistics)
  task — a work item to track (title only in content)
  team_engagement — update to an existing engagement section; content must be JSON: {"name":"<section name>","content":"<section text>"}
  arch_track — a new architecture pipeline track; track name only in content
  arch_node — a NEW capability stage in a pipeline (NOT a tool/vendor); content must be JSON: {"name":"<stage name>","track_name":"<track name>"}
  workflow — a new team workflow; content must be JSON: {"team_name":"<team>","workflow_name":"<workflow name>"}
  workflow_step — a step in a workflow; content must be JSON: {"label":"<step label>","workflow_name":"<workflow name>"}
  business_outcome — a business objective or desired outcome
  integration — a specific tool, product, or vendor (e.g. NetBrain, Dynatrace, ServiceNow); ALWAYS use this for named tools/products, never arch_node

Classification rules:
  - A meeting being scheduled, cancelled, or rescheduled with no substantive content → SKIP entirely
  - A working session that produced decisions or updates → extract the decisions/updates, not the meeting itself
  - Named tools or vendors → integration, never arch_node
  - Concrete progress on an existing workflow (e.g. "GOC onboarding started", "TOPS environment configured") → workflow_step with entity_match set to the matching workflow_name from the list
  - A new step being added to a workflow → workflow_step with entity_match set to the workflow_name
  - Updates to engagement sections (Teams, Architecture, etc.) → team_engagement with entity_match set to the section name
  - If unsure between workflow_step and history, prefer workflow_step when the item describes something that happened within a named workflow

Three product tracks exist in this codebase: ADR, Biggy (AI Assistant), and Incident Prevention. Match entities to the appropriate track based on document content. The Incident Prevention track covers change-ticket risk scoring (cues: change ticket, change request, CHG-, RFC, CAB / change advisory board, risk score, change risk, ServiceNow change, JSM change, blast radius, freeze window, 5-category weighted risk).

Existing project structure:
{existingStructureBlock}

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
  existingStructure?: {                  // enrichment context: existing arch tracks, workflows, engagement sections
    tracks: string[];
    workflows: string[];
    sections: string[];
  };
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
 * @returns DiscoveryScanResult with items and sourceSummary (per-source fetch stats)
 */
export async function runDiscoveryScan(params: DiscoveryScanParams): Promise<DiscoveryScanResult> {
  const { projectName, sources, since, mcpServers, source_credentials, userTokens, existingProjectSummary, existingStructure } = params;

  // Build existing structure block for DISCOVERY_SYSTEM prompt interpolation
  const existingStructureBlock = existingStructure
    ? [
        `Tracks: ${existingStructure.tracks.length > 0 ? existingStructure.tracks.join(', ') : 'none'}`,
        `Workflows (use exact workflow_name for entity_match): ${existingStructure.workflows.length > 0 ? existingStructure.workflows.map(w => w.split('/').pop()!.trim()).join(', ') : 'none'}`,
        `Engagement sections: ${existingStructure.sections.length > 0 ? existingStructure.sections.join(', ') : 'none'}`,
      ].join('\n')
    : 'Tracks: none\nWorkflows: none\nEngagement sections: none';

  const DISCOVERY_SYSTEM = DISCOVERY_SYSTEM_TEMPLATE.replace('{existingStructureBlock}', existingStructureBlock);

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Map server name → config for O(1) lookup
  const serverByName = new Map<string, MCPServerConfig>(
    mcpServers.map(s => [s.name, s])
  );

  // ─── Phase 1: Fetch from each source via adapter ──────────────────────────────
  const sourceResults: Record<string, string> = {};
  const sourceSummary: Record<string, { fetched: number; skipped: boolean; reason?: string }> = {};

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
      sourceSummary[source] = { fetched: 0, skipped: true, reason: 'no credentials' };
      continue;
    }

    try {
      const content = await adapter.fetchContent(projectName, since);
      if (content) {
        sourceResults[source] = content;
        const fetchedCount = content.split('\n').filter(Boolean).length;
        sourceSummary[source] = { fetched: fetchedCount, skipped: false };
        console.log(
          `[discovery-scanner] ${source}: fetched ${content.length} chars via ${adapter.constructor.name}`
        );
      } else {
        sourceSummary[source] = { fetched: 0, skipped: false };
        console.log(`[discovery-scanner] ${source}: no content returned`);
      }
    } catch (err) {
      console.error(
        `[discovery-scanner] ${source} fetch failed:`,
        err instanceof Error ? err.message : err
      );
      sourceSummary[source] = { fetched: 0, skipped: true, reason: 'fetch error' };
      // Continue with other sources — partial results are valid
    }
  }

  // If no source results, return empty items with sourceSummary
  if (Object.keys(sourceResults).length === 0) {
    return { items: [], sourceSummary };
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
    return { items: [], sourceSummary };
  }

  // Parse accumulated response — never mid-stream
  const items = parseDiscoveryItems(analysisText);

  console.log(`[discovery-scanner] analysis complete: ${items.length} items extracted`);

  return { items, sourceSummary };
}

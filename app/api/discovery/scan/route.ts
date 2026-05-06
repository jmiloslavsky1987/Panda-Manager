// bigpanda-app/app/api/discovery/scan/route.ts
// POST /api/discovery/scan — SSE endpoint for external discovery scanning.
//
// Fetches content from configured MCP sources (Slack, Gmail, Glean, Gong),
// runs Claude analysis via runDiscoveryScan(), deduplicates against dismissed
// items (DISC-15), and inserts new DiscoveryItem records to discovery_items.
//
// SSE event shapes:
//   { type: 'progress', message: string }
//   { type: 'complete', itemCount: number, newItems: number, skippedDups: number }
//   { type: 'error', message: string }

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { and, eq, ilike } from 'drizzle-orm';
import { db } from '@/db';
import { projects, discoveryItems, userSourceTokens, actions, risks, stakeholders, archTracks, e2eWorkflows, teamEngagementSections } from '@/db/schema';
import { MCPClientPool } from '@/lib/mcp-config';
import { readSettings } from '@/lib/settings-core';
import { runDiscoveryScan, type DiscoveryItem, type DiscoveryScanResult } from '@/lib/discovery-scanner';
import { requireSession } from "@/lib/auth-server";

export const dynamic = 'force-dynamic';

// ─── Request schema ───────────────────────────────────────────────────────────

const ScanRequestSchema = z.object({
  projectId: z.number().int().positive(),
  sources: z.array(z.enum(['slack', 'gmail', 'glean', 'gong'])).min(1),
  since: z.string().optional(),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sevenDaysAgo(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString();
}

function normalizeContent(value: string | undefined | null): string {
  if (!value) return '';
  return value.toLowerCase().trim().slice(0, 120);
}

/**
 * Dedup check: returns true if a dismissed item with same (project_id, source, content prefix)
 * already exists in discovery_items (DISC-15 — dismissed items don't reappear).
 */
async function isDismissedDuplicate(
  item: DiscoveryItem,
  projectId: number
): Promise<boolean> {
  const contentKey = normalizeContent(item.content);
  if (!contentKey) return false;

  const rows = await db
    .select({ id: discoveryItems.id })
    .from(discoveryItems)
    .where(
      and(
        eq(discoveryItems.project_id, projectId),
        eq(discoveryItems.source, item.source),
        ilike(discoveryItems.content, `${contentKey}%`),
        eq(discoveryItems.status, 'dismissed'),
      )
    );

  return rows.length > 0;
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<Response> {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parseResult = ScanRequestSchema.safeParse(body);
  if (!parseResult.success) {
    return Response.json(
      { error: 'projectId (integer), sources (non-empty array) are required' },
      { status: 400 }
    );
  }

  const { projectId, sources, since } = parseResult.data;
  const scanStart = new Date();
  const scanId = `scan-${projectId}-${scanStart.getTime()}`;
  const sinceTimestamp = since ?? sevenDaysAgo();

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      (async () => {
        const sendEvent = (payload: Record<string, unknown>) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(payload)}\n\n`)
          );
        };

        try {
          // 1. Look up project name from DB
          const [project] = await db
            .select({ id: projects.id, name: projects.name, customer: projects.customer })
            .from(projects)
            .where(eq(projects.id, projectId));

          if (!project) {
            sendEvent({ type: 'error', message: `Project ${projectId} not found` });
            controller.close();
            return;
          }

          const projectName = project.customer || project.name;

          // 1b. Build compact project context for dedup analysis + enrichment
          // Fetch existing actions, risks, stakeholders (limit 50 each to stay within token budget)
          // Also fetch arch tracks, workflows, and engagement sections for Claude enrichment context
          const [
            existingActions,
            existingRisks,
            existingStakeholders,
            existingTracks,
            existingWorkflows,
            existingEngagementSections,
          ] = await Promise.all([
            db.select({ id: actions.id, title: actions.description, status: actions.status })
              .from(actions).where(eq(actions.project_id, projectId)).limit(50),
            db.select({ id: risks.id, title: risks.description, status: risks.status })
              .from(risks).where(eq(risks.project_id, projectId)).limit(50),
            db.select({ id: stakeholders.id, name: stakeholders.name, role: stakeholders.role })
              .from(stakeholders).where(eq(stakeholders.project_id, projectId)).limit(50),
            db.select({ name: archTracks.name })
              .from(archTracks).where(eq(archTracks.project_id, projectId)),
            db.select({ team_name: e2eWorkflows.team_name, workflow_name: e2eWorkflows.workflow_name })
              .from(e2eWorkflows).where(eq(e2eWorkflows.project_id, projectId)),
            db.select({ name: teamEngagementSections.name })
              .from(teamEngagementSections).where(eq(teamEngagementSections.project_id, projectId)),
          ]);

          const existingProjectSummary = [
            existingActions.length > 0
              ? `Actions:\n${existingActions.map(a => `- [${a.status}] ${a.title}`).join('\n')}`
              : null,
            existingRisks.length > 0
              ? `Risks:\n${existingRisks.map(r => `- [${r.status}] ${r.title}`).join('\n')}`
              : null,
            existingStakeholders.length > 0
              ? `Stakeholders:\n${existingStakeholders.map(s => `- ${s.name} (${s.role ?? 'unknown role'})`).join('\n')}`
              : null,
          ].filter(Boolean).join('\n\n');

          // 2. Read org-level source credentials and user OAuth tokens in parallel
          const [settings, dbUserTokens, allMcpServers] = await Promise.all([
            readSettings(),
            db.select().from(userSourceTokens).where(eq(userSourceTokens.user_id, 'default')),
            MCPClientPool.getInstance().getServersForSkill('discovery-scan'),
          ]);

          const source_credentials = settings.source_credentials ?? {};

          // 3. Filter MCP servers to only requested sources (case-insensitive name match)
          // MCP servers act as fallback when no REST credentials are configured for a source
          const mcpServers = allMcpServers.filter(s =>
            sources.includes(s.name.toLowerCase() as 'slack' | 'gmail' | 'glean' | 'gong')
          );

          // 4. Stream per-source progress events
          for (const source of sources) {
            sendEvent({ type: 'progress', message: `Scanning ${source}…` });
          }

          // 5. Run discovery scan — adapter selection happens inside scanner
          sendEvent({ type: 'progress', message: 'Analyzing results with Claude…' });

          const { items: discoveryResults, sourceSummary } = await runDiscoveryScan({
            projectId,
            projectName,
            sources,
            since: sinceTimestamp,
            mcpServers,
            source_credentials,
            userTokens: dbUserTokens,
            existingProjectSummary,
            existingStructure: {
              tracks: existingTracks.map(t => t.name),
              workflows: existingWorkflows.map(w => `${w.team_name}/${w.workflow_name}`),
              sections: existingEngagementSections.map(s => s.name),
            },
          });

          sendEvent({ type: 'progress', message: `Processing ${discoveryResults.length} discovered items…` });

          // 6. Dedup + insert
          let newItemCount = 0;
          let skippedDups = 0;

          for (const item of discoveryResults) {
            // Check for dismissed duplicate (DISC-15)
            const isDup = await isDismissedDuplicate(item, projectId);
            if (isDup) {
              skippedDups++;
              continue;
            }

            // Insert new item
            await db.insert(discoveryItems).values({
              project_id: projectId,
              source: item.source,
              content: item.content,
              suggested_field: item.suggested_field,
              status: 'pending',
              scan_timestamp: scanStart,
              source_url: item.source_url ?? null,
              source_excerpt: item.source_excerpt,
              scan_id: scanId,
              likely_duplicate: item.likely_duplicate ?? false,
              entity_match: item.entity_match ?? null,                  // NEW
              suggested_position: item.suggested_position               // NEW
                ? JSON.stringify(item.suggested_position)
                : null,
            });

            newItemCount++;
          }

          // 7. Complete
          sendEvent({
            type: 'complete',
            itemCount: discoveryResults.length,
            newItems: newItemCount,
            skippedDups,
            sourceSummary,
          });

          controller.close();
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          console.error('[discovery/scan] Error:', message);
          sendEvent({ type: 'error', message });
          controller.close();
        }
      })();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}

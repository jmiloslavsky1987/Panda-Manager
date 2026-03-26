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
import { projects, discoveryItems } from '@/db/schema';
import { MCPClientPool } from '@/lib/mcp-config';
import { runDiscoveryScan, type DiscoveryItem } from '@/lib/discovery-scanner';

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

          // 2. Get MCP server configs for discovery-scan skill
          const allMcpServers = await MCPClientPool.getInstance().getServersForSkill('discovery-scan');

          // 3. Filter to only requested sources (case-insensitive name match)
          const mcpServers = allMcpServers.filter(s =>
            sources.includes(s.name.toLowerCase() as 'slack' | 'gmail' | 'glean' | 'gong')
          );

          // 3a. Warn clearly for sources with no configured MCP connection
          const configuredSources = new Set(mcpServers.map(s => s.name.toLowerCase()));
          const unconfiguredSources = sources.filter(s => !configuredSources.has(s));
          if (unconfiguredSources.length > 0) {
            sendEvent({
              type: 'warning',
              message: `No MCP connection configured for: ${unconfiguredSources.join(', ')}. Configure them in Settings → MCP Servers.`,
              unconfiguredSources,
            });
          }
          if (mcpServers.length === 0) {
            sendEvent({
              type: 'error',
              message: `None of the selected sources (${sources.join(', ')}) have MCP connections configured. Go to Settings → MCP Servers to add your credentials.`,
            });
            controller.close();
            return;
          }

          // 4. Stream per-source progress events (only configured ones)
          for (const server of mcpServers) {
            sendEvent({ type: 'progress', message: `Scanning ${server.name}…` });
          }

          // 5. Run discovery scan
          sendEvent({ type: 'progress', message: 'Analyzing results with Claude…' });

          const discoveryResults = await runDiscoveryScan({
            projectId,
            projectName,
            sources,
            since: sinceTimestamp,
            mcpServers,
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
            });

            newItemCount++;
          }

          // 7. Complete
          sendEvent({
            type: 'complete',
            itemCount: discoveryResults.length,
            newItems: newItemCount,
            skippedDups,
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

// bigpanda-app/worker/jobs/discovery-scan.ts
// BullMQ job handler — runs discovery scan for all active projects on schedule (daily at 8am).
//
// Pattern: follows morning-briefing.ts (import from ../../lib, use MCPClientPool).
// Dedup logic mirrors scan route (isDismissedDuplicate via ilike query).

import type { Job } from 'bullmq';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { and, eq, ilike } from 'drizzle-orm';
import db from '../../db';
import { projects, discoveryItems } from '../../db/schema';
import { MCPClientPool } from '../../lib/mcp-config';
import { runDiscoveryScan, type DiscoveryItem } from '../../lib/discovery-scanner';

// ─── Constants ────────────────────────────────────────────────────────────────

const SETTINGS_DIR = path.join(os.homedir(), '.bigpanda-app');
const SCAN_CONFIG_PATH = path.join(SETTINGS_DIR, 'discovery-scan-config.json');
const DEFAULT_SOURCES = ['slack', 'gmail', 'glean', 'gong'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getProjectScanSources(projectId: number): Promise<string[]> {
  try {
    const raw = await fs.readFile(SCAN_CONFIG_PATH, 'utf-8');
    const store = JSON.parse(raw) as Record<string, { sources?: string[] }>;
    const config = store[String(projectId)];
    if (config?.sources && config.sources.length > 0) {
      return config.sources;
    }
  } catch {
    // File absent or unparseable — use defaults
  }
  return DEFAULT_SOURCES;
}

function normalizeContent(value: string | undefined | null): string {
  if (!value) return '';
  return value.toLowerCase().trim().slice(0, 120);
}

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

function sevenDaysAgo(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString();
}

// ─── Job handler ──────────────────────────────────────────────────────────────

export default async function discoveryScanJob(job: Job): Promise<{ status: string }> {
  console.log('[discovery-scan] starting scheduled scan for all active projects');

  // Fetch all active projects
  const activeProjects = await db
    .select({ id: projects.id, name: projects.name, customer: projects.customer })
    .from(projects)
    .where(eq(projects.status, 'active'));

  if (activeProjects.length === 0) {
    console.log('[discovery-scan] no active projects found');
    return { status: 'completed' };
  }

  console.log(`[discovery-scan] scanning ${activeProjects.length} active project(s)`);

  for (const project of activeProjects) {
    const projectName = project.customer || project.name;
    const sources = await getProjectScanSources(project.id);
    const scanStart = new Date();
    const scanId = `scan-${project.id}-${scanStart.getTime()}`;

    try {
      // Get MCP server configs for discovery-scan skill
      const allMcpServers = await MCPClientPool.getInstance().getServersForSkill('discovery-scan');

      // Filter to only configured sources for this project
      const mcpServers = allMcpServers.filter(s =>
        sources.includes(s.name as string)
      );

      // Run discovery scan
      const discoveryResults = await runDiscoveryScan({
        projectId: project.id,
        projectName,
        sources,
        since: sevenDaysAgo(),
        mcpServers,
      });

      // Dedup + insert (same logic as scan route)
      let newItemCount = 0;
      let skippedDups = 0;

      for (const item of discoveryResults) {
        const isDup = await isDismissedDuplicate(item, project.id);
        if (isDup) {
          skippedDups++;
          continue;
        }

        await db.insert(discoveryItems).values({
          project_id: project.id,
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

      console.log(
        `[discovery-scan] project ${project.id}: found ${discoveryResults.length} items, inserted ${newItemCount} new (${skippedDups} skipped as dismissed dups)`
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[discovery-scan] project ${project.id} failed:`, message);
      // Continue with remaining projects — don't abort the whole job
    }
  }

  console.log('[discovery-scan] scheduled scan complete');
  return { status: 'completed' };
}

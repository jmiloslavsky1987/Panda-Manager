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
import { projects, discoveryItems, actions, risks, stakeholders, userSourceTokens } from '../../db/schema';
import { MCPClientPool } from '../../lib/mcp-config';
import { readSettings } from '../../lib/settings-core';
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
      // Get settings, user tokens, MCP servers, and project context in parallel
      const [settings, dbUserTokens, allMcpServers, existingActions, existingRisks, existingStakeholders] = await Promise.all([
        readSettings(),
        db.select().from(userSourceTokens).where(eq(userSourceTokens.user_id, 'default')),
        MCPClientPool.getInstance().getServersForSkill('discovery-scan'),
        db.select({ id: actions.id, title: actions.description, status: actions.status })
          .from(actions).where(eq(actions.project_id, project.id)).limit(50),
        db.select({ id: risks.id, title: risks.description, status: risks.status })
          .from(risks).where(eq(risks.project_id, project.id)).limit(50),
        db.select({ id: stakeholders.id, name: stakeholders.name, role: stakeholders.role })
          .from(stakeholders).where(eq(stakeholders.project_id, project.id)).limit(50),
      ]);

      const source_credentials = settings.source_credentials ?? {};

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

      // Filter MCP servers to only configured sources for this project
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
        source_credentials,
        userTokens: dbUserTokens,
        existingProjectSummary,
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
          likely_duplicate: item.likely_duplicate ?? false,
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

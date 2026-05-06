import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { db } from '@/db';
import { requireSession } from "@/lib/auth-server";
import {
  discoveryItems,
  actions,
  risks,
  milestones,
  keyDecisions,
  engagementHistory,
  stakeholders,
  auditLog,
  tasks,
  archTracks,
  archNodes,
  e2eWorkflows,
  workflowSteps,
  teamEngagementSections,
  businessOutcomes,
  architectureIntegrations,
} from '@/db/schema';

export const dynamic = 'force-dynamic';

// ─── Zod Schema ───────────────────────────────────────────────────────────────

const ApproveRequestSchema = z.object({
  projectId: z.number(),
  itemIds: z.array(z.number()),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function safeParseJSON<T>(content: string): T | null {
  try { return JSON.parse(content) as T; } catch { return null; }
}

// ─── Entity router: suggested_field → entity table insert ────────────────────

type DiscoveryItem = {
  id: number;
  project_id: number;
  source: string;
  content: string;
  suggested_field: string | null;
  status: string;
  scan_timestamp: Date | null;
  source_url: string | null;
  source_excerpt: string | null;
  scan_id: string | null;
  created_at: Date;
};

// Capitalize first letter of discovery source tool name (e.g., 'slack' → 'Slack')
function capitalizeSource(src: string): string {
  if (!src) return src;
  return src.charAt(0).toUpperCase() + src.slice(1);
}

async function insertDiscoveredItem(item: DiscoveryItem): Promise<void> {
  const field = item.suggested_field ?? 'history';
  const projectId = item.project_id;
  const source = 'discovery' as const;
  // Propagate the tool name (e.g., 'Slack', 'Gmail', 'Gong') for SourceBadge display
  const discovery_source = item.source ? capitalizeSource(item.source) : null;
  const createdAt = new Date();

  switch (field) {
    case 'action':
      await db.transaction(async (tx) => {
        const [inserted] = await tx.insert(actions).values({
          project_id: projectId,
          external_id: `DISC-ACT-${item.id}-${Date.now()}`,
          description: item.content,
          status: 'open',
          source,
          discovery_source,
          created_at: createdAt,
        }).returning();
        await tx.insert(auditLog).values({
          entity_type: field,
          entity_id: inserted.id,
          action: 'create',
          actor_id: 'default',
          before_json: null,
          after_json: inserted as Record<string, unknown>,
        });
      });
      break;

    case 'risk':
      await db.transaction(async (tx) => {
        const [inserted] = await tx.insert(risks).values({
          project_id: projectId,
          external_id: `DISC-RSK-${item.id}-${Date.now()}`,
          description: item.content,
          source,
          discovery_source,
          created_at: createdAt,
        }).returning();
        await tx.insert(auditLog).values({
          entity_type: field,
          entity_id: inserted.id,
          action: 'create',
          actor_id: 'default',
          before_json: null,
          after_json: inserted as Record<string, unknown>,
        });
      });
      break;

    case 'decision':
      await db.transaction(async (tx) => {
        const [inserted] = await tx.insert(keyDecisions).values({
          project_id: projectId,
          decision: item.content,
          date: item.scan_timestamp ? item.scan_timestamp.toISOString().split('T')[0] : null,
          source,
          discovery_source,
          created_at: createdAt,
        }).returning();
        await tx.insert(auditLog).values({
          entity_type: field,
          entity_id: inserted.id,
          action: 'create',
          actor_id: 'default',
          before_json: null,
          after_json: inserted as Record<string, unknown>,
        });
      });
      break;

    case 'milestone':
      await db.transaction(async (tx) => {
        const [inserted] = await tx.insert(milestones).values({
          project_id: projectId,
          external_id: `DISC-MIL-${item.id}-${Date.now()}`,
          name: item.content,
          source,
          discovery_source,
          created_at: createdAt,
        }).returning();
        await tx.insert(auditLog).values({
          entity_type: field,
          entity_id: inserted.id,
          action: 'create',
          actor_id: 'default',
          before_json: null,
          after_json: inserted as Record<string, unknown>,
        });
      });
      break;

    case 'stakeholder':
      await db.transaction(async (tx) => {
        const [inserted] = await tx.insert(stakeholders).values({
          project_id: projectId,
          name: item.content,
          source,
          discovery_source,
          created_at: createdAt,
        }).returning();
        await tx.insert(auditLog).values({
          entity_type: field,
          entity_id: inserted.id,
          action: 'create',
          actor_id: 'default',
          before_json: null,
          after_json: inserted as Record<string, unknown>,
        });
      });
      break;

    case 'task':
      // Insert work item to tasks table with status='todo', source='discovery'
      await db.insert(tasks).values({
        project_id: projectId,
        title: item.content,
        status: 'todo',
        source: 'discovery',
      });
      break;

    case 'arch_node': {
      // Parse JSON content {name, track_name} — fall back to history if Claude omitted JSON
      const parsedNode = safeParseJSON<{ name: string; track_name: string }>(item.content);
      if (!parsedNode?.name || !parsedNode?.track_name) {
        // Malformed — store as history so nothing is lost
        await db.insert(engagementHistory).values({
          project_id: projectId,
          content: `[arch_node] ${item.content}`,
          date: item.scan_timestamp ? item.scan_timestamp.toISOString().split('T')[0] : null,
          source,
          discovery_source,
          created_at: createdAt,
        });
        break;
      }
      await db.transaction(async (tx) => {
        let [track] = await tx.select({ id: archTracks.id })
          .from(archTracks)
          .where(and(eq(archTracks.project_id, projectId), eq(archTracks.name, parsedNode.track_name)));
        if (!track) {
          const maxOrder = await tx.select({ v: archTracks.display_order })
            .from(archTracks).where(eq(archTracks.project_id, projectId))
            .orderBy(archTracks.display_order).limit(1);
          const nextOrder = (maxOrder[maxOrder.length - 1]?.v ?? 0) + 1;
          [track] = await tx.insert(archTracks)
            .values({ project_id: projectId, name: parsedNode.track_name, display_order: nextOrder })
            .returning();
        }
        // For tracks that use section-based layout (e.g. ADR Track), nodes need a parent_id
        // to be visible. Pick the last section on the track as parent.
        const sections = await tx.select({ id: archNodes.id })
          .from(archNodes)
          .where(and(eq(archNodes.track_id, track.id), eq(archNodes.node_type, 'section')))
          .orderBy(archNodes.display_order);
        const parentId = sections.length > 0 ? sections[sections.length - 1].id : null;
        await tx.insert(archNodes).values({
          project_id: projectId,
          track_id: track.id,
          name: parsedNode.name,
          display_order: 999,
          node_type: 'sub-capability',
          parent_id: parentId,
        });
      });
      break;
    }

    case 'workflow_step': {
      // Parse JSON content {label, workflow_name} — fall back to history if Claude omitted JSON
      const parsedStep = safeParseJSON<{ label: string; workflow_name: string }>(item.content);
      if (!parsedStep?.label || !parsedStep?.workflow_name) {
        await db.insert(engagementHistory).values({
          project_id: projectId,
          content: `[workflow_step] ${item.content}`,
          date: item.scan_timestamp ? item.scan_timestamp.toISOString().split('T')[0] : null,
          source, discovery_source, created_at: createdAt,
        });
        break;
      }
      const { label, workflow_name } = parsedStep;
      await db.transaction(async (tx) => {
        let [workflow] = await tx.select({ id: e2eWorkflows.id })
          .from(e2eWorkflows)
          .where(and(eq(e2eWorkflows.project_id, projectId), eq(e2eWorkflows.workflow_name, workflow_name)));
        if (!workflow) {
          [workflow] = await tx.insert(e2eWorkflows)
            .values({ project_id: projectId, team_name: 'Unknown', workflow_name })
            .returning();
        }
        await tx.insert(workflowSteps).values({ workflow_id: workflow.id, label, position: 0 });
      });
      break;
    }

    case 'team_engagement': {
      // Parse JSON content {name, content} — fall back to history if Claude omitted JSON
      const parsedEngagement = safeParseJSON<{ name: string; content: string }>(item.content);
      if (!parsedEngagement?.name || !parsedEngagement?.content) {
        await db.insert(engagementHistory).values({
          project_id: projectId,
          content: `[team_engagement] ${item.content}`,
          date: item.scan_timestamp ? item.scan_timestamp.toISOString().split('T')[0] : null,
          source, discovery_source, created_at: createdAt,
        });
        break;
      }
      const { name: sectionName, content: sectionContent } = parsedEngagement;
      const [existingSection] = await db.select({ id: teamEngagementSections.id })
        .from(teamEngagementSections)
        .where(and(eq(teamEngagementSections.project_id, projectId), eq(teamEngagementSections.name, sectionName)));
      if (existingSection) {
        await db.update(teamEngagementSections)
          .set({ content: sectionContent })
          .where(eq(teamEngagementSections.id, existingSection.id));
      } else {
        await db.insert(teamEngagementSections).values({
          project_id: projectId,
          name: sectionName,
          content: sectionContent,
          display_order: 0,
        });
      }
      break;
    }

    case 'business_outcome':
      // Insert to businessOutcomes with title=content, track='discovery'
      await db.insert(businessOutcomes).values({
        project_id: projectId,
        title: item.content,
        track: 'discovery',
      });
      break;

    case 'arch_track':
      // Insert to archTracks with name=content
      await db.insert(archTracks).values({
        project_id: projectId,
        name: item.content,
        display_order: 0,
      });
      break;

    case 'integration':
      // Insert to architectureIntegrations with tool_name=content, track='discovery'
      await db.insert(architectureIntegrations).values({
        project_id: projectId,
        tool_name: item.content,
        track: 'discovery',
      });
      break;

    case 'workflow': {
      // Parse JSON content {team_name, workflow_name} — fall back to history if Claude omitted JSON
      const parsedWf = safeParseJSON<{ team_name: string; workflow_name: string }>(item.content);
      if (!parsedWf?.team_name || !parsedWf?.workflow_name) {
        await db.insert(engagementHistory).values({
          project_id: projectId,
          content: `[workflow] ${item.content}`,
          date: item.scan_timestamp ? item.scan_timestamp.toISOString().split('T')[0] : null,
          source, discovery_source, created_at: createdAt,
        });
        break;
      }
      const { team_name: wfTeamName, workflow_name: wfName } = parsedWf;
      await db.insert(e2eWorkflows).values({
        project_id: projectId,
        team_name: wfTeamName,
        workflow_name: wfName,
      });
      break;
    }

    case 'history':
    default:
      // Catch-all: store as engagement history
      await db.transaction(async (tx) => {
        const [inserted] = await tx.insert(engagementHistory).values({
          project_id: projectId,
          content: item.content,
          date: item.scan_timestamp ? item.scan_timestamp.toISOString().split('T')[0] : null,
          source,
          discovery_source,
          created_at: createdAt,
        }).returning();
        await tx.insert(auditLog).values({
          entity_type: 'history',
          entity_id: inserted.id,
          action: 'create',
          actor_id: 'default',
          before_json: null,
          after_json: inserted as Record<string, unknown>,
        });
      });
      break;
  }
}

// ─── POST handler ─────────────────────────────────────────────────────────────

/**
 * POST /api/discovery/approve
 * Body: { projectId: number, itemIds: number[] }
 *
 * For each itemId:
 * 1. Fetch the discovery_item
 * 2. Route to entity table by suggested_field, insert with source='discovery'
 * 3. Mark discovery_item status='approved'
 *
 * Returns: { approved: N, errors: [] }
 * DISC-13: supports single or bulk IDs
 * DISC-14: writes to entity table with source='discovery' attribution
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = ApproveRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', issues: parsed.error.issues }, { status: 400 });
  }

  const { projectId, itemIds } = parsed.data;

  let approvedCount = 0;
  const errors: Array<{ itemId: number; error: string }> = [];

  for (const itemId of itemIds) {
    try {
      // Fetch the discovery item
      const rows = await db
        .select()
        .from(discoveryItems)
        .where(and(eq(discoveryItems.id, itemId), eq(discoveryItems.project_id, projectId)));

      if (!rows[0]) {
        errors.push({ itemId, error: 'Item not found' });
        continue;
      }

      const item = rows[0] as DiscoveryItem;

      // Insert into entity table with source='discovery'
      await insertDiscoveredItem(item);

      // Mark discovery_item as approved
      await db
        .update(discoveryItems)
        .set({ status: 'approved' })
        .where(eq(discoveryItems.id, itemId));

      approvedCount++;
    } catch (err) {
      errors.push({ itemId, error: err instanceof Error ? err.message : 'Unknown error' });
    }
  }

  return NextResponse.json({ approved: approvedCount, errors });
}

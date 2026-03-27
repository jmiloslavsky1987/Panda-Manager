import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { db } from '@/db';
import {
  discoveryItems,
  actions,
  risks,
  milestones,
  keyDecisions,
  engagementHistory,
  stakeholders,
} from '@/db/schema';

export const dynamic = 'force-dynamic';

// ─── Zod Schema ───────────────────────────────────────────────────────────────

const ApproveRequestSchema = z.object({
  projectId: z.number(),
  itemIds: z.array(z.number()),
});

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
      await db.insert(actions).values({
        project_id: projectId,
        external_id: `DISC-ACT-${item.id}-${Date.now()}`,
        description: item.content,
        status: 'open',
        source,
        discovery_source,
        created_at: createdAt,
      });
      break;

    case 'risk':
      await db.insert(risks).values({
        project_id: projectId,
        external_id: `DISC-RSK-${item.id}-${Date.now()}`,
        description: item.content,
        source,
        discovery_source,
        created_at: createdAt,
      });
      break;

    case 'decision':
      await db.insert(keyDecisions).values({
        project_id: projectId,
        decision: item.content,
        date: item.scan_timestamp ? item.scan_timestamp.toISOString().split('T')[0] : null,
        source,
        discovery_source,
        created_at: createdAt,
      });
      break;

    case 'milestone':
      await db.insert(milestones).values({
        project_id: projectId,
        external_id: `DISC-MIL-${item.id}-${Date.now()}`,
        name: item.content,
        source,
        discovery_source,
        created_at: createdAt,
      });
      break;

    case 'stakeholder':
      await db.insert(stakeholders).values({
        project_id: projectId,
        name: item.content,
        source,
        discovery_source,
        created_at: createdAt,
      });
      break;

    case 'history':
    default:
      // Catch-all: store as engagement history
      await db.insert(engagementHistory).values({
        project_id: projectId,
        content: item.content,
        date: item.scan_timestamp ? item.scan_timestamp.toISOString().split('T')[0] : null,
        source,
        discovery_source,
        created_at: createdAt,
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

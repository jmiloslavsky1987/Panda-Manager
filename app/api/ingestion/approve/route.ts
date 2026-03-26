import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq, and, ilike } from 'drizzle-orm';
import { db } from '@/db';
import {
  actions,
  risks,
  milestones,
  keyDecisions,
  engagementHistory,
  stakeholders,
  tasks,
  businessOutcomes,
  focusAreas,
  architectureIntegrations,
  artifacts,
} from '@/db/schema';
import type { EntityType, ExtractionItem } from '@/app/api/ingestion/extract/route';

export const dynamic = 'force-dynamic';

// ─── Zod Schema ───────────────────────────────────────────────────────────────

const ApprovalItemSchema = z.object({
  entityType: z.enum([
    'action', 'risk', 'decision', 'milestone', 'stakeholder',
    'task', 'architecture', 'history', 'businessOutcome', 'team',
  ]),
  fields: z.record(z.string(), z.string()),
  approved: z.boolean(),
  conflictResolution: z.enum(['merge', 'replace', 'skip']).optional(),
  existingId: z.number().optional(),
});

const ApproveRequestSchema = z.object({
  artifactId: z.number(),
  projectId: z.number(),
  items: z.array(ApprovalItemSchema),
  totalExtracted: z.number(),
});

type ApprovalItem = z.infer<typeof ApprovalItemSchema>;

// ─── Append-only entity types (never merge/replace — auto-skip on conflict) ──

const APPEND_ONLY_TYPES = new Set<EntityType>(['decision', 'history']);

// ─── Conflict detection: same dedup key as extract route ─────────────────────

function normalize(value: string | undefined | null): string {
  if (!value) return '';
  return value.toLowerCase().trim().slice(0, 120);
}

/**
 * Check for a conflicting existing record for this item.
 * Returns the existing record (with id) if found, null otherwise.
 */
async function findConflict(
  item: ApprovalItem,
  projectId: number,
): Promise<{ id: number } | null> {
  const f = item.fields;

  switch (item.entityType) {
    case 'action': {
      const key = normalize(f.description);
      if (!key) return null;
      const rows = await db
        .select({ id: actions.id })
        .from(actions)
        .where(and(eq(actions.project_id, projectId), ilike(actions.description, `${key}%`)));
      return rows[0] ?? null;
    }
    case 'risk': {
      const key = normalize(f.description);
      if (!key) return null;
      const rows = await db
        .select({ id: risks.id })
        .from(risks)
        .where(and(eq(risks.project_id, projectId), ilike(risks.description, `${key}%`)));
      return rows[0] ?? null;
    }
    case 'milestone': {
      const key = normalize(f.name);
      if (!key) return null;
      const rows = await db
        .select({ id: milestones.id })
        .from(milestones)
        .where(and(eq(milestones.project_id, projectId), ilike(milestones.name, `${key}%`)));
      return rows[0] ?? null;
    }
    case 'decision': {
      const key = normalize(f.decision);
      if (!key) return null;
      const rows = await db
        .select({ id: keyDecisions.id })
        .from(keyDecisions)
        .where(and(eq(keyDecisions.project_id, projectId), ilike(keyDecisions.decision, `${key}%`)));
      return rows[0] ?? null;
    }
    case 'history': {
      const key = normalize(f.content);
      if (!key) return null;
      const rows = await db
        .select({ id: engagementHistory.id })
        .from(engagementHistory)
        .where(and(eq(engagementHistory.project_id, projectId), ilike(engagementHistory.content, `${key}%`)));
      return rows[0] ?? null;
    }
    case 'stakeholder': {
      if (f.email && f.email.trim()) {
        const rows = await db
          .select({ id: stakeholders.id })
          .from(stakeholders)
          .where(and(eq(stakeholders.project_id, projectId), ilike(stakeholders.email, f.email.trim())));
        return rows[0] ?? null;
      }
      const key = normalize(f.name);
      if (!key) return null;
      const rows = await db
        .select({ id: stakeholders.id })
        .from(stakeholders)
        .where(and(eq(stakeholders.project_id, projectId), ilike(stakeholders.name, `${key}%`)));
      return rows[0] ?? null;
    }
    case 'task': {
      const key = normalize(f.title);
      if (!key) return null;
      const rows = await db
        .select({ id: tasks.id })
        .from(tasks)
        .where(and(eq(tasks.project_id, projectId), ilike(tasks.title, `${key}%`)));
      return rows[0] ?? null;
    }
    case 'businessOutcome': {
      const key = normalize(f.title);
      if (!key) return null;
      const rows = await db
        .select({ id: businessOutcomes.id })
        .from(businessOutcomes)
        .where(and(eq(businessOutcomes.project_id, projectId), ilike(businessOutcomes.title, `${key}%`)));
      return rows[0] ?? null;
    }
    case 'team': {
      const key = normalize(f.team_name);
      if (!key) return null;
      const rows = await db
        .select({ id: focusAreas.id })
        .from(focusAreas)
        .where(and(eq(focusAreas.project_id, projectId), ilike(focusAreas.title, `${key}%`)));
      return rows[0] ?? null;
    }
    case 'architecture': {
      const toolKey = normalize(f.tool_name);
      if (!toolKey) return null;
      const rows = await db
        .select({ id: architectureIntegrations.id })
        .from(architectureIntegrations)
        .where(and(eq(architectureIntegrations.project_id, projectId), ilike(architectureIntegrations.tool_name, `${toolKey}%`)));
      return rows[0] ?? null;
    }
    default:
      return null;
  }
}

// ─── Generate synthetic external_id for inserted records ─────────────────────

function syntheticExternalId(entityType: string, artifactId: number): string {
  return `ING-${entityType.toUpperCase().slice(0, 4)}-${artifactId}-${Date.now()}`;
}

// ─── Entity insert helpers ────────────────────────────────────────────────────

async function insertItem(
  item: ApprovalItem,
  projectId: number,
  artifactId: number,
): Promise<void> {
  const f = item.fields;
  const attribution = {
    source: 'ingestion' as const,
    source_artifact_id: artifactId,
    ingested_at: new Date(),
  };

  switch (item.entityType) {
    case 'action':
      await db.insert(actions).values({
        project_id: projectId,
        external_id: syntheticExternalId('action', artifactId),
        description: f.description ?? '',
        owner: f.owner ?? null,
        due: f.due_date ?? null,
        status: 'open',
        ...attribution,
      });
      break;

    case 'risk':
      await db.insert(risks).values({
        project_id: projectId,
        external_id: syntheticExternalId('risk', artifactId),
        description: f.description ?? '',
        owner: f.owner ?? null,
        mitigation: f.mitigation ?? null,
        ...attribution,
      });
      break;

    case 'milestone':
      await db.insert(milestones).values({
        project_id: projectId,
        external_id: syntheticExternalId('milestone', artifactId),
        name: f.name ?? '',
        target: f.target_date ?? null,
        date: f.target_date ?? null,
        status: f.status ?? null,
        ...attribution,
      });
      break;

    case 'decision':
      await db.insert(keyDecisions).values({
        project_id: projectId,
        decision: f.decision ?? '',
        date: f.date ?? null,
        context: f.rationale ?? null,
        ...attribution,
      });
      break;

    case 'history':
      await db.insert(engagementHistory).values({
        project_id: projectId,
        content: f.content ?? '',
        date: f.date ?? null,
        ...attribution,
      });
      break;

    case 'stakeholder':
      await db.insert(stakeholders).values({
        project_id: projectId,
        name: f.name ?? '',
        role: f.role ?? null,
        email: f.email ?? null,
        company: f.account ?? null,
        ...attribution,
      });
      break;

    case 'task':
      await db.insert(tasks).values({
        project_id: projectId,
        title: f.title ?? '',
        owner: f.owner ?? null,
        phase: f.phase ?? null,
        status: f.status ?? 'todo',
        ...attribution,
      });
      break;

    case 'businessOutcome':
      await db.insert(businessOutcomes).values({
        project_id: projectId,
        title: f.title ?? '',
        track: f.track ?? '',
        description: f.description ?? null,
        ...attribution,
      });
      break;

    case 'team':
      // team maps to focus_areas table (consistent with extract route)
      await db.insert(focusAreas).values({
        project_id: projectId,
        title: f.team_name ?? '',
        tracks: f.track ?? null,
        ...attribution,
      });
      break;

    case 'architecture':
      await db.insert(architectureIntegrations).values({
        project_id: projectId,
        tool_name: f.tool_name ?? '',
        track: f.track ?? '',
        phase: f.phase ?? null,
        integration_method: f.integration_method ?? null,
        notes: f.notes ?? null,
        ...attribution,
      });
      break;
  }
}

// ─── Entity update helpers (merge) ───────────────────────────────────────────

async function mergeItem(
  item: ApprovalItem,
  existingId: number,
  artifactId: number,
): Promise<void> {
  const f = item.fields;
  const attribution = {
    source_artifact_id: artifactId,
    ingested_at: new Date(),
  };

  switch (item.entityType) {
    case 'action':
      await db.update(actions).set({
        owner: f.owner ?? undefined,
        due: f.due_date ?? undefined,
        ...attribution,
      }).where(eq(actions.id, existingId));
      break;

    case 'risk':
      await db.update(risks).set({
        owner: f.owner ?? undefined,
        mitigation: f.mitigation ?? undefined,
        ...attribution,
      }).where(eq(risks.id, existingId));
      break;

    case 'milestone':
      await db.update(milestones).set({
        target: f.target_date ?? undefined,
        status: f.status ?? undefined,
        ...attribution,
      }).where(eq(milestones.id, existingId));
      break;

    case 'stakeholder':
      await db.update(stakeholders).set({
        role: f.role ?? undefined,
        email: f.email ?? undefined,
        company: f.account ?? undefined,
        ...attribution,
      }).where(eq(stakeholders.id, existingId));
      break;

    case 'task':
      await db.update(tasks).set({
        owner: f.owner ?? undefined,
        status: f.status ?? undefined,
        ...attribution,
      }).where(eq(tasks.id, existingId));
      break;

    case 'businessOutcome':
      await db.update(businessOutcomes).set({
        description: f.description ?? undefined,
        ...attribution,
      }).where(eq(businessOutcomes.id, existingId));
      break;

    case 'team':
      await db.update(focusAreas).set({
        tracks: f.track ?? undefined,
        ...attribution,
      }).where(eq(focusAreas.id, existingId));
      break;

    case 'architecture':
      await db.update(architectureIntegrations).set({
        phase: f.phase ?? undefined,
        integration_method: f.integration_method ?? undefined,
        notes: f.notes ?? undefined,
        ...attribution,
      }).where(eq(architectureIntegrations.id, existingId));
      break;

    // decision and history are append-only — merge is not applicable
    default:
      break;
  }
}

// ─── Entity delete helpers (replace step 1) ──────────────────────────────────

async function deleteItem(entityType: EntityType, existingId: number): Promise<void> {
  switch (entityType) {
    case 'action':
      await db.delete(actions).where(eq(actions.id, existingId));
      break;
    case 'risk':
      await db.delete(risks).where(eq(risks.id, existingId));
      break;
    case 'milestone':
      await db.delete(milestones).where(eq(milestones.id, existingId));
      break;
    case 'stakeholder':
      await db.delete(stakeholders).where(eq(stakeholders.id, existingId));
      break;
    case 'task':
      await db.delete(tasks).where(eq(tasks.id, existingId));
      break;
    case 'businessOutcome':
      await db.delete(businessOutcomes).where(eq(businessOutcomes.id, existingId));
      break;
    case 'team':
      await db.delete(focusAreas).where(eq(focusAreas.id, existingId));
      break;
    case 'architecture':
      await db.delete(architectureIntegrations).where(eq(architectureIntegrations.id, existingId));
      break;
    // decision and history: append-only, never deleted via approve route
    default:
      break;
  }
}

// ─── POST handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Parse and validate body
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

  const { artifactId, projectId, items, totalExtracted } = parsed.data;

  // 2. Fetch artifact record (for ingestion_log_json)
  const artifactRows = await db
    .select({ id: artifacts.id, ingestion_log_json: artifacts.ingestion_log_json })
    .from(artifacts)
    .where(eq(artifacts.id, artifactId));

  if (!artifactRows[0]) {
    return NextResponse.json({ error: 'Artifact not found' }, { status: 404 });
  }

  const existingLog = (artifactRows[0].ingestion_log_json ?? {}) as Record<string, unknown>;

  // 3. Process approved items
  const conflicts: Array<{ itemIndex: number; existingId: number; existingRecord: { id: number } }> = [];
  let written = 0;
  let skipped = 0;
  const rejected = items.filter(i => !i.approved).length;

  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx];

    // Skip rejected items
    if (!item.approved) continue;

    // Check for conflict (server-side, authoritative)
    const existing = await findConflict(item, projectId);

    if (existing) {
      // Append-only types: auto-skip on conflict (no merge/replace allowed)
      if (APPEND_ONLY_TYPES.has(item.entityType as EntityType)) {
        skipped++;
        continue;
      }

      // Conflict found — need explicit resolution
      if (!item.conflictResolution) {
        conflicts.push({ itemIndex: idx, existingId: existing.id, existingRecord: existing });
        continue;
      }

      switch (item.conflictResolution) {
        case 'skip':
          skipped++;
          break;

        case 'replace': {
          const idToDelete = item.existingId ?? existing.id;
          await deleteItem(item.entityType as EntityType, idToDelete);
          await insertItem(item, projectId, artifactId);
          written++;
          break;
        }

        case 'merge': {
          const idToMerge = item.existingId ?? existing.id;
          await mergeItem(item, idToMerge, artifactId);
          written++;
          break;
        }
      }
    } else {
      // No conflict — direct insert
      await insertItem(item, projectId, artifactId);
      written++;
    }
  }

  // 4. Return 409 if any conflicts require resolution
  if (conflicts.length > 0) {
    return NextResponse.json({ conflicts }, { status: 409 });
  }

  // 5. Update artifact ingestion_log_json and status
  const approvedCount = items.filter(i => i.approved).length;
  const log = {
    ...existingLog,
    items_extracted: totalExtracted,
    items_approved: approvedCount - skipped,
    items_rejected: rejected,
    completed_at: new Date().toISOString(),
  };

  await db
    .update(artifacts)
    .set({
      ingestion_status: 'approved',
      ingestion_log_json: log,
    })
    .where(eq(artifacts.id, artifactId));

  // 6. Return summary
  return NextResponse.json({ written, skipped, rejected }, { status: 200 });
}

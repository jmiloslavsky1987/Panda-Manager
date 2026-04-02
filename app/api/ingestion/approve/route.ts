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
  teamPathways,
  artifacts,
  auditLog,
  workstreams,
  onboardingSteps,
  integrations,
} from '@/db/schema';
import type { EntityType, ExtractionItem } from '@/lib/extraction-types';
import { requireSession } from "@/lib/auth-server";

export const dynamic = 'force-dynamic';

// ─── Zod Schema ───────────────────────────────────────────────────────────────

const ApprovalItemSchema = z.object({
  entityType: z.enum([
    'action', 'risk', 'decision', 'milestone', 'stakeholder',
    'task', 'architecture', 'history', 'businessOutcome', 'team', 'note', 'team_pathway',
    'workstream', 'onboarding_step', 'integration',
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

const APPEND_ONLY_TYPES = new Set<EntityType>(['decision', 'history', 'note']);

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
    case 'team_pathway': {
      const key = normalize(f.team_name);
      if (!key) return null;
      const rows = await db
        .select({ id: teamPathways.id })
        .from(teamPathways)
        .where(and(eq(teamPathways.project_id, projectId), ilike(teamPathways.team_name, `${key}%`)));
      return rows[0] ?? null;
    }
    case 'workstream': {
      const key = normalize(f.name);
      if (!key) return null;
      const rows = await db
        .select({ id: workstreams.id })
        .from(workstreams)
        .where(and(eq(workstreams.project_id, projectId), ilike(workstreams.name, `${key}%`)));
      return rows[0] ?? null;
    }
    case 'onboarding_step': {
      const key = normalize(f.step_name);
      if (!key) return null;
      const rows = await db
        .select({ id: onboardingSteps.id })
        .from(onboardingSteps)
        .where(and(eq(onboardingSteps.project_id, projectId), ilike(onboardingSteps.name, `${key}%`)));
      return rows[0] ?? null;
    }
    case 'integration': {
      const key = normalize(f.tool_name);
      if (!key) return null;
      const rows = await db
        .select({ id: integrations.id })
        .from(integrations)
        .where(and(eq(integrations.project_id, projectId), ilike(integrations.tool, `${key}%`)));
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
      await db.transaction(async (tx) => {
        const [inserted] = await tx.insert(actions).values({
          project_id: projectId,
          external_id: syntheticExternalId('action', artifactId),
          description: f.description ?? '',
          owner: f.owner ?? null,
          due: f.due_date ?? null,
          status: 'open',
          ...attribution,
        }).returning();
        await tx.insert(auditLog).values({
          entity_type: item.entityType,
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
          external_id: syntheticExternalId('risk', artifactId),
          description: f.description ?? '',
          owner: f.owner ?? null,
          mitigation: f.mitigation ?? null,
          ...attribution,
        }).returning();
        await tx.insert(auditLog).values({
          entity_type: item.entityType,
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
          external_id: syntheticExternalId('milestone', artifactId),
          name: f.name ?? '',
          target: f.target_date ?? null,
          date: f.target_date ?? null,
          status: f.status ?? null,
          ...attribution,
        }).returning();
        await tx.insert(auditLog).values({
          entity_type: item.entityType,
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
          decision: f.decision ?? '',
          date: f.date ?? null,
          context: f.rationale ?? null,
          ...attribution,
        }).returning();
        await tx.insert(auditLog).values({
          entity_type: item.entityType,
          entity_id: inserted.id,
          action: 'create',
          actor_id: 'default',
          before_json: null,
          after_json: inserted as Record<string, unknown>,
        });
      });
      break;

    case 'history':
      await db.transaction(async (tx) => {
        const [inserted] = await tx.insert(engagementHistory).values({
          project_id: projectId,
          content: f.content ?? '',
          date: f.date ?? null,
          ...attribution,
        }).returning();
        await tx.insert(auditLog).values({
          entity_type: item.entityType,
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
          name: f.name ?? '',
          role: f.role ?? null,
          email: f.email ?? null,
          company: f.account ?? null,
          ...attribution,
        }).returning();
        await tx.insert(auditLog).values({
          entity_type: item.entityType,
          entity_id: inserted.id,
          action: 'create',
          actor_id: 'default',
          before_json: null,
          after_json: inserted as Record<string, unknown>,
        });
      });
      break;

    case 'task':
      await db.transaction(async (tx) => {
        const [inserted] = await tx.insert(tasks).values({
          project_id: projectId,
          title: f.title ?? '',
          owner: f.owner ?? null,
          phase: f.phase ?? null,
          status: f.status ?? 'todo',
          ...attribution,
        }).returning();
        await tx.insert(auditLog).values({
          entity_type: item.entityType,
          entity_id: inserted.id,
          action: 'create',
          actor_id: 'default',
          before_json: null,
          after_json: inserted as Record<string, unknown>,
        });
      });
      break;

    case 'businessOutcome':
      await db.transaction(async (tx) => {
        const [inserted] = await tx.insert(businessOutcomes).values({
          project_id: projectId,
          title: f.title ?? '',
          track: f.track ?? '',
          description: f.description ?? null,
          ...attribution,
        }).returning();
        await tx.insert(auditLog).values({
          entity_type: item.entityType,
          entity_id: inserted.id,
          action: 'create',
          actor_id: 'default',
          before_json: null,
          after_json: inserted as Record<string, unknown>,
        });
      });
      break;

    case 'team':
      // team maps to focus_areas table (consistent with extract route)
      await db.transaction(async (tx) => {
        const [inserted] = await tx.insert(focusAreas).values({
          project_id: projectId,
          title: f.team_name ?? '',
          tracks: f.track ?? null,
          ...attribution,
        }).returning();
        await tx.insert(auditLog).values({
          entity_type: item.entityType,
          entity_id: inserted.id,
          action: 'create',
          actor_id: 'default',
          before_json: null,
          after_json: inserted as Record<string, unknown>,
        });
      });
      break;

    case 'architecture':
      await db.transaction(async (tx) => {
        const [inserted] = await tx.insert(architectureIntegrations).values({
          project_id: projectId,
          tool_name: f.tool_name ?? '',
          track: f.track ?? '',
          phase: f.phase ?? null,
          integration_method: f.integration_method ?? null,
          notes: f.notes ?? null,
          ...attribution,
        }).returning();
        await tx.insert(auditLog).values({
          entity_type: item.entityType,
          entity_id: inserted.id,
          action: 'create',
          actor_id: 'default',
          before_json: null,
          after_json: inserted as Record<string, unknown>,
        });
      });
      break;

    case 'note':
      // Free-form notes that don't fit a structured entity type — saved to engagement_history
      // so no content from a document is ever lost.
      await db.transaction(async (tx) => {
        const [inserted] = await tx.insert(engagementHistory).values({
          project_id: projectId,
          content: [f.content, f.context].filter(Boolean).join(' | ') || '(note)',
          date: null,
          ...attribution,
        }).returning();
        await tx.insert(auditLog).values({
          entity_type: item.entityType,
          entity_id: inserted.id,
          action: 'create',
          actor_id: 'default',
          before_json: null,
          after_json: inserted as Record<string, unknown>,
        });
      });
      break;

    case 'team_pathway': {
      // Parse route_description into [{label}] array by splitting on ' → ' or ', '
      const rawSteps = f.route_description ?? '';
      const stepLabels = rawSteps.split(/ → |, /).map(s => s.trim()).filter(Boolean);
      const routeSteps = stepLabels.map(label => ({ label }));
      await db.transaction(async (tx) => {
        const [inserted] = await tx.insert(teamPathways).values({
          project_id:         projectId,
          team_name:          f.team_name ?? '',
          route_steps:        routeSteps as unknown as typeof teamPathways.$inferInsert['route_steps'],
          status:             (f.status as 'live' | 'in_progress' | 'pilot' | 'planned' | undefined) ?? 'planned',
          notes:              f.notes ?? null,
          source:             'ingestion',
          source_artifact_id: artifactId,
          ingested_at:        new Date(),
        }).returning();
        await tx.insert(auditLog).values({
          entity_type: item.entityType,
          entity_id:   inserted.id,
          action:      'create',
          actor_id:    'default',
          before_json: null,
          after_json:  inserted as Record<string, unknown>,
        });
      });
      break;
    }

    case 'workstream': {
      // workstreams table has source column but NOT source_artifact_id or ingested_at
      await db.transaction(async (tx) => {
        const [inserted] = await tx.insert(workstreams).values({
          project_id: projectId,
          name: f.name ?? '',
          track: f.track ?? null,
          current_status: f.status ?? null,
          lead: f.owner ?? null,
          state: f.state ?? null,
          percent_complete: f.percent_complete ? parseInt(f.percent_complete, 10) : null,
          source: 'ingestion',
        }).returning();
        await tx.insert(auditLog).values({
          entity_type: item.entityType,
          entity_id: inserted.id,
          action: 'create',
          actor_id: 'default',
          before_json: null,
          after_json: inserted as Record<string, unknown>,
        });
      });
      break;
    }

    case 'onboarding_step': {
      // onboarding_steps table has NO source/attribution columns; phase_id default to 1
      await db.transaction(async (tx) => {
        const [inserted] = await tx.insert(onboardingSteps).values({
          project_id: projectId,
          phase_id: 1, // default phase since extraction cannot determine phase
          name: f.step_name ?? '',
          description: f.description ?? null,
          owner: f.team_name ?? null,
          status: (f.status as 'not-started' | 'in-progress' | 'complete' | 'blocked' | undefined) ?? 'not-started',
          display_order: 0,
        }).returning();
        await tx.insert(auditLog).values({
          entity_type: item.entityType,
          entity_id: inserted.id,
          action: 'create',
          actor_id: 'default',
          before_json: null,
          after_json: inserted as Record<string, unknown>,
        });
      });
      break;
    }

    case 'integration': {
      // integrations table has NO source/attribution columns
      await db.transaction(async (tx) => {
        const [inserted] = await tx.insert(integrations).values({
          project_id: projectId,
          tool: f.tool_name ?? '',
          category: f.category ?? null,
          status: (f.connection_status as 'not-connected' | 'configured' | 'validated' | 'production' | 'blocked' | undefined) ?? 'not-connected',
          notes: f.notes ?? null,
          display_order: 0,
        }).returning();
        await tx.insert(auditLog).values({
          entity_type: item.entityType,
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
    case 'action': {
      const [beforeRecord] = await db.select().from(actions).where(eq(actions.id, existingId));
      const patch = { owner: f.owner ?? undefined, due: f.due_date ?? undefined, ...attribution };
      await db.transaction(async (tx) => {
        await tx.update(actions).set(patch).where(eq(actions.id, existingId));
        await tx.insert(auditLog).values({
          entity_type: item.entityType,
          entity_id: existingId,
          action: 'update',
          actor_id: 'default',
          before_json: beforeRecord as Record<string, unknown>,
          after_json: { ...beforeRecord, ...patch } as Record<string, unknown>,
        });
      });
      break;
    }

    case 'risk': {
      const [beforeRecord] = await db.select().from(risks).where(eq(risks.id, existingId));
      const patch = { owner: f.owner ?? undefined, mitigation: f.mitigation ?? undefined, ...attribution };
      await db.transaction(async (tx) => {
        await tx.update(risks).set(patch).where(eq(risks.id, existingId));
        await tx.insert(auditLog).values({
          entity_type: item.entityType,
          entity_id: existingId,
          action: 'update',
          actor_id: 'default',
          before_json: beforeRecord as Record<string, unknown>,
          after_json: { ...beforeRecord, ...patch } as Record<string, unknown>,
        });
      });
      break;
    }

    case 'milestone': {
      const [beforeRecord] = await db.select().from(milestones).where(eq(milestones.id, existingId));
      const patch = { target: f.target_date ?? undefined, status: f.status ?? undefined, ...attribution };
      await db.transaction(async (tx) => {
        await tx.update(milestones).set(patch).where(eq(milestones.id, existingId));
        await tx.insert(auditLog).values({
          entity_type: item.entityType,
          entity_id: existingId,
          action: 'update',
          actor_id: 'default',
          before_json: beforeRecord as Record<string, unknown>,
          after_json: { ...beforeRecord, ...patch } as Record<string, unknown>,
        });
      });
      break;
    }

    case 'stakeholder': {
      const [beforeRecord] = await db.select().from(stakeholders).where(eq(stakeholders.id, existingId));
      const patch = { role: f.role ?? undefined, email: f.email ?? undefined, company: f.account ?? undefined, ...attribution };
      await db.transaction(async (tx) => {
        await tx.update(stakeholders).set(patch).where(eq(stakeholders.id, existingId));
        await tx.insert(auditLog).values({
          entity_type: item.entityType,
          entity_id: existingId,
          action: 'update',
          actor_id: 'default',
          before_json: beforeRecord as Record<string, unknown>,
          after_json: { ...beforeRecord, ...patch } as Record<string, unknown>,
        });
      });
      break;
    }

    case 'task': {
      const [beforeRecord] = await db.select().from(tasks).where(eq(tasks.id, existingId));
      const patch = { owner: f.owner ?? undefined, status: f.status ?? undefined, ...attribution };
      await db.transaction(async (tx) => {
        await tx.update(tasks).set(patch).where(eq(tasks.id, existingId));
        await tx.insert(auditLog).values({
          entity_type: item.entityType,
          entity_id: existingId,
          action: 'update',
          actor_id: 'default',
          before_json: beforeRecord as Record<string, unknown>,
          after_json: { ...beforeRecord, ...patch } as Record<string, unknown>,
        });
      });
      break;
    }

    case 'businessOutcome': {
      const [beforeRecord] = await db.select().from(businessOutcomes).where(eq(businessOutcomes.id, existingId));
      const patch = { description: f.description ?? undefined, ...attribution };
      await db.transaction(async (tx) => {
        await tx.update(businessOutcomes).set(patch).where(eq(businessOutcomes.id, existingId));
        await tx.insert(auditLog).values({
          entity_type: item.entityType,
          entity_id: existingId,
          action: 'update',
          actor_id: 'default',
          before_json: beforeRecord as Record<string, unknown>,
          after_json: { ...beforeRecord, ...patch } as Record<string, unknown>,
        });
      });
      break;
    }

    case 'team': {
      const [beforeRecord] = await db.select().from(focusAreas).where(eq(focusAreas.id, existingId));
      const patch = { tracks: f.track ?? undefined, ...attribution };
      await db.transaction(async (tx) => {
        await tx.update(focusAreas).set(patch).where(eq(focusAreas.id, existingId));
        await tx.insert(auditLog).values({
          entity_type: item.entityType,
          entity_id: existingId,
          action: 'update',
          actor_id: 'default',
          before_json: beforeRecord as Record<string, unknown>,
          after_json: { ...beforeRecord, ...patch } as Record<string, unknown>,
        });
      });
      break;
    }

    case 'architecture': {
      const [beforeRecord] = await db.select().from(architectureIntegrations).where(eq(architectureIntegrations.id, existingId));
      const patch = { phase: f.phase ?? undefined, integration_method: f.integration_method ?? undefined, notes: f.notes ?? undefined, ...attribution };
      await db.transaction(async (tx) => {
        await tx.update(architectureIntegrations).set(patch).where(eq(architectureIntegrations.id, existingId));
        await tx.insert(auditLog).values({
          entity_type: item.entityType,
          entity_id: existingId,
          action: 'update',
          actor_id: 'default',
          before_json: beforeRecord as Record<string, unknown>,
          after_json: { ...beforeRecord, ...patch } as Record<string, unknown>,
        });
      });
      break;
    }

    case 'team_pathway': {
      const [beforeRecord] = await db.select().from(teamPathways).where(eq(teamPathways.id, existingId));
      const rawSteps = f.route_description ?? '';
      const stepLabels = rawSteps.split(/ → |, /).map((s: string) => s.trim()).filter(Boolean);
      const routeSteps = stepLabels.length > 0
        ? stepLabels.map((label: string) => ({ label }))
        : undefined;
      const patch: Partial<typeof teamPathways.$inferInsert> = {
        ...(routeSteps ? { route_steps: routeSteps as unknown as typeof teamPathways.$inferInsert['route_steps'] } : {}),
        ...(f.status ? { status: f.status as 'live' | 'in_progress' | 'pilot' | 'planned' } : {}),
        ...(f.notes ? { notes: f.notes } : {}),
        source_artifact_id: artifactId,
        ingested_at: new Date(),
      };
      await db.transaction(async (tx) => {
        await tx.update(teamPathways).set(patch).where(eq(teamPathways.id, existingId));
        await tx.insert(auditLog).values({
          entity_type: item.entityType,
          entity_id:   existingId,
          action:      'update',
          actor_id:    'default',
          before_json: beforeRecord as Record<string, unknown>,
          after_json:  { ...beforeRecord, ...patch } as Record<string, unknown>,
        });
      });
      break;
    }

    case 'workstream': {
      const [beforeRecord] = await db.select().from(workstreams).where(eq(workstreams.id, existingId));
      const patch = {
        track: f.track ?? undefined,
        current_status: f.status ?? undefined,
        lead: f.owner ?? undefined,
        state: f.state ?? undefined,
        percent_complete: f.percent_complete ? parseInt(f.percent_complete, 10) : undefined,
      };
      await db.transaction(async (tx) => {
        await tx.update(workstreams).set(patch).where(eq(workstreams.id, existingId));
        await tx.insert(auditLog).values({
          entity_type: item.entityType,
          entity_id: existingId,
          action: 'update',
          actor_id: 'default',
          before_json: beforeRecord as Record<string, unknown>,
          after_json: { ...beforeRecord, ...patch } as Record<string, unknown>,
        });
      });
      break;
    }

    case 'onboarding_step': {
      const [beforeRecord] = await db.select().from(onboardingSteps).where(eq(onboardingSteps.id, existingId));
      const patch = {
        description: f.description ?? undefined,
        owner: f.team_name ?? undefined,
        status: f.status as 'not-started' | 'in-progress' | 'complete' | 'blocked' | undefined,
      };
      await db.transaction(async (tx) => {
        await tx.update(onboardingSteps).set(patch).where(eq(onboardingSteps.id, existingId));
        await tx.insert(auditLog).values({
          entity_type: item.entityType,
          entity_id: existingId,
          action: 'update',
          actor_id: 'default',
          before_json: beforeRecord as Record<string, unknown>,
          after_json: { ...beforeRecord, ...patch } as Record<string, unknown>,
        });
      });
      break;
    }

    case 'integration': {
      const [beforeRecord] = await db.select().from(integrations).where(eq(integrations.id, existingId));
      const patch = {
        category: f.category ?? undefined,
        status: f.connection_status as 'not-connected' | 'configured' | 'validated' | 'production' | 'blocked' | undefined,
        notes: f.notes ?? undefined,
      };
      await db.transaction(async (tx) => {
        await tx.update(integrations).set(patch).where(eq(integrations.id, existingId));
        await tx.insert(auditLog).values({
          entity_type: item.entityType,
          entity_id: existingId,
          action: 'update',
          actor_id: 'default',
          before_json: beforeRecord as Record<string, unknown>,
          after_json: { ...beforeRecord, ...patch } as Record<string, unknown>,
        });
      });
      break;
    }

    // decision and history are append-only — merge is not applicable
    default:
      break;
  }
}

// ─── Entity delete helpers (replace step 1) ──────────────────────────────────

async function deleteItem(entityType: EntityType, existingId: number): Promise<void> {
  switch (entityType) {
    case 'action': {
      const [before] = await db.select().from(actions).where(eq(actions.id, existingId));
      await db.transaction(async (tx) => {
        await tx.delete(actions).where(eq(actions.id, existingId));
        await tx.insert(auditLog).values({
          entity_type: entityType,
          entity_id: existingId,
          action: 'delete',
          actor_id: 'default',
          before_json: (before as Record<string, unknown>) ?? null,
          after_json: null,
        });
      });
      break;
    }
    case 'risk': {
      const [before] = await db.select().from(risks).where(eq(risks.id, existingId));
      await db.transaction(async (tx) => {
        await tx.delete(risks).where(eq(risks.id, existingId));
        await tx.insert(auditLog).values({
          entity_type: entityType,
          entity_id: existingId,
          action: 'delete',
          actor_id: 'default',
          before_json: (before as Record<string, unknown>) ?? null,
          after_json: null,
        });
      });
      break;
    }
    case 'milestone': {
      const [before] = await db.select().from(milestones).where(eq(milestones.id, existingId));
      await db.transaction(async (tx) => {
        await tx.delete(milestones).where(eq(milestones.id, existingId));
        await tx.insert(auditLog).values({
          entity_type: entityType,
          entity_id: existingId,
          action: 'delete',
          actor_id: 'default',
          before_json: (before as Record<string, unknown>) ?? null,
          after_json: null,
        });
      });
      break;
    }
    case 'stakeholder': {
      const [before] = await db.select().from(stakeholders).where(eq(stakeholders.id, existingId));
      await db.transaction(async (tx) => {
        await tx.delete(stakeholders).where(eq(stakeholders.id, existingId));
        await tx.insert(auditLog).values({
          entity_type: entityType,
          entity_id: existingId,
          action: 'delete',
          actor_id: 'default',
          before_json: (before as Record<string, unknown>) ?? null,
          after_json: null,
        });
      });
      break;
    }
    case 'task': {
      const [before] = await db.select().from(tasks).where(eq(tasks.id, existingId));
      await db.transaction(async (tx) => {
        await tx.delete(tasks).where(eq(tasks.id, existingId));
        await tx.insert(auditLog).values({
          entity_type: entityType,
          entity_id: existingId,
          action: 'delete',
          actor_id: 'default',
          before_json: (before as Record<string, unknown>) ?? null,
          after_json: null,
        });
      });
      break;
    }
    case 'businessOutcome': {
      const [before] = await db.select().from(businessOutcomes).where(eq(businessOutcomes.id, existingId));
      await db.transaction(async (tx) => {
        await tx.delete(businessOutcomes).where(eq(businessOutcomes.id, existingId));
        await tx.insert(auditLog).values({
          entity_type: entityType,
          entity_id: existingId,
          action: 'delete',
          actor_id: 'default',
          before_json: (before as Record<string, unknown>) ?? null,
          after_json: null,
        });
      });
      break;
    }
    case 'team': {
      const [before] = await db.select().from(focusAreas).where(eq(focusAreas.id, existingId));
      await db.transaction(async (tx) => {
        await tx.delete(focusAreas).where(eq(focusAreas.id, existingId));
        await tx.insert(auditLog).values({
          entity_type: entityType,
          entity_id: existingId,
          action: 'delete',
          actor_id: 'default',
          before_json: (before as Record<string, unknown>) ?? null,
          after_json: null,
        });
      });
      break;
    }
    case 'architecture': {
      const [before] = await db.select().from(architectureIntegrations).where(eq(architectureIntegrations.id, existingId));
      await db.transaction(async (tx) => {
        await tx.delete(architectureIntegrations).where(eq(architectureIntegrations.id, existingId));
        await tx.insert(auditLog).values({
          entity_type: entityType,
          entity_id: existingId,
          action: 'delete',
          actor_id: 'default',
          before_json: (before as Record<string, unknown>) ?? null,
          after_json: null,
        });
      });
      break;
    }
    case 'team_pathway': {
      const [before] = await db.select().from(teamPathways).where(eq(teamPathways.id, existingId));
      await db.transaction(async (tx) => {
        await tx.delete(teamPathways).where(eq(teamPathways.id, existingId));
        await tx.insert(auditLog).values({
          entity_type: entityType,
          entity_id:   existingId,
          action:      'delete',
          actor_id:    'default',
          before_json: (before as Record<string, unknown>) ?? null,
          after_json:  null,
        });
      });
      break;
    }
    case 'workstream': {
      const [before] = await db.select().from(workstreams).where(eq(workstreams.id, existingId));
      await db.transaction(async (tx) => {
        await tx.delete(workstreams).where(eq(workstreams.id, existingId));
        await tx.insert(auditLog).values({
          entity_type: entityType,
          entity_id: existingId,
          action: 'delete',
          actor_id: 'default',
          before_json: (before as Record<string, unknown>) ?? null,
          after_json: null,
        });
      });
      break;
    }
    case 'onboarding_step': {
      const [before] = await db.select().from(onboardingSteps).where(eq(onboardingSteps.id, existingId));
      await db.transaction(async (tx) => {
        await tx.delete(onboardingSteps).where(eq(onboardingSteps.id, existingId));
        await tx.insert(auditLog).values({
          entity_type: entityType,
          entity_id: existingId,
          action: 'delete',
          actor_id: 'default',
          before_json: (before as Record<string, unknown>) ?? null,
          after_json: null,
        });
      });
      break;
    }
    case 'integration': {
      const [before] = await db.select().from(integrations).where(eq(integrations.id, existingId));
      await db.transaction(async (tx) => {
        await tx.delete(integrations).where(eq(integrations.id, existingId));
        await tx.insert(auditLog).values({
          entity_type: entityType,
          entity_id: existingId,
          action: 'delete',
          actor_id: 'default',
          before_json: (before as Record<string, unknown>) ?? null,
          after_json: null,
        });
      });
      break;
    }
    // decision and history: append-only, never deleted via approve route
    default:
      break;
  }
}

// ─── POST handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;

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
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[approve] unhandled error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

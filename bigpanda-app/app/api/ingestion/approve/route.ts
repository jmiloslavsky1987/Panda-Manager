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
  wbsItems,
  teamEngagementSections,
  archNodes,
  archTracks,
  teamOnboardingStatus,
  e2eWorkflows,
  workflowSteps,
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
    'wbs_task', 'team_engagement', 'arch_node',
    'focus_area', 'e2e_workflow',   // Gap 3+4 — added Phase 50
  ]),
  fields: z.record(z.string(), z.union([z.string(), z.null()])).transform(
    f => Object.fromEntries(Object.entries(f).filter(([, v]) => v != null)) as Record<string, string>
  ),
  approved: z.boolean(),
  conflictResolution: z.enum(['merge', 'replace', 'skip']).optional(),
  existingId: z.number().optional(),
});

const ApproveRequestSchema = z.object({
  artifactId: z.number(),
  projectId: z.number(),
  items: z.array(z.unknown()).transform(arr =>
    arr.filter((item): item is z.infer<typeof ApprovalItemSchema> => {
      const r = ApprovalItemSchema.safeParse(item);
      return r.success;
    })
  ),
  totalExtracted: z.number(),
});

type ApprovalItem = z.infer<typeof ApprovalItemSchema>;

// ─── Append-only entity types (never merge/replace — auto-skip on conflict) ──

const APPEND_ONLY_TYPES = new Set<EntityType>(['decision', 'history', 'note']);

// ─── Enum coercers (Claude returns free-text; map to valid DB values) ─────────

type IntegrationStatus = 'not-connected' | 'configured' | 'validated' | 'production' | 'blocked';
function coerceIntegrationStatus(raw: string | undefined | null): IntegrationStatus {
  const v = (raw ?? '').toLowerCase().trim();
  if (['production', 'prod', 'live', 'active', 'enabled', 'running'].includes(v)) return 'production';
  if (['configured', 'setup', 'installed', 'connected'].includes(v)) return 'configured';
  if (['validated', 'tested', 'verified', 'working'].includes(v)) return 'validated';
  if (['blocked', 'failed', 'error', 'broken', 'disabled'].includes(v)) return 'blocked';
  return 'not-connected';
}

type RiskSeverity = 'low' | 'medium' | 'high' | 'critical';
function coerceRiskSeverity(raw: string | undefined | null): RiskSeverity {
  const v = (raw ?? '').toLowerCase().trim();
  if (['critical', 'crit'].includes(v)) return 'critical';
  if (['high'].includes(v)) return 'high';
  if (['medium', 'med', 'moderate'].includes(v)) return 'medium';
  if (['low', 'minor'].includes(v)) return 'low';
  return 'medium';
}

type TrackStatus = 'live' | 'in_progress' | 'pilot' | 'planned';
function coerceTrackStatus(raw: string | undefined | null): TrackStatus | null {
  if (!raw) return null;
  const v = raw.toLowerCase().trim();
  if (['live', 'production', 'active', 'enabled'].includes(v)) return 'live';
  if (['in_progress', 'in progress', 'ongoing', 'running'].includes(v)) return 'in_progress';
  if (['pilot', 'testing', 'trial'].includes(v)) return 'pilot';
  if (['planned', 'scheduled', 'upcoming', 'not started', 'not_started'].includes(v)) return 'planned';
  return null;
}

type OnboardingStepStatus = 'not-started' | 'in-progress' | 'complete' | 'blocked';
function coerceOnboardingStatus(raw: string | undefined | null): OnboardingStepStatus {
  if (!raw) return 'not-started';
  const v = raw.toLowerCase().trim();
  if (['complete', 'completed', 'done', 'finished'].includes(v)) return 'complete';
  if (['in-progress', 'in_progress', 'in progress', 'ongoing', 'running'].includes(v)) return 'in-progress';
  if (['blocked', 'stuck', 'on-hold', 'on hold'].includes(v)) return 'blocked';
  return 'not-started';
}

async function resolveEntityRef(
  tableName: 'milestones' | 'workstreams',
  nameField: string,
  projectId: number,
): Promise<number | null> {
  try {
    const key = normalize(nameField);
    if (!key) return null;
    if (tableName === 'milestones') {
      const rows = await db.select({ id: milestones.id }).from(milestones)
        .where(and(eq(milestones.project_id, projectId), ilike(milestones.name, `%${key}%`)));
      return rows.length === 1 ? rows[0].id : null;
    } else {
      const rows = await db.select({ id: workstreams.id }).from(workstreams)
        .where(and(eq(workstreams.project_id, projectId), ilike(workstreams.name, `%${key}%`)));
      return rows.length === 1 ? rows[0].id : null;
    }
  } catch {
    return null;
  }
}

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
        .select({ id: teamOnboardingStatus.id })
        .from(teamOnboardingStatus)
        .where(and(eq(teamOnboardingStatus.project_id, projectId), ilike(teamOnboardingStatus.team_name, `${key}%`)));
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
    case 'focus_area': {
      const key = normalize(f.title);
      if (!key) return null;
      const rows = await db
        .select({ id: focusAreas.id })
        .from(focusAreas)
        .where(and(eq(focusAreas.project_id, projectId), ilike(focusAreas.title, `${key}%`)));
      return rows[0] ?? null;
    }
    case 'e2e_workflow': {
      const key = normalize(f.workflow_name);
      if (!key) return null;
      const rows = await db
        .select({ id: e2eWorkflows.id })
        .from(e2eWorkflows)
        .where(and(eq(e2eWorkflows.project_id, projectId), ilike(e2eWorkflows.workflow_name, `${key}%`)));
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
): Promise<{ unresolvedMilestones: number; unresolvedWorkstreams: number }> {
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
          notes: f.notes ?? null,
          type: f.type ?? 'action',
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
      return { unresolvedMilestones: 0, unresolvedWorkstreams: 0 };

    case 'risk':
      await db.transaction(async (tx) => {
        const [inserted] = await tx.insert(risks).values({
          project_id: projectId,
          external_id: syntheticExternalId('risk', artifactId),
          description: f.description ?? '',
          owner: f.owner ?? null,
          mitigation: f.mitigation ?? null,
          severity: coerceRiskSeverity(f.severity),
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
      return { unresolvedMilestones: 0, unresolvedWorkstreams: 0 };

    case 'milestone':
      await db.transaction(async (tx) => {
        const [inserted] = await tx.insert(milestones).values({
          project_id: projectId,
          external_id: syntheticExternalId('milestone', artifactId),
          name: f.name ?? '',
          target: f.target_date ?? null,
          date: f.target_date ?? null,
          status: f.status ?? null,
          owner: f.owner ?? null,
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
      return { unresolvedMilestones: 0, unresolvedWorkstreams: 0 };

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
      return { unresolvedMilestones: 0, unresolvedWorkstreams: 0 };

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
      return { unresolvedMilestones: 0, unresolvedWorkstreams: 0 };

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
      return { unresolvedMilestones: 0, unresolvedWorkstreams: 0 };

    case 'task': {
      // Cross-entity resolution BEFORE transaction (failure must not block insert)
      const milestoneId = f.milestone_name
        ? await resolveEntityRef('milestones', f.milestone_name, projectId)
        : null;
      const workstreamId = f.workstream_name
        ? await resolveEntityRef('workstreams', f.workstream_name, projectId)
        : null;

      // Build description with unresolved ref appends
      let taskDescription: string | null = f.description ?? null;
      const unresolvedParts: string[] = [];
      let unresolvedMilestones = 0;
      let unresolvedWorkstreams = 0;

      if (f.milestone_name && milestoneId === null) {
        unresolvedParts.push(`Milestone ref: ${f.milestone_name}`);
        unresolvedMilestones = 1;
      }
      if (f.workstream_name && workstreamId === null) {
        unresolvedParts.push(`Workstream ref: ${f.workstream_name}`);
        unresolvedWorkstreams = 1;
      }
      if (unresolvedParts.length > 0) {
        const refSuffix = unresolvedParts.join(' | ');
        taskDescription = taskDescription ? `${taskDescription}\n${refSuffix}` : refSuffix;
      }

      await db.transaction(async (tx) => {
        const [inserted] = await tx.insert(tasks).values({
          project_id: projectId,
          title: f.title ?? '',
          owner: f.owner ?? null,
          phase: f.phase ?? null,
          status: f.status ?? 'todo',
          start_date: f.start_date ?? null,
          due: f.due_date ?? null,
          description: taskDescription,
          priority: f.priority ?? null,
          milestone_id: milestoneId,
          workstream_id: workstreamId,
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
      return { unresolvedMilestones, unresolvedWorkstreams };
    }

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
      return { unresolvedMilestones: 0, unresolvedWorkstreams: 0 };

    case 'team':
      // team maps to teamOnboardingStatus (NOT focusAreas — corrected in Phase 50 Gap 1)
      // teamOnboardingStatus has source-only attribution (no source_artifact_id / ingested_at)
      await db.transaction(async (tx) => {
        const [inserted] = await tx.insert(teamOnboardingStatus).values({
          project_id: projectId,
          team_name: f.team_name ?? '',
          track: f.track ?? null,
          ingest_status: coerceTrackStatus(f.ingest_status),
          correlation_status: coerceTrackStatus(f.correlation_status),
          incident_intelligence_status: coerceTrackStatus(f.incident_intelligence_status),
          sn_automation_status: coerceTrackStatus(f.sn_automation_status),
          biggy_ai_status: coerceTrackStatus(f.biggy_ai_status),
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
      return { unresolvedMilestones: 0, unresolvedWorkstreams: 0 };

    case 'architecture':
      await db.transaction(async (tx) => {
        const [inserted] = await tx.insert(architectureIntegrations).values({
          project_id: projectId,
          tool_name: f.tool_name ?? '',
          track: f.track ?? '',
          phase: f.phase ?? null,
          integration_group: f.integration_group ?? null,  // Gap 2 fix
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
      return { unresolvedMilestones: 0, unresolvedWorkstreams: 0 };

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
      return { unresolvedMilestones: 0, unresolvedWorkstreams: 0 };

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
      return { unresolvedMilestones: 0, unresolvedWorkstreams: 0 };
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
          percent_complete: (() => { const n = parseInt(f.percent_complete, 10); return Number.isFinite(n) ? n : null; })(),
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
      return { unresolvedMilestones: 0, unresolvedWorkstreams: 0 };
    }

    case 'onboarding_step': {
      // onboarding_steps table has NO source/attribution columns; phase_id default to 1
      // Gap 6 fix: track field added (completed_date not in schema — cannot persist)
      await db.transaction(async (tx) => {
        const [inserted] = await tx.insert(onboardingSteps).values({
          project_id: projectId,
          phase_id: 1, // default phase since extraction cannot determine phase
          name: f.step_name ?? '',
          description: f.description ?? null,
          owner: f.team_name ?? null,
          status: coerceOnboardingStatus(f.status),
          track: f.track ?? null,
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
      return { unresolvedMilestones: 0, unresolvedWorkstreams: 0 };
    }

    case 'integration': {
      // integrations table has NO source/attribution columns
      await db.transaction(async (tx) => {
        const [inserted] = await tx.insert(integrations).values({
          project_id: projectId,
          tool: f.tool_name ?? '',
          category: f.category ?? null,
          status: coerceIntegrationStatus(f.connection_status),
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
      return { unresolvedMilestones: 0, unresolvedWorkstreams: 0 };
    }

    case 'wbs_task': {
      // Gap 6 note: wbs_task prompt includes `description` field, but wbs_items schema does NOT have
      // a description column. The field is used by Claude for extraction context but cannot be persisted.
      // Step 1: Fuzzy match parent section by name
      const parentRows = await db
        .select({ id: wbsItems.id, name: wbsItems.name })
        .from(wbsItems)
        .where(
          and(
            eq(wbsItems.project_id, projectId),
            eq(wbsItems.track, f.track ?? 'ADR'),
            ilike(wbsItems.name, `%${f.parent_section_name ?? ''}%`),
          ),
        );

      const parentId = parentRows.length > 0 ? parentRows[0].id : null;

      // Step 2: Insert wbs_item
      await db.transaction(async (tx) => {
        const [inserted] = await tx.insert(wbsItems).values({
          project_id: projectId,
          name: f.title ?? '',
          track: f.track ?? 'ADR',
          level: parseInt(f.level ?? '3', 10),
          parent_id: parentId,
          status: f.status as 'not_started' | 'in_progress' | 'complete' | undefined ?? 'not_started',
          source_trace: 'extraction',
          display_order: 999, // append to end; user can reorder
        }).returning();

        await tx.insert(auditLog).values({
          entity_type: 'wbs_task',
          entity_id: inserted.id,
          action: 'create',
          actor_id: 'default',
          before_json: null,
          after_json: inserted as Record<string, unknown>,
        });
      });
      return { unresolvedMilestones: 0, unresolvedWorkstreams: 0 };
    }

    case 'team_engagement': {
      // Append content to existing section (not overwrite)
      const sectionRows = await db
        .select({ id: teamEngagementSections.id, content: teamEngagementSections.content })
        .from(teamEngagementSections)
        .where(
          and(
            eq(teamEngagementSections.project_id, projectId),
            eq(teamEngagementSections.name, f.section_name ?? ''),
          ),
        );

      if (sectionRows.length === 0) {
        throw new Error(`Team Engagement section not found: ${f.section_name}`);
      }

      const section = sectionRows[0];
      const existingContent = section.content || '';
      const newContent = f.content ?? '';
      const separator = existingContent.length > 0 ? '\n\n---\n\n' : '';
      const mergedContent = existingContent + separator + newContent;

      await db.transaction(async (tx) => {
        await tx
          .update(teamEngagementSections)
          .set({ content: mergedContent })
          .where(eq(teamEngagementSections.id, section.id));

        await tx.insert(auditLog).values({
          entity_type: 'team_engagement',
          entity_id: section.id,
          action: 'update',
          actor_id: 'default',
          before_json: { content: existingContent } as Record<string, unknown>,
          after_json: { content: mergedContent } as Record<string, unknown>,
        });
      });
      return { unresolvedMilestones: 0, unresolvedWorkstreams: 0 };
    }

    case 'arch_node': {
      // Step 1: Resolve track_id from track name
      const trackRows = await db
        .select({ id: archTracks.id })
        .from(archTracks)
        .where(
          and(
            eq(archTracks.project_id, projectId),
            ilike(archTracks.name, `%${f.track ?? ''}%`),
          ),
        );

      if (trackRows.length === 0) {
        throw new Error(`Architecture track not found: ${f.track}`);
      }

      const trackId = trackRows[0].id;

      // Step 2: Upsert arch_node (insert or update if exists)
      await db.transaction(async (tx) => {
        const [inserted] = await tx
          .insert(archNodes)
          .values({
            project_id: projectId,
            track_id: trackId,
            name: f.node_name ?? '',
            status: f.status as 'planned' | 'in_progress' | 'live' | undefined ?? 'planned',
            notes: f.notes ?? null,
            source_trace: 'extraction',
            display_order: 999,
          })
          .onConflictDoUpdate({
            target: [archNodes.project_id, archNodes.track_id, archNodes.name],
            set: {
              status: f.status as 'planned' | 'in_progress' | 'live' | undefined ?? 'planned',
              notes: f.notes ?? null,
            },
          })
          .returning();

        await tx.insert(auditLog).values({
          entity_type: 'arch_node',
          entity_id: inserted.id,
          action: 'create_or_update',
          actor_id: 'default',
          before_json: null,
          after_json: inserted as Record<string, unknown>,
        });
      });
      return { unresolvedMilestones: 0, unresolvedWorkstreams: 0 };
    }

    case 'focus_area':
      await db.transaction(async (tx) => {
        const [inserted] = await tx.insert(focusAreas).values({
          project_id: projectId,
          title: f.title ?? '',
          tracks: f.tracks ?? null,
          why_it_matters: f.why_it_matters ?? null,
          current_status: f.current_status ?? null,
          next_step: f.next_step ?? null,
          bp_owner: f.bp_owner ?? null,
          customer_owner: f.customer_owner ?? null,
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
      return { unresolvedMilestones: 0, unresolvedWorkstreams: 0 };

    case 'e2e_workflow': {
      // Parse steps JSON with fallback to empty array (LLM may return malformed JSON)
      let stepsArray: Array<{ label: string; track?: string; status?: string; position?: number }> = [];
      try {
        if (f.steps) {
          const parsed = JSON.parse(f.steps);
          stepsArray = Array.isArray(parsed) ? parsed : [];
        }
      } catch {
        stepsArray = []; // fallback — never let parse failure block the parent insert
      }

      await db.transaction(async (tx) => {
        // Insert parent workflow row
        const [inserted] = await tx.insert(e2eWorkflows).values({
          project_id: projectId,
          team_name: f.team_name ?? '',
          workflow_name: f.workflow_name ?? '',
          ...attribution,
        }).returning();

        // Insert child step rows (workflowSteps has no attribution columns)
        if (stepsArray.length > 0) {
          await tx.insert(workflowSteps).values(
            stepsArray.map((step, idx) => ({
              workflow_id: inserted.id,
              label: step.label ?? '',
              track: step.track ?? null,
              status: step.status ?? null,
              position: step.position ?? idx,
            }))
          );
        }

        await tx.insert(auditLog).values({
          entity_type: item.entityType,
          entity_id: inserted.id,
          action: 'create',
          actor_id: 'default',
          before_json: null,
          after_json: inserted as Record<string, unknown>,
        });
      });
      return { unresolvedMilestones: 0, unresolvedWorkstreams: 0 };
    }
  }
  return { unresolvedMilestones: 0, unresolvedWorkstreams: 0 };
}

// ─── Entity update helpers (merge) ───────────────────────────────────────────

async function mergeItem(
  item: ApprovalItem,
  existingId: number,
  artifactId: number,
  projectId: number,
): Promise<{ unresolvedMilestones: number; unresolvedWorkstreams: number }> {
  const f = item.fields;
  const attribution = {
    source_artifact_id: artifactId,
    ingested_at: new Date(),
  };

  switch (item.entityType) {
    case 'action': {
      const [beforeRecord] = await db.select().from(actions).where(eq(actions.id, existingId));
      const patch = {
        owner: f.owner ?? undefined,
        due: f.due_date ?? undefined,
        notes: beforeRecord.notes ? undefined : (f.notes || undefined),
        type: (beforeRecord.type && beforeRecord.type !== 'action') ? undefined : (f.type || undefined),
        ...attribution,
      };
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
      return { unresolvedMilestones: 0, unresolvedWorkstreams: 0 };
    }

    case 'risk': {
      const [beforeRecord] = await db.select().from(risks).where(eq(risks.id, existingId));
      const patch = {
        owner: f.owner ?? undefined,
        mitigation: f.mitigation ?? undefined,
        severity: beforeRecord.severity ? undefined : coerceRiskSeverity(f.severity),
        ...attribution,
      };
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
      return { unresolvedMilestones: 0, unresolvedWorkstreams: 0 };
    }

    case 'milestone': {
      const [beforeRecord] = await db.select().from(milestones).where(eq(milestones.id, existingId));
      const patch = {
        target: f.target_date ?? undefined,
        status: f.status ?? undefined,
        owner: beforeRecord.owner ? undefined : (f.owner ?? undefined),
        ...attribution,
      };
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
      return { unresolvedMilestones: 0, unresolvedWorkstreams: 0 };
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
      return { unresolvedMilestones: 0, unresolvedWorkstreams: 0 };
    }

    case 'task': {
      const [beforeRecord] = await db.select().from(tasks).where(eq(tasks.id, existingId));

      // Resolve FKs BEFORE transaction (same pattern as insertItem)
      const milestoneId = (!beforeRecord.milestone_id && f.milestone_name)
        ? await resolveEntityRef('milestones', f.milestone_name, projectId)
        : null;
      const workstreamId = (!beforeRecord.workstream_id && f.workstream_name)
        ? await resolveEntityRef('workstreams', f.workstream_name, projectId)
        : null;

      // Track unresolved refs for response notice
      let unresolvedMilestones = 0;
      let unresolvedWorkstreams = 0;
      if (f.milestone_name && !beforeRecord.milestone_id && milestoneId === null) unresolvedMilestones++;
      if (f.workstream_name && !beforeRecord.workstream_id && workstreamId === null) unresolvedWorkstreams++;

      const patch = {
        owner: f.owner ?? undefined,
        phase: f.phase ?? undefined,
        status: f.status ?? undefined,
        start_date: beforeRecord.start_date ? undefined : (f.start_date || undefined),
        due: beforeRecord.due ? undefined : (f.due_date || undefined),
        description: beforeRecord.description ? undefined : (f.description || undefined),
        priority: beforeRecord.priority ? undefined : (f.priority || undefined),
        milestone_id: milestoneId ?? undefined,
        workstream_id: workstreamId ?? undefined,
        ...attribution,
      };

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
      return { unresolvedMilestones, unresolvedWorkstreams };
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
      return { unresolvedMilestones: 0, unresolvedWorkstreams: 0 };
    }

    case 'team': {
      const [beforeRecord] = await db.select().from(teamOnboardingStatus).where(eq(teamOnboardingStatus.id, existingId));
      const patch = {
        track: f.track ?? undefined,
        ingest_status: coerceTrackStatus(f.ingest_status),
        correlation_status: coerceTrackStatus(f.correlation_status),
        incident_intelligence_status: coerceTrackStatus(f.incident_intelligence_status),
        sn_automation_status: coerceTrackStatus(f.sn_automation_status),
        biggy_ai_status: coerceTrackStatus(f.biggy_ai_status),
      };
      await db.transaction(async (tx) => {
        await tx.update(teamOnboardingStatus).set(patch).where(eq(teamOnboardingStatus.id, existingId));
        await tx.insert(auditLog).values({
          entity_type: item.entityType,
          entity_id: existingId,
          action: 'update',
          actor_id: 'default',
          before_json: beforeRecord as Record<string, unknown>,
          after_json: { ...beforeRecord, ...patch } as Record<string, unknown>,
        });
      });
      return { unresolvedMilestones: 0, unresolvedWorkstreams: 0 };
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
      return { unresolvedMilestones: 0, unresolvedWorkstreams: 0 };
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
      return { unresolvedMilestones: 0, unresolvedWorkstreams: 0 };
    }

    case 'workstream': {
      const [beforeRecord] = await db.select().from(workstreams).where(eq(workstreams.id, existingId));
      const patch = {
        track: f.track ?? undefined,
        current_status: f.status ?? undefined,
        lead: f.owner ?? undefined,
        state: f.state ?? undefined,
        percent_complete: (() => { const n = parseInt(f.percent_complete, 10); return Number.isFinite(n) ? n : undefined; })(),
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
      return { unresolvedMilestones: 0, unresolvedWorkstreams: 0 };
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
      return { unresolvedMilestones: 0, unresolvedWorkstreams: 0 };
    }

    case 'integration': {
      const [beforeRecord] = await db.select().from(integrations).where(eq(integrations.id, existingId));
      const patch = {
        category: f.category ?? undefined,
        status: f.connection_status ? coerceIntegrationStatus(f.connection_status) : undefined,
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
      return { unresolvedMilestones: 0, unresolvedWorkstreams: 0 };
    }

    // decision and history are append-only — merge is not applicable
    default:
      return { unresolvedMilestones: 0, unresolvedWorkstreams: 0 };
  }
}

// ─── Entity delete helpers (replace step 1) ──────────────────────────────────

async function deleteItem(entityType: EntityType, existingId: number): Promise<{ unresolvedMilestones: number; unresolvedWorkstreams: number }> {
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
      return { unresolvedMilestones: 0, unresolvedWorkstreams: 0 };
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
      return { unresolvedMilestones: 0, unresolvedWorkstreams: 0 };
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
      return { unresolvedMilestones: 0, unresolvedWorkstreams: 0 };
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
      return { unresolvedMilestones: 0, unresolvedWorkstreams: 0 };
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
      return { unresolvedMilestones: 0, unresolvedWorkstreams: 0 };
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
      return { unresolvedMilestones: 0, unresolvedWorkstreams: 0 };
    }
    case 'team': {
      const [before] = await db.select().from(teamOnboardingStatus).where(eq(teamOnboardingStatus.id, existingId));
      await db.transaction(async (tx) => {
        await tx.delete(teamOnboardingStatus).where(eq(teamOnboardingStatus.id, existingId));
        await tx.insert(auditLog).values({
          entity_type: entityType,
          entity_id: existingId,
          action: 'delete',
          actor_id: 'default',
          before_json: (before as Record<string, unknown>) ?? null,
          after_json: null,
        });
      });
      return { unresolvedMilestones: 0, unresolvedWorkstreams: 0 };
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
      return { unresolvedMilestones: 0, unresolvedWorkstreams: 0 };
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
      return { unresolvedMilestones: 0, unresolvedWorkstreams: 0 };
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
      return { unresolvedMilestones: 0, unresolvedWorkstreams: 0 };
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
      return { unresolvedMilestones: 0, unresolvedWorkstreams: 0 };
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
      return { unresolvedMilestones: 0, unresolvedWorkstreams: 0 };
    }
    // decision and history: append-only, never deleted via approve route
    default:
      return { unresolvedMilestones: 0, unresolvedWorkstreams: 0 };
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
  let unresolvedMilestoneCount = 0;
  let unresolvedWorkstreamCount = 0;

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
          const counts = await insertItem(item, projectId, artifactId);
          unresolvedMilestoneCount += counts.unresolvedMilestones;
          unresolvedWorkstreamCount += counts.unresolvedWorkstreams;
          written++;
          break;
        }

        case 'merge': {
          const idToMerge = item.existingId ?? existing.id;
          const counts = await mergeItem(item, idToMerge, artifactId, projectId);
          unresolvedMilestoneCount += counts.unresolvedMilestones;
          unresolvedWorkstreamCount += counts.unresolvedWorkstreams;
          written++;
          break;
        }
      }
    } else {
      // No conflict — direct insert
      const counts = await insertItem(item, projectId, artifactId);
      unresolvedMilestoneCount += counts.unresolvedMilestones;
      unresolvedWorkstreamCount += counts.unresolvedWorkstreams;
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
  const parts: string[] = [];
  if (unresolvedMilestoneCount > 0) {
    parts.push(`${unresolvedMilestoneCount} task${unresolvedMilestoneCount === 1 ? '' : 's'} had unresolved milestone references`);
  }
  if (unresolvedWorkstreamCount > 0) {
    parts.push(`${unresolvedWorkstreamCount} task${unresolvedWorkstreamCount === 1 ? '' : 's'} had unresolved workstream references`);
  }
  const unresolvedRefs = parts.length > 0
    ? `${parts.join(', ')} — link them manually via the Plan tab`
    : null;

  return NextResponse.json({ written, skipped, rejected, unresolvedRefs }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[approve] unhandled error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

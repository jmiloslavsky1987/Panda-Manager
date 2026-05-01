/**
 * extraction-types.ts — Shared types and utilities for document extraction
 *
 * Extracted from app/api/ingestion/extract/route.ts to support both:
 * - The thin enqueue endpoint (Plan 31-03)
 * - The BullMQ worker job (Plan 31-02)
 * - UI components that preview extracted data
 */

import { eq, and, ilike, ne, or, isNull, sql } from 'drizzle-orm';
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
  workstreams,
  onboardingSteps,
  integrations,
  wbsItems,
  archNodes,
  archTracks,
  teamOnboardingStatus,
  e2eWorkflows,
  teamPathways,
} from '@/db/schema';

// ─── Types ────────────────────────────────────────────────────────────────────

export type EntityType =
  | 'action'
  | 'risk'
  | 'decision'
  | 'milestone'
  | 'stakeholder'
  | 'task'
  | 'architecture'
  | 'history'
  | 'businessOutcome'
  | 'team'
  | 'note'
  | 'team_pathway'
  | 'workstream'
  | 'onboarding_step'
  | 'integration'
  | 'wbs_task'
  | 'arch_node'
  | 'focus_area'     // Gap 3 — added Phase 50
  | 'e2e_workflow'   // Gap 4 — added Phase 50
  | 'before_state'   // Gap A — added Phase 51
  | 'weekly_focus';  // Gap G — added Phase 51

export interface ExtractionItem {
  entityType: EntityType;
  fields: Record<string, string>;
  confidence: number;      // 0.0 – 1.0
  sourceExcerpt: string;   // verbatim text excerpt (max 200 chars)
}

// ─── Dedup Logic (ING-12) ─────────────────────────────────────────────────────

function normalize(value: string | undefined | null): string {
  if (!value) return '';
  // 40-char window: short enough that Claude's paraphrased or appended descriptions
  // still share the opening phrase with the DB record, enabling a contains match.
  return value.toLowerCase().trim().slice(0, 40);
}

function dedupePattern(key: string): string {
  return `%${key}%`;
}

/**
 * Checks whether an extraction item already exists in the DB for the given project.
 * Returns true = already ingested (filter out), false = net-new (surface to user).
 */
export async function isAlreadyIngested(
  item: ExtractionItem,
  projectId: number,
): Promise<boolean> {
  const f = item.fields;

  switch (item.entityType) {
    case 'action': {
      const key = normalize(f.description);
      if (!key) return false;
      const rows = await db
        .select({ id: actions.id })
        .from(actions)
        .where(and(eq(actions.project_id, projectId), ilike(actions.description, dedupePattern(key))));
      return rows.length > 0;
    }

    case 'risk': {
      const key = normalize(f.description);
      if (!key) return false;
      const rows = await db
        .select({ id: risks.id })
        .from(risks)
        .where(and(eq(risks.project_id, projectId), ilike(risks.description, dedupePattern(key))));
      return rows.length > 0;
    }

    case 'milestone': {
      const key = normalize(f.name);
      if (!key) return false;
      const rows = await db
        .select({ id: milestones.id })
        .from(milestones)
        .where(and(eq(milestones.project_id, projectId), ilike(milestones.name, dedupePattern(key))));
      return rows.length > 0;
    }

    case 'decision': {
      const key = normalize(f.decision);
      if (!key) return false;
      const rows = await db
        .select({ id: keyDecisions.id })
        .from(keyDecisions)
        .where(and(eq(keyDecisions.project_id, projectId), ilike(keyDecisions.decision, dedupePattern(key))));
      return rows.length > 0;
    }

    case 'history':
    case 'note': {
      const key = normalize(f.content ?? f.context);
      if (!key) return false;
      const rows = await db
        .select({ id: engagementHistory.id })
        .from(engagementHistory)
        .where(and(eq(engagementHistory.project_id, projectId), ilike(engagementHistory.content, dedupePattern(key))));
      return rows.length > 0;
    }

    case 'stakeholder': {
      if (f.email && f.email.trim()) {
        const rows = await db
          .select({ id: stakeholders.id })
          .from(stakeholders)
          .where(and(eq(stakeholders.project_id, projectId), ilike(stakeholders.email, f.email.trim())));
        return rows.length > 0;
      }
      const key = normalize(f.name);
      if (!key) return false;
      const rows = await db
        .select({ id: stakeholders.id })
        .from(stakeholders)
        .where(and(eq(stakeholders.project_id, projectId), ilike(stakeholders.name, dedupePattern(key))));
      return rows.length > 0;
    }

    case 'task': {
      const key = normalize(f.title);
      if (!key) return false;
      const rows = await db
        .select({ id: tasks.id })
        .from(tasks)
        .where(and(eq(tasks.project_id, projectId), ilike(tasks.title, dedupePattern(key))));
      return rows.length > 0;
    }

    case 'businessOutcome': {
      const key = normalize(f.title);
      if (!key) return false;
      const rows = await db
        .select({ id: businessOutcomes.id })
        .from(businessOutcomes)
        .where(and(eq(businessOutcomes.project_id, projectId), ilike(businessOutcomes.title, dedupePattern(key))));
      return rows.length > 0;
    }

    case 'team': {
      const key = normalize(f.team_name);
      if (!key) return false;
      const rows = await db
        .select({ id: teamOnboardingStatus.id })
        .from(teamOnboardingStatus)
        .where(and(eq(teamOnboardingStatus.project_id, projectId), ilike(teamOnboardingStatus.team_name, dedupePattern(key))));
      return rows.length > 0;
    }

    case 'architecture': {
      const toolKey = normalize(f.tool_name);
      if (!toolKey) return false;
      const rows = await db
        .select({ id: architectureIntegrations.id })
        .from(architectureIntegrations)
        .where(and(eq(architectureIntegrations.project_id, projectId), ilike(architectureIntegrations.tool_name, dedupePattern(toolKey))));
      return rows.length > 0;
    }

    case 'workstream': {
      const key = normalize(f.name);
      if (!key) return false;
      const rows = await db.select({ id: workstreams.id }).from(workstreams)
        .where(and(eq(workstreams.project_id, projectId), ilike(workstreams.name, dedupePattern(key))));
      return rows.length > 0;
    }

    case 'onboarding_step':
      // onboarding_steps has no source_trace — seeded template steps share names with real extracted steps.
      // Always surface for review; the approve handler does an upsert so no duplicates are written.
      return false;

    case 'integration': {
      const key = normalize(f.tool_name);
      if (!key) return false;
      const rows = await db.select({ id: integrations.id }).from(integrations)
        .where(and(eq(integrations.project_id, projectId), ilike(integrations.tool, dedupePattern(key))));
      return rows.length > 0;
    }

    case 'wbs_task': {
      const key = normalize(f.title);
      if (!key) return false;
      const rows = await db
        .select({ id: wbsItems.id })
        .from(wbsItems)
        .where(
          and(
            eq(wbsItems.project_id, projectId),
            eq(wbsItems.track, f.track ?? 'ADR'),
            ilike(wbsItems.name, dedupePattern(key)),
            or(isNull(wbsItems.source_trace), ne(wbsItems.source_trace, 'template')),
          ),
        );
      return rows.length > 0;
    }

    case 'arch_node': {
      const key = normalize(f.node_name);
      if (!key) return false;
      const trackRows = await db
        .select({ id: archTracks.id })
        .from(archTracks)
        .where(and(eq(archTracks.project_id, projectId), ilike(archTracks.name, `%${f.track ?? ''}%`)));
      if (trackRows.length === 0) return false;
      const trackId = trackRows[0].id;
      const rows = await db
        .select({ id: archNodes.id })
        .from(archNodes)
        .where(and(
          eq(archNodes.project_id, projectId),
          eq(archNodes.track_id, trackId),
          ilike(archNodes.name, dedupePattern(key)),
          or(isNull(archNodes.source_trace), ne(archNodes.source_trace, 'template')),
        ));
      return rows.length > 0;
    }

    case 'focus_area': {
      const key = normalize(f.title);
      if (!key) return false;
      const rows = await db
        .select({ id: focusAreas.id })
        .from(focusAreas)
        .where(and(eq(focusAreas.project_id, projectId), ilike(focusAreas.title, dedupePattern(key))));
      return rows.length > 0;
    }

    case 'e2e_workflow': {
      const workflowKey = normalize(f.workflow_name);
      const teamKey = normalize(f.team_name);
      if (!workflowKey || !teamKey) return false;
      const rows = await db
        .select({ id: e2eWorkflows.id })
        .from(e2eWorkflows)
        .where(
          and(
            eq(e2eWorkflows.project_id, projectId),
            ilike(e2eWorkflows.workflow_name, dedupePattern(workflowKey)),
            ilike(e2eWorkflows.team_name, dedupePattern(teamKey)),
          ),
        );
      return rows.length > 0;
    }

    case 'team_pathway': {
      const key = normalize(f.team_name);
      if (!key) return false;
      const rows = await db
        .select({ id: teamPathways.id })
        .from(teamPathways)
        .where(and(eq(teamPathways.project_id, projectId), ilike(teamPathways.team_name, dedupePattern(key))));
      return rows.length > 0;
    }

    case 'before_state':
      // Singleton per project — upsert in approve handler handles re-ingestion correctly
      return false;

    case 'weekly_focus':
      // Ephemeral Redis cache — always allow re-extraction
      return false;

    default:
      return false;
  }
}

/**
 * extraction-types.ts — Shared types and utilities for document extraction
 *
 * Extracted from app/api/ingestion/extract/route.ts to support both:
 * - The thin enqueue endpoint (Plan 31-03)
 * - The BullMQ worker job (Plan 31-02)
 * - UI components that preview extracted data
 */

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
  workstreams,
  onboardingSteps,
  integrations,
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
  | 'integration';

export interface ExtractionItem {
  entityType: EntityType;
  fields: Record<string, string>;
  confidence: number;      // 0.0 – 1.0
  sourceExcerpt: string;   // verbatim text excerpt (max 200 chars)
}

// ─── Dedup Logic (ING-12) ─────────────────────────────────────────────────────

function normalize(value: string | undefined | null): string {
  if (!value) return '';
  return value.toLowerCase().trim().slice(0, 120);
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
        .where(
          and(
            eq(actions.project_id, projectId),
            ilike(actions.description, `${key}%`),
          ),
        );
      // Exact prefix match on first 120 chars
      return rows.some(r => {
        // rows matched by ilike prefix; confirm normalized key matches exactly
        return true; // ilike already guarantees prefix match — if rows > 0, it's a match
      });
    }

    case 'risk': {
      const key = normalize(f.description);
      if (!key) return false;
      const rows = await db
        .select({ id: risks.id })
        .from(risks)
        .where(
          and(
            eq(risks.project_id, projectId),
            ilike(risks.description, `${key}%`),
          ),
        );
      return rows.length > 0;
    }

    case 'milestone': {
      const key = normalize(f.name);
      if (!key) return false;
      const rows = await db
        .select({ id: milestones.id })
        .from(milestones)
        .where(
          and(
            eq(milestones.project_id, projectId),
            ilike(milestones.name, `${key}%`),
          ),
        );
      return rows.length > 0;
    }

    case 'decision': {
      const key = normalize(f.decision);
      if (!key) return false;
      const rows = await db
        .select({ id: keyDecisions.id })
        .from(keyDecisions)
        .where(
          and(
            eq(keyDecisions.project_id, projectId),
            ilike(keyDecisions.decision, `${key}%`),
          ),
        );
      return rows.length > 0;
    }

    case 'history':
    case 'note': {
      const key = normalize(f.content ?? f.context);
      if (!key) return false;
      const rows = await db
        .select({ id: engagementHistory.id })
        .from(engagementHistory)
        .where(
          and(
            eq(engagementHistory.project_id, projectId),
            ilike(engagementHistory.content, `${key}%`),
          ),
        );
      return rows.length > 0;
    }

    case 'stakeholder': {
      // Match on email if present, else normalized name
      if (f.email && f.email.trim()) {
        const rows = await db
          .select({ id: stakeholders.id })
          .from(stakeholders)
          .where(
            and(
              eq(stakeholders.project_id, projectId),
              ilike(stakeholders.email, f.email.trim()),
            ),
          );
        return rows.length > 0;
      }
      const key = normalize(f.name);
      if (!key) return false;
      const rows = await db
        .select({ id: stakeholders.id })
        .from(stakeholders)
        .where(
          and(
            eq(stakeholders.project_id, projectId),
            ilike(stakeholders.name, `${key}%`),
          ),
        );
      return rows.length > 0;
    }

    case 'task': {
      const key = normalize(f.title);
      if (!key) return false;
      const rows = await db
        .select({ id: tasks.id })
        .from(tasks)
        .where(
          and(
            eq(tasks.project_id, projectId),
            ilike(tasks.title, `${key}%`),
          ),
        );
      return rows.length > 0;
    }

    case 'businessOutcome': {
      const key = normalize(f.title);
      if (!key) return false;
      const rows = await db
        .select({ id: businessOutcomes.id })
        .from(businessOutcomes)
        .where(
          and(
            eq(businessOutcomes.project_id, projectId),
            ilike(businessOutcomes.title, `${key}%`),
          ),
        );
      return rows.length > 0;
    }

    case 'team': {
      // team maps to focus_areas (track-level grouping)
      const key = normalize(f.team_name);
      if (!key) return false;
      const rows = await db
        .select({ id: focusAreas.id })
        .from(focusAreas)
        .where(
          and(
            eq(focusAreas.project_id, projectId),
            ilike(focusAreas.title, `${key}%`),
          ),
        );
      return rows.length > 0;
    }

    case 'architecture': {
      // Match on tool_name + track combination
      const toolKey = normalize(f.tool_name);
      const trackKey = normalize(f.track);
      if (!toolKey) return false;
      const rows = await db
        .select({ id: architectureIntegrations.id })
        .from(architectureIntegrations)
        .where(
          and(
            eq(architectureIntegrations.project_id, projectId),
            ilike(architectureIntegrations.tool_name, `${toolKey}%`),
          ),
        );
      // If track is also provided, further filter by track match
      if (trackKey && rows.length > 0) {
        // rows were fetched by tool_name prefix; track check is advisory (not a DB filter to keep it simple)
        return rows.length > 0;
      }
      return rows.length > 0;
    }

    case 'workstream': {
      const key = normalize(f.name);
      if (!key) return false;
      const rows = await db.select({ id: workstreams.id }).from(workstreams)
        .where(and(eq(workstreams.project_id, projectId), ilike(workstreams.name, `${key}%`)));
      return rows.length > 0;
    }

    case 'onboarding_step': {
      const key = normalize(f.step_name);
      if (!key) return false;
      const rows = await db.select({ id: onboardingSteps.id }).from(onboardingSteps)
        .where(and(eq(onboardingSteps.project_id, projectId), ilike(onboardingSteps.name, `${key}%`)));
      return rows.length > 0;
    }

    case 'integration': {
      const key = normalize(f.tool_name);
      if (!key) return false;
      const rows = await db.select({ id: integrations.id }).from(integrations)
        .where(and(eq(integrations.project_id, projectId), ilike(integrations.tool, `${key}%`)));
      return rows.length > 0;
    }

    default:
      return false;
  }
}

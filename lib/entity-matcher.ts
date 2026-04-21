/**
 * entity-matcher.ts — Fuzzy entity matching using PostgreSQL trigrams
 *
 * Phase 73.1 Plan 03 — Entity Lifecycle Management
 *
 * Provides findSimilarEntities() which uses pg_trgm similarity() to find
 * existing DB records that match extracted entities by ~70%+ text similarity.
 *
 * Used by Pass 5 change detection to identify potential updates/closures.
 */

import { db } from '@/db';
import { sql } from 'drizzle-orm';

export interface MatchCandidate {
  id: number;
  similarity: number;
  entityType: string;
  [key: string]: unknown;
}

// Entity types that should never be matched (append-only or no primary text)
const SKIP_MATCH_TYPES = new Set([
  'history',        // engagement_history — append-only DB trigger
  'decision',       // key_decisions — append-only DB trigger
  'architecture',   // architectureIntegrations — complex structure, no single text field
  'team_engagement', // no primary text field
  'before_state',   // point-in-time snapshot, no match makes sense
  'weekly_focus',   // auto-generated, not user-authored
]);

/**
 * Find similar entities in the database using PostgreSQL trigram similarity.
 *
 * @param entityType - The type of entity to search for
 * @param primaryText - The primary text to match against (description, name, title, etc.)
 * @param projectId - Project ID for isolation
 * @param threshold - Similarity threshold (0.0-1.0), defaults to 0.7
 * @returns Array of matching candidates sorted by similarity (desc), max 3 results
 */
export async function findSimilarEntities(
  entityType: string,
  primaryText: string,
  projectId: number,
  threshold = 0.7
): Promise<MatchCandidate[]> {
  if (SKIP_MATCH_TYPES.has(entityType)) return [];
  if (!primaryText || primaryText.trim().length < 10) return [];

  try {
    switch (entityType) {
      case 'action': {
        const rows = await db.execute(sql`
          SELECT id, description, owner, status,
            similarity(description, ${primaryText}) AS similarity
          FROM actions
          WHERE project_id = ${projectId}
            AND similarity(description, ${primaryText}) > ${threshold}
          ORDER BY similarity DESC LIMIT 3
        `);
        return rows.rows.map(r => ({ ...r as Record<string, unknown>, entityType } as MatchCandidate));
      }
      case 'risk': {
        const rows = await db.execute(sql`
          SELECT id, description, severity, status,
            similarity(description, ${primaryText}) AS similarity
          FROM risks
          WHERE project_id = ${projectId}
            AND similarity(description, ${primaryText}) > ${threshold}
          ORDER BY similarity DESC LIMIT 3
        `);
        return rows.rows.map(r => ({ ...r as Record<string, unknown>, entityType } as MatchCandidate));
      }
      case 'milestone': {
        const rows = await db.execute(sql`
          SELECT id, name, status, target,
            similarity(name, ${primaryText}) AS similarity
          FROM milestones
          WHERE project_id = ${projectId}
            AND similarity(name, ${primaryText}) > ${threshold}
          ORDER BY similarity DESC LIMIT 3
        `);
        return rows.rows.map(r => ({ ...r as Record<string, unknown>, entityType } as MatchCandidate));
      }
      case 'stakeholder': {
        const rows = await db.execute(sql`
          SELECT id, name, role, email,
            similarity(name, ${primaryText}) AS similarity
          FROM stakeholders
          WHERE project_id = ${projectId}
            AND similarity(name, ${primaryText}) > ${threshold}
          ORDER BY similarity DESC LIMIT 3
        `);
        return rows.rows.map(r => ({ ...r as Record<string, unknown>, entityType } as MatchCandidate));
      }
      case 'workstream': {
        const rows = await db.execute(sql`
          SELECT id, name, current_status, lead,
            similarity(name, ${primaryText}) AS similarity
          FROM workstreams
          WHERE project_id = ${projectId}
            AND similarity(name, ${primaryText}) > ${threshold}
          ORDER BY similarity DESC LIMIT 3
        `);
        return rows.rows.map(r => ({ ...r as Record<string, unknown>, entityType } as MatchCandidate));
      }
      case 'focus_area': {
        const rows = await db.execute(sql`
          SELECT id, title, status,
            similarity(title, ${primaryText}) AS similarity
          FROM focus_areas
          WHERE project_id = ${projectId}
            AND similarity(title, ${primaryText}) > ${threshold}
          ORDER BY similarity DESC LIMIT 3
        `);
        return rows.rows.map(r => ({ ...r as Record<string, unknown>, entityType } as MatchCandidate));
      }
      case 'e2e_workflow': {
        const rows = await db.execute(sql`
          SELECT id, workflow_name, team_name,
            similarity(workflow_name, ${primaryText}) AS similarity
          FROM e2e_workflows
          WHERE project_id = ${projectId}
            AND similarity(workflow_name, ${primaryText}) > ${threshold}
          ORDER BY similarity DESC LIMIT 3
        `);
        return rows.rows.map(r => ({ ...r as Record<string, unknown>, entityType } as MatchCandidate));
      }
      case 'task': {
        const rows = await db.execute(sql`
          SELECT id, title, status, owner,
            similarity(title, ${primaryText}) AS similarity
          FROM tasks
          WHERE project_id = ${projectId}
            AND similarity(title, ${primaryText}) > ${threshold}
          ORDER BY similarity DESC LIMIT 3
        `);
        return rows.rows.map(r => ({ ...r as Record<string, unknown>, entityType } as MatchCandidate));
      }
      default:
        return [];
    }
  } catch (err) {
    // pg_trgm not enabled or query error — fail silently, change detection is non-fatal
    console.warn('[entity-matcher] similarity query failed:', err);
    return [];
  }
}

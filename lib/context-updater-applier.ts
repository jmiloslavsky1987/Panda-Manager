// lib/context-updater-applier.ts
// Helper that applies the context-updater skill's JSON output to the four new Phase 88.1 DB write paths.
// Called by worker/jobs/context-updater.ts after orchestrator.run completes.
//
// Idempotency: DB-level partial UNIQUE INDEX evidence_log_idem_idx prevents duplicate context_upload entries.
// Applier catches Postgres error code 23505 (duplicate key violation) and swallows it — a second run on
// the same input silently skips already-inserted Evidence Log rows.
//
// Ownership enforcement: team_card.project_id must equal projectId before any key-metric update;
// milestone.project_id must equal projectId before any date update.
//
// All auto-generated writes set source: 'context_upload' — SourceBadge differentiates manual vs auto entries.

import { eq, and } from 'drizzle-orm';
import db from '@/db';
import { evidenceLog, teamCards, teamCardKeyMetrics, milestones } from '@/db/schema';

type Iso = string;

export interface ContextUpdaterResult {
  // Existing 7-section fields are intentionally omitted here — the existing flow handles them.
  // Phase 88.1 applier only consumes the 4 new arrays.
  evidenceLog?: Array<{
    business_outcome_id: number;
    date: Iso;
    text: string;
    source?: 'context_upload' | 'manual';
  }>;
  teamCardLatestActivity?: Array<{
    team_name: string;
    latest_activity_date: Iso;
    latest_activity_text: string;
    latest_activity_source?: 'context_upload' | 'manual';
  }>;
  teamCardKeyMetricsCurrent?: Array<{
    metric_id: number;
    current: string;
    source?: 'context_upload' | 'manual';
  }>;
  milestoneTargetDateUpdates?: Array<{
    milestone_id: number;
    date: Iso;
  }>;
}

export interface ApplyCounts {
  evidenceLogInserts: number;
  teamCardUpdates: number;
  keyMetricUpdates: number;
  milestoneDateUpdates: number;
}

/**
 * Applies the context-updater skill result to the 4 new Phase 88.1 DB surfaces.
 *
 * @param projectId - The project to scope all writes to (ownership enforced)
 * @param result - Parsed JSON result from the orchestrator, or raw string to be parsed
 * @param artifactId - Optional: the artifact ID that triggered this run (stored on evidence_log.source_artifact_id)
 * @returns Aggregate count of rows written per table
 */
export async function applyContextUpdaterResult(
  projectId: number,
  result: ContextUpdaterResult | string,
  artifactId?: number,
): Promise<ApplyCounts> {
  const parsed: ContextUpdaterResult =
    typeof result === 'string' ? safeParse(result) : (result ?? {});

  const counts: ApplyCounts = {
    evidenceLogInserts: 0,
    teamCardUpdates: 0,
    keyMetricUpdates: 0,
    milestoneDateUpdates: 0,
  };

  // ── 1. Evidence Log entries (append-only) ────────────────────────────────────
  // Idempotency: DB partial UNIQUE INDEX evidence_log_idem_idx on (business_outcome_id, source_artifact_id, text)
  // WHERE source = 'context_upload' prevents duplicate rows. On conflict (Postgres 23505) we log and skip.
  if (Array.isArray(parsed.evidenceLog)) {
    for (const entry of parsed.evidenceLog) {
      if (!entry || !entry.business_outcome_id || !entry.text || !entry.date) continue;
      try {
        await db.insert(evidenceLog).values({
          business_outcome_id: entry.business_outcome_id,
          date: entry.date,
          source: 'context_upload',
          source_artifact_id: artifactId ?? null,
          text: entry.text,
          ingested_at: new Date(),
        });
        counts.evidenceLogInserts++;
        console.log(
          `[ctx-applier] project=${projectId} table=evidence_log action=insert source=context_upload outcome_id=${entry.business_outcome_id}`,
        );
      } catch (err) {
        // Postgres 23505 = duplicate key value violates unique constraint (evidence_log_idem_idx)
        // Idempotency guard: swallow the error so BullMQ retries don't produce duplicate rows.
        const code = (err as { code?: string }).code;
        if (code === '23505') {
          console.log(
            `[ctx-applier] evidence_log duplicate skipped (23505) — outcome_id=${entry.business_outcome_id} text="${entry.text.slice(0, 60)}"`,
          );
        } else {
          console.error(
            `[ctx-applier] evidence_log insert failed (code=${code ?? 'unknown'}): ${err instanceof Error ? err.message : err}`,
          );
        }
      }
    }
  }

  // ── 2. Team Card Latest Activity (overwrite, scoped by team_name within project) ──
  if (Array.isArray(parsed.teamCardLatestActivity)) {
    for (const upd of parsed.teamCardLatestActivity) {
      if (!upd || !upd.team_name || !upd.latest_activity_text) continue;
      const [card] = await db
        .select()
        .from(teamCards)
        .where(and(eq(teamCards.project_id, projectId), eq(teamCards.team_name, upd.team_name)));
      if (!card) {
        console.log(
          `[ctx-applier] team_card not found for team_name="${upd.team_name}" project=${projectId}; skipping`,
        );
        continue;
      }
      try {
        await db
          .update(teamCards)
          .set({
            latest_activity_date: upd.latest_activity_date,
            latest_activity_text: upd.latest_activity_text,
            latest_activity_source: 'context_upload',
            updated_at: new Date(),
          })
          .where(eq(teamCards.id, card.id));
        counts.teamCardUpdates++;
        console.log(
          `[ctx-applier] project=${projectId} table=team_cards action=update source=context_upload team="${upd.team_name}"`,
        );
      } catch (err) {
        console.error(
          `[ctx-applier] team_cards update failed for team="${upd.team_name}": ${err instanceof Error ? err.message : err}`,
        );
      }
    }
  }

  // ── 3. Team Card Key Metrics current value (ownership chain: metric → team_card → project) ──
  if (Array.isArray(parsed.teamCardKeyMetricsCurrent)) {
    for (const upd of parsed.teamCardKeyMetricsCurrent) {
      if (!upd || !upd.metric_id || !upd.current) continue;
      const [metric] = await db
        .select()
        .from(teamCardKeyMetrics)
        .where(eq(teamCardKeyMetrics.id, upd.metric_id));
      if (!metric) {
        console.log(`[ctx-applier] key_metric id=${upd.metric_id} not found; skipping`);
        continue;
      }
      // Ownership chain: verify metric belongs to this project
      const [parentCard] = await db
        .select()
        .from(teamCards)
        .where(eq(teamCards.id, metric.team_card_id));
      if (!parentCard || parentCard.project_id !== projectId) {
        console.log(
          `[ctx-applier] key_metric ${upd.metric_id} not in project ${projectId} (belongs to project ${parentCard?.project_id ?? 'unknown'}); skipping`,
        );
        continue;
      }
      try {
        await db
          .update(teamCardKeyMetrics)
          .set({
            current: upd.current,
            source: 'context_upload',
            source_artifact_id: artifactId ?? metric.source_artifact_id,
            updated_at: new Date(),
          })
          .where(eq(teamCardKeyMetrics.id, upd.metric_id));
        counts.keyMetricUpdates++;
        console.log(
          `[ctx-applier] project=${projectId} table=team_card_key_metrics action=update source=context_upload metric_id=${upd.metric_id}`,
        );
      } catch (err) {
        console.error(
          `[ctx-applier] key_metrics update failed for metric_id=${upd.metric_id}: ${err instanceof Error ? err.message : err}`,
        );
      }
    }
  }

  // ── 4. Milestone target date updates (scoped to project) ─────────────────────
  if (Array.isArray(parsed.milestoneTargetDateUpdates)) {
    for (const upd of parsed.milestoneTargetDateUpdates) {
      if (!upd || !upd.milestone_id || !upd.date) continue;
      const [milestone] = await db
        .select()
        .from(milestones)
        .where(eq(milestones.id, upd.milestone_id));
      if (!milestone || milestone.project_id !== projectId) {
        console.log(
          `[ctx-applier] milestone id=${upd.milestone_id} not in project ${projectId}; skipping`,
        );
        continue;
      }
      try {
        await db
          .update(milestones)
          .set({ date: upd.date })
          .where(eq(milestones.id, upd.milestone_id));
        counts.milestoneDateUpdates++;
        console.log(
          `[ctx-applier] project=${projectId} table=milestones action=update_date milestone_id=${upd.milestone_id} date=${upd.date}`,
        );
      } catch (err) {
        console.error(
          `[ctx-applier] milestones date update failed for milestone_id=${upd.milestone_id}: ${err instanceof Error ? err.message : err}`,
        );
      }
    }
  }

  return counts;
}

/**
 * Safely parse a string as JSON, stripping optional code-fence wrappers (```json ... ```).
 * Returns {} on any parse error — applier handles all missing keys gracefully.
 */
function safeParse(s: string): ContextUpdaterResult {
  if (!s || typeof s !== 'string') return {};
  try {
    // Strip code-fence wrappers if Claude returned ```json ... ``` or ``` ... ```
    const stripped = s.replace(/^```(?:json)?\s*/m, '').replace(/```\s*$/m, '').trim();
    const obj = JSON.parse(stripped);
    return obj && typeof obj === 'object' ? (obj as ContextUpdaterResult) : {};
  } catch {
    return {};
  }
}

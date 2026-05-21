// lib/context-updater-applier.ts
// Helper that applies the context-updater skill's JSON output to the four new Phase 88.1 DB write paths.
// Called by worker/jobs/context-updater.ts after orchestrator.run completes.
//
// Plan 12 refactor: exposes 4 per-entity write fns callable piecewise from approve/route.ts.
// The applyContextUpdaterResult bulk entrypoint (Plan 04 BullMQ path) is preserved and delegates
// to the per-entity fns.
//
// Idempotency: DB-level partial UNIQUE INDEX evidence_log_idem_idx prevents duplicate context_upload entries.
// Applier catches Postgres error code 23505 (duplicate key violation) and swallows it — a second run on
// the same input silently skips already-inserted Evidence Log rows.
//
// Ownership enforcement: team_card.project_id must equal projectId before any key-metric update;
// milestone.project_id must equal projectId before any date update.
//
// All auto-generated writes set source: 'context_upload' — SourceBadge differentiates manual vs auto entries.

import { eq, and, ilike } from 'drizzle-orm';
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

// ─── Per-entity write fns (Plan 12 — callable piecewise from approve route) ───

/**
 * Append an Evidence Log entry for a business outcome.
 * 23505 idempotency guard: on duplicate key violation (evidence_log_idem_idx), silently skips.
 */
export async function applyEvidenceLogEntry(
  projectId: number,
  fields: { business_outcome_id: number; date: string; text: string },
  artifactId?: number,
): Promise<{ inserted: boolean; reason?: string }> {
  try {
    await db.insert(evidenceLog).values({
      business_outcome_id: fields.business_outcome_id,
      date: fields.date,
      source: 'context_upload',
      source_artifact_id: artifactId ?? null,
      text: fields.text,
      ingested_at: new Date(),
    });
    console.log(
      `[ctx-applier] project=${projectId} table=evidence_log action=insert source=context_upload outcome_id=${fields.business_outcome_id}`,
    );
    return { inserted: true };
  } catch (err) {
    // Postgres 23505 = duplicate key value violates unique constraint (evidence_log_idem_idx)
    const code = (err as { code?: string }).code;
    if (code === '23505') {
      console.log(
        `[ctx-applier] evidence_log duplicate skipped (23505) — outcome_id=${fields.business_outcome_id} text="${fields.text.slice(0, 60)}"`,
      );
      return { inserted: false, reason: 'duplicate' };
    }
    console.error(
      `[ctx-applier] evidence_log insert failed (code=${code ?? 'unknown'}): ${err instanceof Error ? err.message : err}`,
    );
    return { inserted: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Overwrite latest_activity_text for a team card identified by team_name within the project.
 * Ownership chain: card must belong to projectId.
 */
export async function applyTeamCardActivity(
  projectId: number,
  fields: { team_name: string; latest_activity: string; latest_activity_at?: string },
  artifactId?: number,
): Promise<{ updated: boolean; team_card_id?: number; reason?: string }> {
  const [card] = await db
    .select()
    .from(teamCards)
    .where(and(eq(teamCards.project_id, projectId), eq(teamCards.team_name, fields.team_name)));
  if (!card) {
    // Try case-insensitive fallback
    const [cardFuzzy] = await db
      .select()
      .from(teamCards)
      .where(and(eq(teamCards.project_id, projectId), ilike(teamCards.team_name, fields.team_name)));
    if (!cardFuzzy) {
      console.log(
        `[ctx-applier] team_card not found for team_name="${fields.team_name}" project=${projectId}; skipping`,
      );
      return { updated: false, reason: `team_card not found: ${fields.team_name}` };
    }
    // use fuzzy match
    try {
      await db
        .update(teamCards)
        .set({
          latest_activity_date: fields.latest_activity_at ?? null,
          latest_activity_text: fields.latest_activity,
          latest_activity_source: 'context_upload',
          updated_at: new Date(),
        })
        .where(eq(teamCards.id, cardFuzzy.id));
      console.log(
        `[ctx-applier] project=${projectId} table=team_cards action=update source=context_upload team="${fields.team_name}"`,
      );
      return { updated: true, team_card_id: cardFuzzy.id };
    } catch (err) {
      console.error(
        `[ctx-applier] team_cards update failed for team="${fields.team_name}": ${err instanceof Error ? err.message : err}`,
      );
      return { updated: false, reason: err instanceof Error ? err.message : String(err) };
    }
  }
  try {
    await db
      .update(teamCards)
      .set({
        latest_activity_date: fields.latest_activity_at ?? null,
        latest_activity_text: fields.latest_activity,
        latest_activity_source: 'context_upload',
        updated_at: new Date(),
      })
      .where(eq(teamCards.id, card.id));
    console.log(
      `[ctx-applier] project=${projectId} table=team_cards action=update source=context_upload team="${fields.team_name}"`,
    );
    return { updated: true, team_card_id: card.id };
  } catch (err) {
    console.error(
      `[ctx-applier] team_cards update failed for team="${fields.team_name}": ${err instanceof Error ? err.message : err}`,
    );
    return { updated: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Update the current value of a key metric for a team card.
 * Lookup: by metric_id (direct), or by team_card_id + label (fuzzy match).
 * Ownership chain: metric's team_card must belong to projectId.
 */
export async function applyTeamMetricCurrent(
  projectId: number,
  fields: { metric_id?: number; team_card_id?: number; label?: string; current: string },
  artifactId?: number,
): Promise<{ updated: boolean; metric_id?: number; reason?: string }> {
  let metricId: number | undefined = fields.metric_id;

  if (!metricId && fields.team_card_id && fields.label) {
    // Lookup by team_card_id + label (case-insensitive)
    const [found] = await db
      .select()
      .from(teamCardKeyMetrics)
      .where(and(
        eq(teamCardKeyMetrics.team_card_id, fields.team_card_id),
        ilike(teamCardKeyMetrics.label, fields.label),
      ));
    if (!found) {
      console.log(
        `[ctx-applier] key_metric not found for team_card_id=${fields.team_card_id} label="${fields.label}"; skipping`,
      );
      return { updated: false, reason: `metric not found: ${fields.label}` };
    }
    metricId = found.id;
  }

  if (!metricId) {
    return { updated: false, reason: 'metric_id not resolved — provide metric_id or team_card_id+label' };
  }

  const [metric] = await db
    .select()
    .from(teamCardKeyMetrics)
    .where(eq(teamCardKeyMetrics.id, metricId));
  if (!metric) {
    console.log(`[ctx-applier] key_metric id=${metricId} not found; skipping`);
    return { updated: false, reason: `metric id=${metricId} not found` };
  }

  // Ownership chain: verify metric belongs to this project
  const [parentCard] = await db
    .select()
    .from(teamCards)
    .where(eq(teamCards.id, metric.team_card_id));
  if (!parentCard || parentCard.project_id !== projectId) {
    console.log(
      `[ctx-applier] key_metric ${metricId} not in project ${projectId} (belongs to project ${parentCard?.project_id ?? 'unknown'}); skipping`,
    );
    return { updated: false, reason: `metric ${metricId} not in project ${projectId}` };
  }

  try {
    await db
      .update(teamCardKeyMetrics)
      .set({
        current: fields.current,
        source: 'context_upload',
        source_artifact_id: artifactId ?? metric.source_artifact_id,
        updated_at: new Date(),
      })
      .where(eq(teamCardKeyMetrics.id, metricId));
    console.log(
      `[ctx-applier] project=${projectId} table=team_card_key_metrics action=update source=context_upload metric_id=${metricId}`,
    );
    return { updated: true, metric_id: metricId };
  } catch (err) {
    console.error(
      `[ctx-applier] key_metrics update failed for metric_id=${metricId}: ${err instanceof Error ? err.message : err}`,
    );
    return { updated: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Update the target date of an existing milestone.
 * Lookup: by milestone_id (direct), or by name within project.
 * Ownership chain: milestone must belong to projectId.
 */
export async function applyMilestoneDate(
  projectId: number,
  fields: { milestone_id?: number; name?: string; target_date: string },
  artifactId?: number,
): Promise<{ updated: boolean; milestone_id?: number; reason?: string }> {
  let milestoneId: number | undefined = fields.milestone_id;

  if (!milestoneId && fields.name) {
    // Lookup by name (fuzzy match within project)
    const [found] = await db
      .select()
      .from(milestones)
      .where(and(
        eq(milestones.project_id, projectId),
        ilike(milestones.name, `%${fields.name}%`),
      ));
    if (!found) {
      console.log(
        `[ctx-applier] milestone not found for name="${fields.name}" project=${projectId}; skipping`,
      );
      return { updated: false, reason: `milestone not found: ${fields.name}` };
    }
    milestoneId = found.id;
  }

  if (!milestoneId) {
    return { updated: false, reason: 'milestone_id not resolved — provide milestone_id or name' };
  }

  const [milestone] = await db
    .select()
    .from(milestones)
    .where(eq(milestones.id, milestoneId));
  if (!milestone || milestone.project_id !== projectId) {
    console.log(
      `[ctx-applier] milestone id=${milestoneId} not in project ${projectId}; skipping`,
    );
    return { updated: false, reason: `milestone ${milestoneId} not in project ${projectId}` };
  }

  try {
    await db
      .update(milestones)
      .set({ date: fields.target_date, target: fields.target_date })
      .where(eq(milestones.id, milestoneId));
    console.log(
      `[ctx-applier] project=${projectId} table=milestones action=update_date milestone_id=${milestoneId} date=${fields.target_date}`,
    );
    return { updated: true, milestone_id: milestoneId };
  } catch (err) {
    console.error(
      `[ctx-applier] milestones date update failed for milestone_id=${milestoneId}: ${err instanceof Error ? err.message : err}`,
    );
    return { updated: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

// ─── Bulk entrypoint (Plan 04 BullMQ path — preserved) ────────────────────────

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
  if (Array.isArray(parsed.evidenceLog)) {
    for (const entry of parsed.evidenceLog) {
      if (!entry || !entry.business_outcome_id || !entry.text || !entry.date) continue;
      const r = await applyEvidenceLogEntry(projectId, {
        business_outcome_id: entry.business_outcome_id,
        date: entry.date,
        text: entry.text,
      }, artifactId);
      if (r.inserted) counts.evidenceLogInserts++;
    }
  }

  // ── 2. Team Card Latest Activity (overwrite, scoped by team_name within project) ──
  if (Array.isArray(parsed.teamCardLatestActivity)) {
    for (const upd of parsed.teamCardLatestActivity) {
      if (!upd || !upd.team_name || !upd.latest_activity_text) continue;
      const r = await applyTeamCardActivity(projectId, {
        team_name: upd.team_name,
        latest_activity: upd.latest_activity_text,
        latest_activity_at: upd.latest_activity_date ?? undefined,
      }, artifactId);
      if (r.updated) counts.teamCardUpdates++;
    }
  }

  // ── 3. Team Card Key Metrics current value (ownership chain: metric → team_card → project) ──
  if (Array.isArray(parsed.teamCardKeyMetricsCurrent)) {
    for (const upd of parsed.teamCardKeyMetricsCurrent) {
      if (!upd || !upd.metric_id || !upd.current) continue;
      const r = await applyTeamMetricCurrent(projectId, {
        metric_id: upd.metric_id,
        current: upd.current,
      }, artifactId);
      if (r.updated) counts.keyMetricUpdates++;
    }
  }

  // ── 4. Milestone target date updates (scoped to project) ─────────────────────
  if (Array.isArray(parsed.milestoneTargetDateUpdates)) {
    for (const upd of parsed.milestoneTargetDateUpdates) {
      if (!upd || !upd.milestone_id || !upd.date) continue;
      const r = await applyMilestoneDate(projectId, {
        milestone_id: upd.milestone_id,
        target_date: upd.date,
      }, artifactId);
      if (r.updated) counts.milestoneDateUpdates++;
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

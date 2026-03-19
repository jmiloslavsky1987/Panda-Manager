/**
 * data-service.ts — DataService for BigPanda Project Assistant
 *
 * Provides:
 *   - createOutputRecord()   — inserts output row with status='running', enforces idempotency
 *   - updateOutputStatus()   — updates output row to complete/failed with data payload
 *   - getProjectForExport()  — fetches a project with all 9 REQUIRED sections for YAML export
 *
 * Idempotency pattern:
 *   The outputs.idempotency_key column has a UNIQUE constraint in the DB.
 *   Duplicate inserts throw a postgres unique constraint violation. Callers must
 *   catch this to detect SSE reconnect vs. fresh skill run.
 *
 * RLS scoping:
 *   Per-project queries use `SET LOCAL app.current_project_id` within a transaction
 *   to scope RLS policies without requiring the caller to manage session variables.
 *
 * Note: 'server-only' import is intentionally omitted here to allow
 * the same module to be imported in tests (Node.js test runner context).
 * The bigpanda-app/lib/ version with server-only import is for Phase 2+ Next.js routes.
 */

import { db } from '../db/index';
import {
  outputs,
  projects,
  workstreams,
  actions,
  risks,
  milestones,
  artifacts,
  engagementHistory,
  keyDecisions,
  stakeholders,
} from '../db/schema';
import { eq, sql } from 'drizzle-orm';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface OutputRecord {
  id: number;
  project_id: number | null;
  skill_name: string;
  idempotency_key: string;
  status: 'running' | 'complete' | 'failed';
  content: string | null;
  filename: string | null;
  filepath: string | null;
  created_at: Date;
  completed_at: Date | null;
}

export interface ProjectExportData {
  customer: string;
  project: {
    name: string;
    go_live_target: string | null;
    overall_status: string | null;
    status_summary: string | null;
    last_updated: string | null;
    source_file: string | null;
  };
  status: string | null;       // maps from projects.overall_status
  workstreams: unknown[];
  actions: unknown[];
  risks: unknown[];
  milestones: unknown[];
  artifacts: unknown[];
  history: unknown[];          // maps from engagement_history rows
  key_decisions: unknown[];
  stakeholders: unknown[];
}

// ─── createOutputRecord ──────────────────────────────────────────────────────

/**
 * Insert a new output record with status='running'.
 *
 * Throws a database unique constraint violation if idempotency_key already exists.
 * Callers should catch this error to detect duplicate skill runs on SSE reconnect.
 *
 * @param params  skill_name, idempotency_key (required), project_id (optional)
 * @returns The inserted output row
 */
export async function createOutputRecord(params: {
  skill_name: string;
  idempotency_key: string;
  project_id?: number;
}): Promise<OutputRecord> {
  const [record] = await db
    .insert(outputs)
    .values({
      skill_name: params.skill_name,
      idempotency_key: params.idempotency_key,
      project_id: params.project_id ?? null,
      status: 'running',
    })
    .returning();

  return record as OutputRecord;
}

// ─── updateOutputStatus ──────────────────────────────────────────────────────

/**
 * Update an output row to complete or failed, setting completed_at to now.
 * Optionally stores the output content, filename, and filepath.
 *
 * @param idempotency_key  Unique key of the output to update
 * @param status           'complete' or 'failed'
 * @param data             Optional payload fields (content, filename, filepath)
 */
export async function updateOutputStatus(
  idempotency_key: string,
  status: 'complete' | 'failed',
  data?: {
    content?: string;
    filename?: string;
    filepath?: string;
  }
): Promise<void> {
  await db
    .update(outputs)
    .set({
      status,
      completed_at: new Date(),
      ...(data ?? {}),
    })
    .where(eq(outputs.idempotency_key, idempotency_key));
}

// ─── getProjectForExport ─────────────────────────────────────────────────────

/**
 * Fetch a project and all related section rows for YAML export.
 *
 * Sets `app.current_project_id` session variable within a transaction to scope
 * the RLS policies for all per-project table queries.
 *
 * Key mappings:
 *   'status'  ← projects.overall_status   (YAML key differs from DB field name)
 *   'history' ← engagement_history rows   (YAML key differs from DB table name)
 *
 * @param projectId  Internal DB project id
 * @returns ProjectExportData or null if project not found
 */
export async function getProjectForExport(projectId: number): Promise<ProjectExportData | null> {
  return await db.transaction(async (tx) => {
    // Scope RLS to this project for the duration of the transaction
    await tx.execute(sql`SET LOCAL app.current_project_id = ${projectId}`);

    // Fetch the project row
    const [project] = await tx
      .select()
      .from(projects)
      .where(eq(projects.id, projectId));

    if (!project) {
      return null;
    }

    // Fetch all related section rows in parallel
    const [
      workstreamRows,
      actionRows,
      riskRows,
      milestoneRows,
      artifactRows,
      historyRows,
      keyDecisionRows,
      stakeholderRows,
    ] = await Promise.all([
      tx.select().from(workstreams).where(eq(workstreams.project_id, projectId)),
      tx.select().from(actions).where(eq(actions.project_id, projectId)),
      tx.select().from(risks).where(eq(risks.project_id, projectId)),
      tx.select().from(milestones).where(eq(milestones.project_id, projectId)),
      tx.select().from(artifacts).where(eq(artifacts.project_id, projectId)),
      tx.select().from(engagementHistory).where(eq(engagementHistory.project_id, projectId)),
      tx.select().from(keyDecisions).where(eq(keyDecisions.project_id, projectId)),
      tx.select().from(stakeholders).where(eq(stakeholders.project_id, projectId)),
    ]);

    return {
      customer: project.customer,
      project: {
        name: project.name,
        go_live_target: project.go_live_target ?? null,
        overall_status: project.overall_status ?? null,
        status_summary: project.status_summary ?? null,
        last_updated: project.last_updated ?? null,
        source_file: project.source_file ?? null,
      },
      status: project.overall_status ?? null,   // maps overall_status → status (YAML key)
      workstreams: workstreamRows,
      actions: actionRows,
      risks: riskRows,
      milestones: milestoneRows,
      artifacts: artifactRows,
      history: historyRows,                      // maps engagement_history → history (YAML key)
      key_decisions: keyDecisionRows,
      stakeholders: stakeholderRows,
    };
  });
}

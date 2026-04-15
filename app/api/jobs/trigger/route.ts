/**
 * /api/jobs/trigger — Manual Job Trigger
 *
 * POST /api/jobs/trigger
 *   Accepts { jobId, skillName, params? } (new DB-driven) OR { jobName } (legacy).
 *   Validates skillName against SKILL_LIST, then enqueues on the BullMQ queue.
 *
 *   When jobId is provided, looks up skill_params_json from scheduled_jobs and
 *   merges it into job.data so handlers receive projectId and run for the correct
 *   project rather than all active projects.
 */

import { NextResponse } from 'next/server';
import { Queue } from 'bullmq';
import { eq } from 'drizzle-orm';
import { createApiRedisConnection } from '../../../../worker/connection';
import { SKILL_LIST, type SkillDef } from '../../../../lib/scheduler-skills';
import { requireSession } from "@/lib/auth-server";
import { resolveRole } from "@/lib/auth-utils";
import { db } from '@/db';
import { scheduledJobs } from '@/db/schema';

const SKILL_IDS = SKILL_LIST.map((s: SkillDef) => s.id);

export async function POST(request: Request) {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;

  if (resolveRole(session!) !== 'admin') {
    return NextResponse.json({ error: 'Forbidden: Admin role required' }, { status: 403 });
  }

  try {
    const body = await request.json() as {
      jobId?: number;
      skillName?: string;
      params?: Record<string, unknown>;
      // legacy
      jobName?: string;
    };

    // ── New DB-driven path ────────────────────────────────────────────────────
    if (body.skillName !== undefined || body.jobId !== undefined) {
      const { jobId, skillName, params } = body;

      if (!skillName) {
        return NextResponse.json({ error: 'skillName is required' }, { status: 400 });
      }

      // Validate skillName against known SKILL_LIST
      if (!SKILL_IDS.includes(skillName)) {
        return NextResponse.json(
          { error: `Unknown skillName: ${skillName}. Must be one of: ${SKILL_IDS.join(', ')}` },
          { status: 400 },
        );
      }

      // If a scheduled job ID was provided, pull skill_params_json from the DB so
      // the handler knows which project to run for (handlers check job.data.projectId).
      let scheduledJobParams: Record<string, unknown> = {};
      if (jobId) {
        try {
          const [row] = await db
            .select({ skill_params_json: scheduledJobs.skill_params_json, project_id: scheduledJobs.project_id })
            .from(scheduledJobs)
            .where(eq(scheduledJobs.id, jobId));
          if (row) {
            scheduledJobParams = {
              ...(row.skill_params_json as Record<string, unknown> ?? {}),
              // Ensure project_id from the scheduled job row is always available
              ...(row.project_id != null ? { projectId: row.project_id } : {}),
            };
          }
        } catch { /* non-fatal — proceed without extra params */ }
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const queue = new Queue('scheduled-jobs', { connection: createApiRedisConnection() as any });
      await queue.add(
        skillName,
        { triggeredBy: 'manual', jobId: jobId ?? null, params: params ?? {}, ...scheduledJobParams },
        { jobId: `manual-${skillName}-${Date.now()}` },
      );
      // close() may not be present in all environments (e.g. test mocks)
      await queue.close?.();

      return NextResponse.json({ ok: true, queued: true, skillName, jobId });
    }

    // ── Legacy path: { jobName } ──────────────────────────────────────────────
    const { jobName } = body;

    if (!jobName) {
      return NextResponse.json({ error: 'jobName is required' }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const queue = new Queue('scheduled-jobs', { connection: createApiRedisConnection() as any });
    await queue.add(
      jobName,
      { triggeredBy: 'manual' },
      { jobId: `manual-${jobName}-${Date.now()}` },
    );
    await queue.close?.();

    return NextResponse.json({ ok: true, jobName });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

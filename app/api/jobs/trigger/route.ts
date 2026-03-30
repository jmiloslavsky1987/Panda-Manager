/**
 * /api/jobs/trigger — Manual Job Trigger
 *
 * POST /api/jobs/trigger
 *   Accepts { jobId, skillName, params? } (new DB-driven) OR { jobName } (legacy).
 *   Validates skillName against SKILL_LIST, then enqueues on the BullMQ queue.
 */

import { NextResponse } from 'next/server';
import { Queue } from 'bullmq';
import { createApiRedisConnection } from '../../../../worker/connection';
import { SKILL_LIST, type SkillDef } from '../../../../lib/scheduler-skills';

const SKILL_IDS = SKILL_LIST.map((s: SkillDef) => s.id);

export async function POST(request: Request) {
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

      const queue = new Queue('scheduled-jobs', { connection: createApiRedisConnection() });
      await queue.add(
        skillName,
        { triggeredBy: 'manual', jobId: jobId ?? null, params: params ?? {} },
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

    const queue = new Queue('scheduled-jobs', { connection: createApiRedisConnection() });
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

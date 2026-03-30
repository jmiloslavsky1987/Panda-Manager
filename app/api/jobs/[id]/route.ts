/**
 * /api/jobs/[id] — Scheduled Job Update + Delete
 *
 * PATCH  /api/jobs/[id] — update job fields (name, cron, timezone, params, enabled)
 * DELETE /api/jobs/[id] — remove job and deregister from BullMQ
 */

import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../../../../db';
import { scheduledJobs } from '../../../../db/schema';
import { frequencyToCron, type Frequency } from '../../../../lib/scheduler-utils';

// ─── Validation Schema ────────────────────────────────────────────────────────

const PatchJobSchema = z.object({
  name:              z.string().min(1).optional(),
  cron_expression:   z.string().optional(),
  frequency:         z.enum(['once', 'daily', 'weekly', 'biweekly', 'monthly', 'custom']).optional(),
  hour:              z.number().int().min(0).max(23).optional(),
  minute:            z.number().int().min(0).max(59).optional(),
  dayOfWeek:         z.number().int().min(0).max(6).optional(),
  dayOfMonth:        z.number().int().min(1).max(31).optional(),
  cron:              z.string().optional(),
  timezone:          z.string().optional().nullable(),
  skill_params_json: z.record(z.string(), z.unknown()).optional(),
  enabled:           z.boolean().optional(),
});

// ─── PATCH /api/jobs/[id] ─────────────────────────────────────────────────────

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> | { id: string } },
): Promise<Response> {
  try {
    const { id } = await context.params;
    const jobId = parseInt(id, 10);
    if (isNaN(jobId)) {
      return NextResponse.json({ error: 'Invalid job ID' }, { status: 400 });
    }

    const body: unknown = await request.json();
    const parsed = PatchJobSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const {
      name,
      cron_expression,
      frequency,
      hour,
      minute,
      dayOfWeek,
      dayOfMonth,
      cron,
      timezone,
      skill_params_json,
      enabled,
    } = parsed.data;

    // Derive cron from frequency if needed
    let newCron = cron_expression;
    if (!newCron && frequency) {
      newCron = frequencyToCron(frequency as Frequency, {
        hour, minute, dayOfWeek, dayOfMonth, cron,
      }) ?? undefined;
    }

    // Build update payload (only include defined fields)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, any> = { updated_at: new Date() };
    if (name !== undefined)              updateData.name = name;
    if (newCron !== undefined)           updateData.cron_expression = newCron;
    if (timezone !== undefined)          updateData.timezone = timezone;
    if (skill_params_json !== undefined) updateData.skill_params_json = skill_params_json;
    if (enabled !== undefined)           updateData.enabled = enabled;

    const [updated] = await db
      .update(scheduledJobs)
      .set(updateData)
      .where(eq(scheduledJobs.id, jobId))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Sync with BullMQ scheduler (best-effort)
    try {
      const { Queue } = await import('bullmq');
      const { createApiRedisConnection } = await import('../../../../worker/connection');
      const queue = new Queue('scheduled-jobs', { connection: createApiRedisConnection() });

      if (enabled === false) {
        // Disable — remove the scheduler
        await queue.removeJobScheduler(`db-job-${jobId}`);
      } else if (newCron && updated.enabled) {
        // Cron changed or re-enabled — upsert scheduler
        await queue.upsertJobScheduler(
          `db-job-${jobId}`,
          { pattern: newCron, ...(updated.timezone ? { tz: updated.timezone } : {}) },
          {
            name: updated.skill_name,
            data: { triggeredBy: 'scheduled', jobId },
            opts: { removeOnComplete: 100, removeOnFail: 50 },
          },
        );
      }
      await queue.close();
    } catch (queueErr) {
      console.error('[api/jobs/[id]] BullMQ sync failed (non-fatal):', queueErr);
    }

    return NextResponse.json({ job: updated }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── DELETE /api/jobs/[id] ────────────────────────────────────────────────────

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> | { id: string } },
): Promise<Response> {
  try {
    const { id } = await context.params;
    const jobId = parseInt(id, 10);
    if (isNaN(jobId)) {
      return NextResponse.json({ error: 'Invalid job ID' }, { status: 400 });
    }

    await db.delete(scheduledJobs).where(eq(scheduledJobs.id, jobId));

    // Remove BullMQ scheduler (best-effort)
    try {
      const { Queue } = await import('bullmq');
      const { createApiRedisConnection } = await import('../../../../worker/connection');
      const queue = new Queue('scheduled-jobs', { connection: createApiRedisConnection() });
      await queue.removeJobScheduler(`db-job-${jobId}`);
      await queue.close();
    } catch (queueErr) {
      console.error('[api/jobs/[id]] BullMQ remove failed (non-fatal):', queueErr);
    }

    return new Response(null, { status: 204 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * /api/jobs — Scheduled Jobs CRUD
 *
 * GET  /api/jobs  — list all scheduled jobs (enabled first)
 * POST /api/jobs  — create a new scheduled job
 */

import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { desc, asc, sql } from 'drizzle-orm';
import { db } from '../../../db';
import { scheduledJobs } from '../../../db/schema';
import { SKILL_LIST, type SkillDef } from '../../../lib/scheduler-skills';
import { frequencyToCron, type Frequency } from '../../../lib/scheduler-utils';

// ─── Validation Schema ────────────────────────────────────────────────────────

const SKILL_IDS = SKILL_LIST.map((s: SkillDef) => s.id);

const CreateJobSchema = z.object({
  name:             z.string().min(1, 'name is required'),
  skill_name:       z.string().refine((v) => SKILL_IDS.includes(v), {
                      message: `skill_name must be one of: ${SKILL_IDS.join(', ')}`,
                    }),
  // Frequency-based scheduling (converted to cron_expression server-side)
  frequency:        z.enum(['once', 'daily', 'weekly', 'biweekly', 'monthly', 'custom']).optional(),
  hour:             z.number().int().min(0).max(23).optional(),
  minute:           z.number().int().min(0).max(59).optional(),
  dayOfWeek:        z.number().int().min(0).max(6).optional(),
  dayOfMonth:       z.number().int().min(1).max(31).optional(),
  cron:             z.string().optional(),
  // Direct cron_expression (takes precedence over frequency fields)
  cron_expression:  z.string().optional(),
  timezone:         z.string().optional(),
  skill_params:     z.record(z.string(), z.unknown()).optional(),
  skill_params_json: z.record(z.string(), z.unknown()).optional(),
  enabled:          z.boolean().optional(),
});

// ─── GET /api/jobs ────────────────────────────────────────────────────────────

export async function GET(_request: Request): Promise<Response> {
  try {
    const jobs = await db
      .select()
      .from(scheduledJobs)
      .orderBy(
        // enabled first (true > false), then by id
        sql`${scheduledJobs.enabled} DESC`,
        asc(scheduledJobs.id),
      );

    // Add next_run as null (cron-parser not available; UI shows "—" for null)
    const jobsWithNextRun = jobs.map((job) => ({
      ...job,
      next_run: null,
    }));

    return NextResponse.json({ jobs: jobsWithNextRun }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── POST /api/jobs ───────────────────────────────────────────────────────────

export async function POST(request: Request): Promise<Response> {
  try {
    const body: unknown = await request.json();
    const parsed = CreateJobSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const {
      name,
      skill_name,
      frequency,
      hour,
      minute,
      dayOfWeek,
      dayOfMonth,
      cron,
      cron_expression,
      timezone,
      skill_params,
      skill_params_json,
      enabled = true,
    } = parsed.data;

    // Derive cron_expression from frequency if not provided directly
    let cronExpr = cron_expression ?? null;
    if (!cronExpr && frequency) {
      cronExpr = frequencyToCron(frequency as Frequency, {
        hour,
        minute,
        dayOfWeek,
        dayOfMonth,
        cron,
      });
    }

    // skill_params takes precedence over skill_params_json
    const paramsJson = skill_params ?? skill_params_json ?? {};

    const [created] = await db
      .insert(scheduledJobs)
      .values({
        name,
        skill_name,
        cron_expression: cronExpr ?? '',
        timezone: timezone ?? null,
        skill_params_json: paramsJson,
        enabled,
      })
      .returning();

    // Register in BullMQ scheduler (best-effort — don't fail request if Redis is down)
    if (created && cronExpr && enabled) {
      try {
        const { Queue } = await import('bullmq');
        const { createApiRedisConnection } = await import('../../../worker/connection');
        const queue = new Queue('scheduled-jobs', { connection: createApiRedisConnection() });
        await queue.upsertJobScheduler(
          `db-job-${created.id}`,
          { pattern: cronExpr, ...(timezone ? { tz: timezone } : {}) },
          {
            name: skill_name,
            data: { triggeredBy: 'scheduled', jobId: created.id },
            opts: { removeOnComplete: 100, removeOnFail: 50 },
          },
        );
        await queue.close();
      } catch (queueErr) {
        console.error('[api/jobs] BullMQ upsert failed (non-fatal):', queueErr);
      }
    }

    return NextResponse.json({ job: created }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

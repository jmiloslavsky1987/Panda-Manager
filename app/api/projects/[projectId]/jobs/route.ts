/**
 * /api/projects/[projectId]/jobs — Project-scoped scheduled jobs
 *
 * GET  /api/projects/[projectId]/jobs  — list scheduled jobs for this project (admin-only)
 * POST /api/projects/[projectId]/jobs  — create a new scheduled job scoped to this project (admin-only)
 */

import 'server-only';
import { NextResponse } from 'next/server';
import { asc, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { scheduledJobs } from '@/db/schema';
import { requireProjectRole } from '@/lib/auth-server';
import { CreateJobSchema } from '@/app/api/jobs/route';
import { frequencyToCron, type Frequency } from '@/lib/scheduler-utils';

// ─── GET /api/projects/[projectId]/jobs ──────────────────────────────────────

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ projectId: string }> }
): Promise<Response> {
  const { projectId } = await params;
  const numericId = parseInt(projectId, 10);

  if (isNaN(numericId)) {
    return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
  }

  // Admin role required to view/manage project scheduled jobs
  const { session, redirectResponse } = await requireProjectRole(numericId, 'admin');
  if (redirectResponse) return redirectResponse;

  try {
    const jobs = await db
      .select()
      .from(scheduledJobs)
      .where(eq(scheduledJobs.project_id, numericId))
      .orderBy(
        // enabled first (true > false), then by id
        sql`${scheduledJobs.enabled} DESC`,
        asc(scheduledJobs.id)
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

// ─── POST /api/projects/[projectId]/jobs ─────────────────────────────────────

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
): Promise<Response> {
  const { projectId } = await params;
  const numericId = parseInt(projectId, 10);

  if (isNaN(numericId)) {
    return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
  }

  // Admin role required to create project scheduled jobs
  const { session, redirectResponse } = await requireProjectRole(numericId, 'admin');
  if (redirectResponse) return redirectResponse;

  try {
    const body: unknown = await request.json();
    const parsed = CreateJobSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
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
      // project_id from body is ignored — always use route param for security
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

    // Auto-inject projectId into skill_params_json so BullMQ worker knows which project to operate on
    const paramsJson = { ...(skill_params ?? skill_params_json ?? {}), projectId: numericId };

    // Force project_id to route param (security: caller cannot set a different project_id)
    const [created] = await db
      .insert(scheduledJobs)
      .values({
        name,
        skill_name,
        cron_expression: cronExpr ?? '',
        timezone: timezone ?? null,
        skill_params_json: paramsJson,
        enabled,
        project_id: numericId,
      })
      .returning();

    // Register in BullMQ scheduler (best-effort — don't fail request if Redis is down)
    if (created && cronExpr && enabled) {
      try {
        const { Queue } = await import('bullmq');
        const { createApiRedisConnection } = await import('@/worker/connection');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const queue = new Queue('scheduled-jobs', { connection: createApiRedisConnection() as any });
        await queue.upsertJobScheduler(
          `db-job-${created.id}`,
          { pattern: cronExpr, ...(timezone ? { tz: timezone } : {}) },
          {
            name: skill_name,
            data: { triggeredBy: 'scheduled', jobId: created.id },
            opts: { removeOnComplete: 100, removeOnFail: 50 },
          }
        );
        await queue.close();
      } catch (queueErr) {
        console.error('[api/projects/[projectId]/jobs] BullMQ upsert failed (non-fatal):', queueErr);
      }
    }

    return NextResponse.json({ job: created }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// bigpanda-app/worker/jobs/action-sync.ts
import type { Job } from 'bullmq';
import { sql } from 'drizzle-orm';
import db from '../../db';
import { jobRuns } from '../../db/schema';
import { LOCK_IDS } from '../lock-ids';

export default async function actionSyncJob(job: Job): Promise<{ status: string }> {
  // 1. Acquire transaction-scoped advisory lock (auto-releases at transaction end)
  const [row] = await db.execute(
    sql`SELECT pg_try_advisory_xact_lock(${LOCK_IDS.ACTION_SYNC}) AS acquired`
  );
  const acquired = (row as Record<string, unknown>).acquired === true;

  if (!acquired) {
    console.log(`[action-sync] skipped: advisory lock ${LOCK_IDS.ACTION_SYNC} held`);
    await db.insert(jobRuns).values({
      job_name: 'action-sync',
      status: 'skipped',
      triggered_by: (job.data?.triggeredBy as string) ?? 'scheduled',
      completed_at: new Date(),
    });
    return { status: 'skipped' };
  }

  // 2. Record job start
  const [runRecord] = await db.insert(jobRuns).values({
    job_name: 'action-sync',
    status: 'running',
    triggered_by: (job.data?.triggeredBy as string) ?? 'scheduled',
  }).returning({ id: jobRuns.id });

  try {
    // 3. No-op stub — Phase 5 wires real skill execution here
    console.log('[action-sync] executing stub');

    // 4. Mark completed
    await db.update(jobRuns)
      .set({ status: 'completed', completed_at: new Date() })
      .where(sql`id = ${runRecord.id}`);

    return { status: 'completed' };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db.update(jobRuns)
      .set({ status: 'failed', completed_at: new Date(), error_message: message })
      .where(sql`id = ${runRecord.id}`);
    throw err; // re-throw so BullMQ marks the job as failed in Redis
  }
}

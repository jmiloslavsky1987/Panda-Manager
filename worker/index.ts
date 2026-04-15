// bigpanda-app/worker/index.ts
/**
 * BullMQ Worker — Phase 4 Job Infrastructure
 *
 * Runs as a dedicated process alongside Next.js via concurrently.
 * Registers all 6 cron schedulers on startup, then polls every 60s
 * to pick up schedule changes saved via the Settings UI.
 *
 * Import: settings-core (NOT lib/settings — has server-only marker)
 */

// MUST be first import — loads .env.local before db/index.ts reads DATABASE_URL
import './env-loader';

import { Worker } from 'bullmq';
import { createRedisConnection } from './connection';
import { registerAllSchedulers, registerDbSchedulers } from './scheduler';
import {
  appendRunHistoryEntry,
  insertSchedulerFailureNotification,
} from '../lib/scheduler-notifications';
import { db } from '../db';
import { scheduledJobs } from '../db/schema';
import { eq } from 'drizzle-orm';

// Job handler dispatch map — avoids dynamic require which can fail with tsx
import actionSync            from './jobs/action-sync';
import healthRefresh         from './jobs/health-refresh';
import weeklyBriefing        from './jobs/weekly-briefing';
import contextUpdater        from './jobs/context-updater';
import ganttSnapshot         from './jobs/gantt-snapshot';
import riskMonitor           from './jobs/risk-monitor';
import skillRun              from './jobs/skill-run';
import weeklyCustomerStatus  from './jobs/weekly-customer-status';
import meetingSummary        from './jobs/meeting-summary';
import handoffDocGenerator         from './jobs/handoff-doc-generator';
import customerProjectTrackerJob    from './jobs/customer-project-tracker';
import discoveryScanJob             from './jobs/discovery-scan';
import timesheetReminderJob         from './jobs/timesheet-reminder';
import documentExtraction           from './jobs/document-extraction';
import weeklyFocus                  from './jobs/weekly-focus';
import eltExternalStatusJob         from './jobs/elt-external-status';
import eltInternalStatusJob         from './jobs/elt-internal-status';
import teamEngagementMapJob         from './jobs/team-engagement-map';
import workflowDiagramJob           from './jobs/workflow-diagram';
import biggyWeeklyBriefingJob       from './jobs/biggy-weekly-briefing';
import riskAssessmentJob            from './jobs/risk-assessment';
import qbrPrepJob                   from './jobs/qbr-prep';

const JOB_HANDLERS: Record<string, (job: Parameters<typeof actionSync>[0]) => Promise<{ status: string }>> = {
  'action-sync':            actionSync,
  'health-refresh':         healthRefresh,
  'weekly-briefing':        weeklyBriefing,
  'context-updater':        contextUpdater,
  'gantt-snapshot':         ganttSnapshot,
  'risk-monitor':           riskMonitor,
  'skill-run':              skillRun,
  'weekly-customer-status': weeklyCustomerStatus,
  'meeting-summary':        meetingSummary,
  'handoff-doc-generator':        handoffDocGenerator,
  'customer-project-tracker':     customerProjectTrackerJob,
  'discovery-scan':               discoveryScanJob,
  'timesheet-reminder':           timesheetReminderJob,
  'document-extraction':          documentExtraction,
  'weekly-focus':                 weeklyFocus,
  'elt-external-status':          eltExternalStatusJob,
  'elt-internal-status':          eltInternalStatusJob,
  'team-engagement-map':          teamEngagementMapJob,
  'workflow-diagram':             workflowDiagramJob,
  'biggy-weekly-briefing':        biggyWeeklyBriefingJob,
  'risk-assessment':              riskAssessmentJob,
  'qbr-prep':                     qbrPrepJob,
};

// Worker needs its own connection — NEVER share with Queue (BullMQ requirement)
const worker = new Worker(
  'scheduled-jobs',
  async (job) => {
    const handler = JOB_HANDLERS[job.name];
    if (!handler) {
      console.error(`[worker] no handler for job: ${job.name}`);
      return { status: 'unknown-job' };
    }
    return handler(job);
  },
  {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    connection: createRedisConnection() as any, // fresh connection for Worker
    concurrency: 1,                      // one job at a time per worker process
  }
);

// REQUIRED: missing error listener causes worker to stop processing silently
worker.on('error', (err) => console.error('[worker] error', err));

worker.on('completed', async (job) => {
  console.log(`[worker] ${job.name} completed`);

  // Write run history for DB-scheduled jobs (job.data.jobId present)
  const jobId: number | undefined = job.data?.jobId;
  if (jobId) {
    // Look up project_id to build an artifact link
    let artifact_link: string | undefined;
    try {
      const [row] = await db.select({ project_id: scheduledJobs.project_id })
        .from(scheduledJobs)
        .where(eq(scheduledJobs.id, jobId));
      if (row?.project_id) {
        artifact_link = `/customer/${row.project_id}/artifacts`;
      }
    } catch { /* non-fatal — proceed without link */ }

    const entry = {
      timestamp: new Date().toISOString(),
      outcome: 'success' as const,
      duration_ms: job.processedOn ? Date.now() - job.processedOn : undefined,
      artifact_link,
    };
    appendRunHistoryEntry(jobId, entry).catch((err) =>
      console.error('[worker] appendRunHistoryEntry error', err),
    );
  }
});

worker.on('failed', (job, err) => {
  console.error(`[worker] ${job?.name ?? 'unknown'} failed`, err.message);

  // Write failure notification + run history for DB-scheduled jobs
  const jobId: number | undefined = job?.data?.jobId;
  if (job && jobId) {
    const entry = {
      timestamp: new Date().toISOString(),
      outcome: 'failure' as const,
      error: err.message,
      duration_ms: job.processedOn
        ? Date.now() - job.processedOn
        : undefined,
    };
    appendRunHistoryEntry(jobId, entry).catch((e) =>
      console.error('[worker] appendRunHistoryEntry error', e),
    );
    insertSchedulerFailureNotification(jobId, job.name, err.message).catch((e) =>
      console.error('[worker] insertSchedulerFailureNotification error', e),
    );
  }
});

// Graceful shutdown — worker.close() waits for active jobs before exiting
const gracefulShutdown = async (signal: string) => {
  console.log(`[worker] received ${signal}, shutting down...`);
  await worker.close();
  process.exit(0);
};
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));

// Start: clean up legacy schedulers, register DB-driven schedulers, poll every 60s
async function start() {
  console.log('[worker] starting...');
  await registerAllSchedulers();
  await registerDbSchedulers();
  console.log('[worker] all schedulers registered');

  // Re-register every 60s — picks up DB job changes (enable/disable/edit)
  setInterval(async () => {
    try {
      await registerDbSchedulers();
    } catch (err) {
      console.error('[worker] scheduler poll error', err);
    }
  }, 60_000);

  console.log('[worker] ready — waiting for jobs');
}

start().catch((err) => {
  console.error('[worker] startup failed', err);
  process.exit(1);
});

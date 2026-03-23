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
import { registerAllSchedulers } from './scheduler';
import { readSettings } from '../lib/settings-core';

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
import handoffDocGenerator   from './jobs/handoff-doc-generator';

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
  'handoff-doc-generator':  handoffDocGenerator,
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
    connection: createRedisConnection(), // fresh connection for Worker
    concurrency: 1,                      // one job at a time per worker process
  }
);

// REQUIRED: missing error listener causes worker to stop processing silently
worker.on('error', (err) => console.error('[worker] error', err));
worker.on('completed', (job) => console.log(`[worker] ${job.name} completed`));
worker.on('failed', (job, err) => console.error(`[worker] ${job?.name ?? 'unknown'} failed`, err.message));

// Graceful shutdown — worker.close() waits for active jobs before exiting
const gracefulShutdown = async (signal: string) => {
  console.log(`[worker] received ${signal}, shutting down...`);
  await worker.close();
  process.exit(0);
};
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));

// Start: register schedulers, then poll every 60s for schedule changes
async function start() {
  console.log('[worker] starting...');
  const settings = await readSettings();
  await registerAllSchedulers(settings);
  console.log('[worker] all schedulers registered');

  // Re-register every 60s — picks up schedule changes saved via Settings UI
  setInterval(async () => {
    try {
      const fresh = await readSettings();
      await registerAllSchedulers(fresh);
    } catch (err) {
      console.error('[worker] settings poll error', err);
    }
  }, 60_000);

  console.log('[worker] ready — waiting for jobs');
}

start().catch((err) => {
  console.error('[worker] startup failed', err);
  process.exit(1);
});

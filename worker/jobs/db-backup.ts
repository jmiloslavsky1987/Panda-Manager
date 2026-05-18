// worker/jobs/db-backup.ts
// Phase 86: automated daily DB backup. BullMQ cron job (02:00 UTC daily) runs pg_dump
// against DATABASE_URL, writes to /root/.bigpanda-app/backups/, prunes files older than 30 days.
//
// Mirrors the logic of ~/bin/panda-backup.sh but managed by the app worker so it ships with the install.
//
// SECURITY NOTE: DATABASE_URL is interpolated into a shell command via execSync. This is
// acceptable here because the env var is set by ops (docker-compose.local.yml), not user input.
// `shell: '/bin/bash'` is used so the `>` redirection is honored by the shell.
import type { Job } from 'bullmq';
import { execSync } from 'child_process';
import { mkdirSync, readdirSync, statSync, unlinkSync } from 'fs';
import { join } from 'path';

const BACKUP_DIR = process.env.BACKUP_DIR ?? '/root/.bigpanda-app/backups';
const RETENTION_DAYS = 30;
const PG_DUMP_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes — RESEARCH.md Pitfall: hung pg_dump must not lock worker

export default async function dbBackupJob(_job: Job): Promise<{ status: string }> {
  mkdirSync(BACKUP_DIR, { recursive: true });

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  // Retention: delete backup files older than 30 days. Runs unconditionally — even if
  // today's backup already exists we still want to prune stale files.
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  for (const f of readdirSync(BACKUP_DIR)) {
    if (!f.startsWith('backup-') || !f.endsWith('.sql')) continue;
    const fp = join(BACKUP_DIR, f);
    try {
      if (statSync(fp).mtimeMs < cutoff) {
        unlinkSync(fp);
      }
    } catch {
      // ignore stat/unlink races on concurrent prune
    }
  }

  // Today-skip: if any file backup-${today}*.sql exists, bail out without invoking pg_dump.
  const existing = readdirSync(BACKUP_DIR).filter((f) => f.startsWith(`backup-${today}`));
  if (existing.length > 0) {
    return { status: 'skipped-today' };
  }

  // Run pg_dump.
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outFile = join(BACKUP_DIR, `backup-${timestamp}.sql`);
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL not set in worker env');
  }

  execSync(`pg_dump --no-owner --no-acl "${databaseUrl}" > "${outFile}"`, {
    shell: '/bin/bash',
    timeout: PG_DUMP_TIMEOUT_MS,
  });

  return { status: 'ok' };
}

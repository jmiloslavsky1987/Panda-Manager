/**
 * app/api/ingestion/jobs/[jobId]/route.ts — Polling and cancellation for extraction jobs
 *
 * GET  returns { status, progress_pct, current_chunk, total_chunks, error_message }
 * DELETE cancels the job: removes from BullMQ queue if pending, marks DB status='failed'
 *
 * Stale detection: if row.status === 'running' AND row.updated_at < now() - 20 minutes,
 * update DB row to status='failed', error_message='Job timed out (stale heartbeat)'.
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { Queue } from 'bullmq';
import db from '@/db';
import { extractionJobs } from '@/db/schema';
import { requireSession } from '@/lib/auth-server';
import { createApiRedisConnection } from '@/worker/connection';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;

  const { jobId } = await params;
  const [row] = await db
    .select()
    .from(extractionJobs)
    .where(eq(extractionJobs.id, Number(jobId)));

  if (!row) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Stale detection: if running and updated_at > 20 min ago, mark failed
  if (row.status === 'running') {
    const staleThreshold = new Date(Date.now() - 20 * 60 * 1000);
    if (row.updated_at < staleThreshold) {
      await db
        .update(extractionJobs)
        .set({
          status: 'failed',
          error_message: 'Job timed out (stale heartbeat)',
        })
        .where(eq(extractionJobs.id, row.id));

      return NextResponse.json({
        status: 'failed',
        progress_pct: row.progress_pct,
        current_chunk: row.current_chunk,
        total_chunks: row.total_chunks,
        error_message: 'Job timed out (stale heartbeat)',
      });
    }
  }

  return NextResponse.json({
    status: row.status,
    progress_pct: row.progress_pct,
    current_chunk: row.current_chunk,
    total_chunks: row.total_chunks,
    error_message: row.error_message,
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;

  const { jobId } = await params;
  const numericId = Number(jobId);

  const [row] = await db
    .select({ id: extractionJobs.id, status: extractionJobs.status })
    .from(extractionJobs)
    .where(eq(extractionJobs.id, numericId));

  if (!row) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (row.status === 'completed') {
    return NextResponse.json({ error: 'Job already completed' }, { status: 409 });
  }

  // Remove from BullMQ queue if the job hasn't started yet
  if (row.status === 'pending') {
    const queue = new Queue('scheduled-jobs', { connection: createApiRedisConnection() as any });
    try {
      const bullJob = await queue.getJob(`extraction-${numericId}`);
      if (bullJob) await bullJob.remove();
    } catch {
      // Non-fatal: job may have just started; DB update below still unblocks project deletion
    } finally {
      await queue.close();
    }
  }

  await db
    .update(extractionJobs)
    .set({ status: 'failed', error_message: 'Cancelled by user', updated_at: new Date() })
    .where(eq(extractionJobs.id, numericId));

  return NextResponse.json({ cancelled: true });
}

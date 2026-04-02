/**
 * app/api/ingestion/jobs/[jobId]/route.ts — Polling endpoint for per-job progress
 *
 * GET returns { status, progress_pct, current_chunk, total_chunks, error_message }
 * Returns 404 if job not found.
 *
 * Stale detection: if row.status === 'running' AND row.updated_at < now() - 10 minutes,
 * update DB row to status='failed', error_message='Job timed out (stale heartbeat)'.
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import db from '@/db';
import { extractionJobs } from '@/db/schema';
import { requireSession } from '@/lib/auth-server';

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

  // Stale detection: if running and updated_at > 10 min ago, mark failed
  if (row.status === 'running') {
    const staleThreshold = new Date(Date.now() - 10 * 60 * 1000);
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

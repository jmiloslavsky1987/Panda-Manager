/**
 * app/api/projects/[projectId]/extraction-status/route.ts — Batch status check
 *
 * GET returns { jobs: ExtractionJob[], batches: Record<string, { jobs, batch_complete, all_terminal }> }
 *
 * Returns all jobs for project where status IN ('pending', 'running', 'completed').
 * Excludes 'failed' to keep response clean — UI only shows active/ready-to-review jobs.
 * Groups jobs by batch_id and computes batch_complete flags.
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq, asc } from 'drizzle-orm';
import db from '@/db';
import { extractionJobs, artifacts, type ExtractionJob } from '@/db/schema';
import { requireSession } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;

  const { projectId } = await params;
  const rows = await db
    .select({ job: extractionJobs, artifactStatus: artifacts.ingestion_status })
    .from(extractionJobs)
    .leftJoin(artifacts, eq(extractionJobs.artifact_id, artifacts.id))
    .where(eq(extractionJobs.project_id, Number(projectId)))
    .orderBy(asc(extractionJobs.created_at));

  // Exclude failed jobs and jobs whose artifact has already been approved
  const activeJobs: ExtractionJob[] = rows
    .filter(r => ['pending', 'running', 'completed'].includes(r.job.status) && r.artifactStatus !== 'approved')
    .map(r => r.job);

  // Group by batch_id
  const batches: Record<
    string,
    { jobs: ExtractionJob[]; batch_complete: boolean; all_terminal: boolean }
  > = {};

  for (const job of activeJobs) {
    if (!batches[job.batch_id]) {
      batches[job.batch_id] = { jobs: [], batch_complete: false, all_terminal: false };
    }
    batches[job.batch_id].jobs.push(job);
  }

  // Compute batch completion flags
  for (const [, batch] of Object.entries(batches)) {
    batch.batch_complete = batch.jobs.every((j) => j.status === 'completed');
    batch.all_terminal = batch.jobs.every((j) =>
      ['completed', 'failed'].includes(j.status)
    );
  }

  return NextResponse.json({ jobs: activeJobs, batches });
}

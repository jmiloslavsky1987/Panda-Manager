/**
 * app/api/ingestion/extract/route.ts — Thin BullMQ enqueue endpoint
 *
 * Replaces 575-line SSE extraction route with ~50-line enqueue handler.
 * All extraction logic moved to worker/jobs/document-extraction.ts (Plan 31-02).
 *
 * POST body: { artifactIds: number[], projectId: number }
 * Response: { jobIds: number[], batchId: string }
 *
 * For shared types (EntityType, ExtractionItem, isAlreadyIngested), import from:
 * @/lib/extraction-types
 */

import { NextRequest, NextResponse } from 'next/server';
import { Queue } from 'bullmq';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { createApiRedisConnection } from '@/worker/connection';
import db from '@/db';
import { extractionJobs } from '@/db/schema';
import { requireSession } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

const Schema = z.object({
  artifactIds: z.array(z.number().int().positive()),
  projectId: z.number().int().positive(),
});

export async function POST(request: NextRequest) {
  const { redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;

  const parsed = Schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const { artifactIds, projectId } = parsed.data;
  const batchId = randomUUID();
  const queue = new Queue('scheduled-jobs', { connection: createApiRedisConnection() as any });

  const jobIds: number[] = [];
  for (const artifactId of artifactIds) {
    const [row] = await db.insert(extractionJobs).values({
      artifact_id: artifactId,
      project_id: projectId,
      batch_id: batchId,
      status: 'pending',
    }).returning({ id: extractionJobs.id });

    await queue.add('document-extraction',
      { jobId: row.id, artifactId, projectId, batchId },
      { jobId: `extraction-${row.id}` }
    );
    jobIds.push(row.id);
  }

  await queue.close();
  return NextResponse.json({ jobIds, batchId });
}

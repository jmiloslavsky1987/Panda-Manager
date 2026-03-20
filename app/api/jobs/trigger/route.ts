// bigpanda-app/app/api/jobs/trigger/route.ts
import { NextResponse } from 'next/server';
import { Queue } from 'bullmq';
import { createApiRedisConnection } from '../../../../worker/connection';

export async function POST(request: Request) {
  try {
    const { jobName } = await request.json() as { jobName: string };

    if (!jobName) {
      return NextResponse.json({ error: 'jobName is required' }, { status: 400 });
    }

    const queue = new Queue('scheduled-jobs', { connection: createApiRedisConnection() });
    await queue.add(
      jobName,
      { triggeredBy: 'manual' },
      { jobId: `manual-${jobName}-${Date.now()}` }
    );
    await queue.close();

    return NextResponse.json({ ok: true, jobName });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

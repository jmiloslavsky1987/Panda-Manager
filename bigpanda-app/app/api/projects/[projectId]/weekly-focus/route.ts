// bigpanda-app/app/api/projects/[projectId]/weekly-focus/route.ts
// GET: Read weekly focus bullets from Redis cache
// POST: Trigger on-demand weekly focus generation for this project
import { NextRequest, NextResponse } from 'next/server';
import { Queue } from 'bullmq';
import { requireProjectRole } from '@/lib/auth-server';
import { createApiRedisConnection } from '@/worker/connection';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const numericId = parseInt(projectId, 10);

  if (isNaN(numericId)) {
    return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
  }

  const { session, redirectResponse } = await requireProjectRole(numericId, 'user');
  if (redirectResponse) return redirectResponse;

  const redis = createApiRedisConnection();
  try {
    await redis.connect(); // lazyConnect: true — must connect manually
    const raw = await redis.get(`weekly_focus:${numericId}`);

    if (!raw) {
      return NextResponse.json({ bullets: null }, { status: 200 });
    }

    const bullets = JSON.parse(raw) as string[];
    return NextResponse.json({ bullets });
  } catch (err) {
    console.error('[weekly-focus GET] error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch weekly focus' },
      { status: 500 }
    );
  } finally {
    await redis.quit();
  }
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const numericId = parseInt(projectId, 10);

  if (isNaN(numericId)) {
    return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
  }

  const { session, redirectResponse } = await requireProjectRole(numericId, 'user');
  if (redirectResponse) return redirectResponse;

  const queue = new Queue('scheduled-jobs', {
    connection: createApiRedisConnection() as any,
  });

  try {
    await queue.add(
      'weekly-focus',
      { triggeredBy: 'manual', projectId: numericId },
      { removeOnComplete: 10, removeOnFail: 5 }
    );
    return NextResponse.json({ queued: true });
  } catch (err) {
    console.error('[weekly-focus POST] error:', err);
    return NextResponse.json(
      { error: 'Failed to enqueue weekly focus job' },
      { status: 500 }
    );
  } finally {
    await queue.close(); // REQUIRED: prevents connection leak
  }
}

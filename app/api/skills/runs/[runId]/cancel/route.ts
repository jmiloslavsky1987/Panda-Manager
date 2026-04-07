import { NextResponse } from 'next/server'
import { Queue } from 'bullmq'
import { createApiRedisConnection } from '@/worker/connection'
import db from '@/db'
import { skillRuns } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { requireSession } from '@/lib/auth-server'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { session, redirectResponse } = await requireSession()
  if (redirectResponse) return redirectResponse

  const { runId } = await params

  // 1. Update DB status to 'cancelled'
  const [run] = await db
    .update(skillRuns)
    .set({ status: 'cancelled' as const, completed_at: new Date() })
    .where(eq(skillRuns.run_id, runId))
    .returning()

  if (!run) {
    return NextResponse.json({ error: 'Run not found' }, { status: 404 })
  }

  // 2. Remove from BullMQ queue if still pending (no-op if already running)
  const queue = new Queue('scheduled-jobs', { connection: createApiRedisConnection() as any })
  try {
    await queue.remove(`skill-run-${runId}`)
  } finally {
    await queue.close() // CRITICAL: prevent Redis connection leak
  }

  return NextResponse.json({ success: true, status: 'cancelled' })
}

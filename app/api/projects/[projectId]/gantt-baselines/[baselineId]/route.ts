export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { ganttBaselines } from '@/db/schema'
import { and, eq, sql } from 'drizzle-orm'
import { requireProjectRole } from '@/lib/auth-server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; baselineId: string }> }
) {
  const { projectId, baselineId } = await params
  const numericId = parseInt(projectId, 10)
  const numericBaselineId = parseInt(baselineId, 10)

  if (isNaN(numericId)) {
    return NextResponse.json({ error: 'Invalid projectId' }, { status: 400 })
  }
  if (isNaN(numericBaselineId)) {
    return NextResponse.json({ error: 'Invalid baselineId' }, { status: 400 })
  }

  const { redirectResponse } = await requireProjectRole(numericId, 'user')
  if (redirectResponse) return redirectResponse

  try {
    const [baseline] = await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.current_project_id = ${numericId}`))
      return tx
        .select()
        .from(ganttBaselines)
        .where(
          and(
            eq(ganttBaselines.id, numericBaselineId),
            eq(ganttBaselines.project_id, numericId)
          )
        )
    })

    if (!baseline) {
      return NextResponse.json({ error: 'Baseline not found' }, { status: 404 })
    }

    return NextResponse.json({
      id: baseline.id,
      name: baseline.name,
      snapshot: baseline.snapshot_json,
      createdAt: baseline.created_at.toISOString(),
    })
  } catch (err) {
    console.error('GET /api/projects/[projectId]/gantt-baselines/[baselineId] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

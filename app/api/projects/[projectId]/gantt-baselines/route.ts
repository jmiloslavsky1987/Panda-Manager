export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { ganttBaselines } from '@/db/schema'
import { eq, desc, sql } from 'drizzle-orm'
import { requireProjectRole } from '@/lib/auth-server'

type BaselineSnapshot = {
  [taskId: string]: { start: string; end: string }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params
  const numericId = parseInt(projectId, 10)
  if (isNaN(numericId)) {
    return NextResponse.json({ error: 'Invalid projectId' }, { status: 400 })
  }

  const { redirectResponse } = await requireProjectRole(numericId, 'user')
  if (redirectResponse) return redirectResponse

  try {
    const result = await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.current_project_id = ${numericId}`))
      return tx
        .select({
          id: ganttBaselines.id,
          name: ganttBaselines.name,
          createdAt: ganttBaselines.created_at,
        })
        .from(ganttBaselines)
        .where(eq(ganttBaselines.project_id, numericId))
        .orderBy(desc(ganttBaselines.created_at))
    })

    return NextResponse.json({
      baselines: result.map(b => ({
        id: b.id,
        name: b.name,
        createdAt: b.createdAt.toISOString(),
      })),
    })
  } catch (err) {
    console.error('GET /api/projects/[projectId]/gantt-baselines error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params
  const numericId = parseInt(projectId, 10)
  if (isNaN(numericId)) {
    return NextResponse.json({ error: 'Invalid projectId' }, { status: 400 })
  }

  const { redirectResponse } = await requireProjectRole(numericId, 'user')
  if (redirectResponse) return redirectResponse

  let body: { name?: unknown; snapshot?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { name, snapshot } = body

  // Validate name
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }
  if (name.trim().length > 100) {
    return NextResponse.json({ error: 'name must be 100 characters or fewer' }, { status: 400 })
  }

  // Validate snapshot
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
    return NextResponse.json({ error: 'snapshot is required and must be an object' }, { status: 400 })
  }

  try {
    const [created] = await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.current_project_id = ${numericId}`))
      return tx
        .insert(ganttBaselines)
        .values({
          project_id: numericId,
          name: name.trim(),
          snapshot_json: snapshot as BaselineSnapshot,
        })
        .returning({
          id: ganttBaselines.id,
          name: ganttBaselines.name,
          createdAt: ganttBaselines.created_at,
        })
    })

    return NextResponse.json(
      { id: created.id, name: created.name, createdAt: created.createdAt.toISOString() },
      { status: 201 }
    )
  } catch (err) {
    console.error('POST /api/projects/[projectId]/gantt-baselines error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

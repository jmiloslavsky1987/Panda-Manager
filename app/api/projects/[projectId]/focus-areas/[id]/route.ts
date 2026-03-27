import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { focusAreas } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { sql } from 'drizzle-orm'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; id: string }> }
) {
  const { projectId, id } = await params
  const numericProjectId = parseInt(projectId, 10)
  const numericId = parseInt(id, 10)
  if (isNaN(numericProjectId) || isNaN(numericId)) {
    return NextResponse.json({ error: 'Invalid projectId or id' }, { status: 400 })
  }

  let body: {
    title?: string
    tracks?: string
    why_it_matters?: string
    current_status?: string
    next_step?: string
    bp_owner?: string
    customer_owner?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}
  if (body.title !== undefined) updates.title = body.title
  if (body.tracks !== undefined) updates.tracks = body.tracks
  if (body.why_it_matters !== undefined) updates.why_it_matters = body.why_it_matters
  if (body.current_status !== undefined) updates.current_status = body.current_status
  if (body.next_step !== undefined) updates.next_step = body.next_step
  if (body.bp_owner !== undefined) updates.bp_owner = body.bp_owner
  if (body.customer_owner !== undefined) updates.customer_owner = body.customer_owner

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  try {
    const result = await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.current_project_id = ${numericProjectId}`))
      return tx.update(focusAreas)
        .set(updates)
        .where(and(eq(focusAreas.id, numericId), eq(focusAreas.project_id, numericProjectId)))
        .returning()
    })
    if (result.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json({ focusArea: result[0] })
  } catch (err) {
    console.error('PATCH /api/projects/[projectId]/focus-areas/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; id: string }> }
) {
  const { projectId, id } = await params
  const numericProjectId = parseInt(projectId, 10)
  const numericId = parseInt(id, 10)
  if (isNaN(numericProjectId) || isNaN(numericId)) {
    return NextResponse.json({ error: 'Invalid projectId or id' }, { status: 400 })
  }

  try {
    await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.current_project_id = ${numericProjectId}`))
      await tx.delete(focusAreas)
        .where(and(eq(focusAreas.id, numericId), eq(focusAreas.project_id, numericProjectId)))
    })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/projects/[projectId]/focus-areas/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

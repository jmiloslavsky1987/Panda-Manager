import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { focusAreas, auditLog } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import { requireSession } from "@/lib/auth-server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; id: string }> }
) {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;

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

  // Read before-state for audit
  const [before] = await db.select().from(focusAreas)
    .where(and(eq(focusAreas.id, numericId), eq(focusAreas.project_id, numericProjectId)))
  if (!before) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const result = await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.current_project_id = ${numericProjectId}`))
      const updated = await tx.update(focusAreas)
        .set(updates)
        .where(and(eq(focusAreas.id, numericId), eq(focusAreas.project_id, numericProjectId)))
        .returning()
      await tx.insert(auditLog).values({
        entity_type: 'focus_area',
        entity_id: numericId,
        action: 'update',
        actor_id: 'default',
        before_json: before as Record<string, unknown>,
        after_json: { ...before, ...updates } as Record<string, unknown>,
      })
      return updated
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
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;

  const { projectId, id } = await params
  const numericProjectId = parseInt(projectId, 10)
  const numericId = parseInt(id, 10)
  if (isNaN(numericProjectId) || isNaN(numericId)) {
    return NextResponse.json({ error: 'Invalid projectId or id' }, { status: 400 })
  }

  // Read before-state for audit
  const [beforeDelete] = await db.select().from(focusAreas)
    .where(and(eq(focusAreas.id, numericId), eq(focusAreas.project_id, numericProjectId)))

  try {
    await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.current_project_id = ${numericProjectId}`))
      if (beforeDelete) {
        await tx.insert(auditLog).values({
          entity_type: 'focus_area',
          entity_id: numericId,
          action: 'delete',
          actor_id: 'default',
          before_json: beforeDelete as Record<string, unknown>,
          after_json: null,
        })
      }
      await tx.delete(focusAreas)
        .where(and(eq(focusAreas.id, numericId), eq(focusAreas.project_id, numericProjectId)))
    })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/projects/[projectId]/focus-areas/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

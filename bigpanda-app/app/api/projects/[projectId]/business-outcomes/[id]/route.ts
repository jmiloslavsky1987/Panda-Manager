import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { businessOutcomes, auditLog } from '@/db/schema'
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
    track?: string
    description?: string
    delivery_status?: string
    mapping_note?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}
  if (body.title !== undefined) updates.title = body.title
  if (body.track !== undefined) updates.track = body.track
  if (body.description !== undefined) updates.description = body.description
  if (body.delivery_status !== undefined) updates.delivery_status = body.delivery_status
  if (body.mapping_note !== undefined) updates.mapping_note = body.mapping_note

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  // Read before-state for audit
  const [before] = await db.select().from(businessOutcomes)
    .where(and(eq(businessOutcomes.id, numericId), eq(businessOutcomes.project_id, numericProjectId)))
  if (!before) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const result = await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.current_project_id = ${numericProjectId}`))
      const updated = await tx.update(businessOutcomes)
        .set(updates)
        .where(and(eq(businessOutcomes.id, numericId), eq(businessOutcomes.project_id, numericProjectId)))
        .returning()
      await tx.insert(auditLog).values({
        entity_type: 'business_outcome',
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
    return NextResponse.json({ outcome: result[0] })
  } catch (err) {
    console.error('PATCH /api/projects/[projectId]/business-outcomes/[id] error:', err)
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

  // Read before-state for audit
  const [beforeDelete] = await db.select().from(businessOutcomes)
    .where(and(eq(businessOutcomes.id, numericId), eq(businessOutcomes.project_id, numericProjectId)))

  try {
    await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.current_project_id = ${numericProjectId}`))
      if (beforeDelete) {
        await tx.insert(auditLog).values({
          entity_type: 'business_outcome',
          entity_id: numericId,
          action: 'delete',
          actor_id: 'default',
          before_json: beforeDelete as Record<string, unknown>,
          after_json: null,
        })
      }
      await tx.delete(businessOutcomes)
        .where(and(eq(businessOutcomes.id, numericId), eq(businessOutcomes.project_id, numericProjectId)))
    })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/projects/[projectId]/business-outcomes/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

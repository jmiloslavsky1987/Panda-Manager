import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { teamPathways, auditLog } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import { z } from 'zod'
import { requireSession } from "@/lib/auth-server"

const patchSchema = z.object({
  team_name:   z.string().min(1).optional(),
  route_steps: z.array(z.object({ label: z.string() })).optional(),
  status:      z.enum(['live', 'in_progress', 'pilot', 'planned']).optional(),
  notes:       z.string().nullable().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; id: string }> }
) {
  const { redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;

  const { projectId, id } = await params
  const numericProjectId = parseInt(projectId, 10)
  const numericId = parseInt(id, 10)

  if (isNaN(numericProjectId)) {
    return NextResponse.json({ error: 'Invalid projectId' }, { status: 400 })
  }
  if (isNaN(numericId)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const updateData: Partial<typeof teamPathways.$inferInsert> = {}
  const { team_name, route_steps, status, notes } = parsed.data
  if (team_name   !== undefined) updateData.team_name   = team_name
  if (route_steps !== undefined) updateData.route_steps = route_steps as unknown as typeof teamPathways.$inferInsert['route_steps']
  if (status      !== undefined) updateData.status      = status
  if (notes       !== undefined) updateData.notes       = notes

  const [before] = await db.select().from(teamPathways)
    .where(and(eq(teamPathways.id, numericId), eq(teamPathways.project_id, numericProjectId)))
  if (!before) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const result = await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.current_project_id = ${numericProjectId}`))
      const updated = await tx
        .update(teamPathways)
        .set(updateData)
        .where(and(eq(teamPathways.id, numericId), eq(teamPathways.project_id, numericProjectId)))
        .returning()
      await tx.insert(auditLog).values({
        entity_type: 'team_pathway',
        entity_id:   numericId,
        action:      'update',
        actor_id:    'default',
        before_json: before as Record<string, unknown>,
        after_json:  { ...before, ...updateData } as Record<string, unknown>,
      })
      return updated
    })

    if (result.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json({ pathway: result[0] })
  } catch (err) {
    console.error('PATCH /api/projects/[projectId]/team-pathways/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; id: string }> }
) {
  const { redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;

  const { projectId, id } = await params
  const numericProjectId = parseInt(projectId, 10)
  const numericId = parseInt(id, 10)

  if (isNaN(numericProjectId)) {
    return NextResponse.json({ error: 'Invalid projectId' }, { status: 400 })
  }
  if (isNaN(numericId)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  const [beforeDelete] = await db.select().from(teamPathways)
    .where(and(eq(teamPathways.id, numericId), eq(teamPathways.project_id, numericProjectId)))

  try {
    await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.current_project_id = ${numericProjectId}`))
      if (beforeDelete) {
        await tx.insert(auditLog).values({
          entity_type: 'team_pathway',
          entity_id:   numericId,
          action:      'delete',
          actor_id:    'default',
          before_json: beforeDelete as Record<string, unknown>,
          after_json:  null,
        })
      }
      await tx
        .delete(teamPathways)
        .where(and(eq(teamPathways.id, numericId), eq(teamPathways.project_id, numericProjectId)))
    })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/projects/[projectId]/team-pathways/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

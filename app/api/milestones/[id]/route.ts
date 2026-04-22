import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '../../../../db'
import { milestones, auditLog } from '../../../../db/schema'
import { eq, sql } from 'drizzle-orm'
import { requireProjectRole } from "@/lib/auth-server";

const patchSchema = z.object({
  status: z.enum(['on_track', 'at_risk', 'complete', 'missed']).optional(),
  target: z.string().optional(),
  owner: z.string().optional(),
  notes: z.string().optional(),
  date: z.string().nullable().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const numericId = parseInt(id, 10)

  if (isNaN(numericId)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  // Auth: lookup project_id first, then check role
  const [entityForAuth] = await db.select({ project_id: milestones.project_id })
    .from(milestones)
    .where(eq(milestones.id, numericId))
  if (!entityForAuth) return NextResponse.json({ error: 'Milestone not found' }, { status: 404 })

  const { session, redirectResponse } = await requireProjectRole(entityForAuth.project_id, 'user')
  if (redirectResponse) return redirectResponse

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const patch = parsed.data

  // Read before-state for audit
  const [before] = await db.select().from(milestones).where(eq(milestones.id, numericId))
  if (!before) {
    return NextResponse.json({ error: 'Milestone not found' }, { status: 404 })
  }

  await db.transaction(async (tx) => {
    await tx.execute(sql.raw(`SET LOCAL app.current_project_id = ${entityForAuth.project_id}`))
    await tx.update(milestones).set(patch).where(eq(milestones.id, numericId))
    await tx.insert(auditLog).values({
      entity_type: 'milestone',
      entity_id: numericId,
      action: 'update',
      actor_id: session.user.id,
      before_json: before as Record<string, unknown>,
      after_json: { ...before, ...patch } as Record<string, unknown>,
    })
  })

  return NextResponse.json({ ok: true })
}

// ─── DELETE handler ───────────────────────────────────────────────────────────

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const numericId = parseInt(id, 10)
  if (isNaN(numericId)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  const [entity] = await db.select({ project_id: milestones.project_id })
    .from(milestones)
    .where(eq(milestones.id, numericId))
  if (!entity) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { session, redirectResponse } = await requireProjectRole(entity.project_id, 'user')
  if (redirectResponse) return redirectResponse

  const [before] = await db.select().from(milestones).where(eq(milestones.id, numericId))
  if (!before) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await db.transaction(async (tx) => {
    await tx.execute(sql.raw(`SET LOCAL app.current_project_id = ${entity.project_id}`))
    await tx.insert(auditLog).values({
      entity_type: 'milestone',
      entity_id: numericId,
      action: 'delete',
      actor_id: session.user.id,
      before_json: before as Record<string, unknown>,
      after_json: null,
    })
    await tx.delete(milestones).where(eq(milestones.id, numericId))
  })

  return NextResponse.json({ success: true })
}

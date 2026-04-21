import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/db'
import { workstreams, auditLog } from '@/db/schema'
import { eq, sql } from 'drizzle-orm'
import { requireProjectRole } from "@/lib/auth-server";

const patchSchema = z.object({
  state: z.string().optional(),
  lead: z.string().optional(),
  percent_complete: z.number().int().min(0).max(100).optional(),
}).refine(
  d => d.state !== undefined || d.lead !== undefined || d.percent_complete !== undefined,
  { message: 'At least one field required' }
)

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const numericId = parseInt(id, 10)
  if (isNaN(numericId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  // Auth: lookup project_id first, then check role
  const [entityForAuth] = await db.select({ project_id: workstreams.project_id })
    .from(workstreams)
    .where(eq(workstreams.id, numericId))
  if (!entityForAuth) return NextResponse.json({ error: 'Workstream not found' }, { status: 404 })

  const { session, redirectResponse } = await requireProjectRole(entityForAuth.project_id, 'user')
  if (redirectResponse) return redirectResponse

  const parsed = patchSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const { state, lead, percent_complete } = parsed.data
  const today = new Date().toISOString().split('T')[0]

  const patch: Record<string, unknown> = { last_updated: today }
  if (state !== undefined) patch.state = state
  if (lead !== undefined) patch.lead = lead
  if (percent_complete !== undefined) patch.percent_complete = percent_complete

  // Do NOT call updateWorkstreamProgress() here — that recalculates from tasks.
  // This route writes directly to percent_complete. The two paths are independent.

  const [before] = await db.select().from(workstreams).where(eq(workstreams.id, numericId))
  if (!before) return NextResponse.json({ error: 'Workstream not found' }, { status: 404 })

  await db.transaction(async (tx) => {
    await tx.execute(sql.raw(`SET LOCAL app.current_project_id = ${entityForAuth.project_id}`))
    await tx.update(workstreams).set(patch).where(eq(workstreams.id, numericId))
    const [after] = await tx.select().from(workstreams).where(eq(workstreams.id, numericId))
    await tx.insert(auditLog).values({
      entity_type: 'workstream',
      entity_id: numericId,
      action: 'update',
      actor_id: session.user.id,
      before_json: before as Record<string, unknown>,
      after_json: after as Record<string, unknown>,
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

  const [entity] = await db.select({ project_id: workstreams.project_id })
    .from(workstreams)
    .where(eq(workstreams.id, numericId))
  if (!entity) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { session, redirectResponse } = await requireProjectRole(entity.project_id, 'user')
  if (redirectResponse) return redirectResponse

  const [before] = await db.select().from(workstreams).where(eq(workstreams.id, numericId))
  if (!before) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await db.transaction(async (tx) => {
    await tx.execute(sql.raw(`SET LOCAL app.current_project_id = ${entity.project_id}`))
    await tx.insert(auditLog).values({
      entity_type: 'workstream',
      entity_id: numericId,
      action: 'delete',
      actor_id: session.user.id,
      before_json: before as Record<string, unknown>,
      after_json: null,
    })
    await tx.delete(workstreams).where(eq(workstreams.id, numericId))
  })

  return NextResponse.json({ success: true })
}

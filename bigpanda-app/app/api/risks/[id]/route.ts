import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '../../../../db'
import { risks, auditLog } from '../../../../db/schema'
import { eq, sql } from 'drizzle-orm'
import { requireProjectRole } from "@/lib/auth-server";

const patchSchema = z.object({
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  status: z.enum(['open', 'mitigated', 'resolved', 'accepted']).optional(),
  mitigation_append: z.string().optional(),
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
  const [entityForAuth] = await db.select({ project_id: risks.project_id })
    .from(risks)
    .where(eq(risks.id, numericId))
  if (!entityForAuth) return NextResponse.json({ error: 'Risk not found' }, { status: 404 })

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

  const { severity, status, mitigation_append } = parsed.data
  const today = new Date().toISOString().split('T')[0]

  // Read before-state (always, to capture for audit)
  const [before] = await db.select().from(risks).where(eq(risks.id, numericId))
  if (!before) {
    return NextResponse.json({ error: 'Risk not found' }, { status: 404 })
  }

  // Build the update patch
  const patch: {
    severity?: typeof severity
    status?: typeof status
    mitigation?: string
    last_updated?: string
  } = {}

  if (severity !== undefined) patch.severity = severity
  if (status !== undefined) patch.status = status

  if (mitigation_append && mitigation_append.trim()) {
    const existingMitigation = before.mitigation ?? ''
    const separator = existingMitigation ? '\n\n' : ''
    patch.mitigation = existingMitigation + separator + `${today}: ${mitigation_append.trim()}`
  }

  patch.last_updated = today

  await db.transaction(async (tx) => {
    await tx.execute(sql.raw(`SET LOCAL app.current_project_id = ${entityForAuth.project_id}`))
    await tx.update(risks).set(patch).where(eq(risks.id, numericId))
    await tx.insert(auditLog).values({
      entity_type: 'risk',
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

  const [entity] = await db.select({ project_id: risks.project_id })
    .from(risks)
    .where(eq(risks.id, numericId))
  if (!entity) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { session, redirectResponse } = await requireProjectRole(entity.project_id, 'user')
  if (redirectResponse) return redirectResponse

  const [before] = await db.select().from(risks).where(eq(risks.id, numericId))
  if (!before) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await db.transaction(async (tx) => {
    await tx.execute(sql.raw(`SET LOCAL app.current_project_id = ${entity.project_id}`))
    await tx.insert(auditLog).values({
      entity_type: 'risk',
      entity_id: numericId,
      action: 'delete',
      actor_id: session.user.id,
      before_json: before as Record<string, unknown>,
      after_json: null,
    })
    await tx.delete(risks).where(eq(risks.id, numericId))
  })

  return NextResponse.json({ success: true })
}

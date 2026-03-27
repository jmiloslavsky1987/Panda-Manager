import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '../../../../db'
import { milestones, auditLog } from '../../../../db/schema'
import { eq } from 'drizzle-orm'

const patchSchema = z.object({
  status: z.string().optional(),
  target: z.string().optional(),
  owner: z.string().optional(),
  notes: z.string().optional(),
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

  const patch = parsed.data

  // Read before-state for audit
  const [before] = await db.select().from(milestones).where(eq(milestones.id, numericId))
  if (!before) {
    return NextResponse.json({ error: 'Milestone not found' }, { status: 404 })
  }

  await db.transaction(async (tx) => {
    await tx.update(milestones).set(patch).where(eq(milestones.id, numericId))
    await tx.insert(auditLog).values({
      entity_type: 'milestone',
      entity_id: numericId,
      action: 'update',
      actor_id: 'default',
      before_json: before as Record<string, unknown>,
      after_json: { ...before, ...patch } as Record<string, unknown>,
    })
  })

  return NextResponse.json({ ok: true })
}

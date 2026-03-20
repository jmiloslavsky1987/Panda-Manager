import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '../../../../db'
import { risks } from '../../../../db/schema'
import { eq } from 'drizzle-orm'

const patchSchema = z.object({
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  status: z.string().optional(),
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

  const { severity, status, mitigation_append } = parsed.data
  const today = new Date().toISOString().split('T')[0]

  // Build the update patch
  const patch: {
    severity?: typeof severity
    status?: string
    mitigation?: string
    last_updated?: string
  } = {}

  if (severity !== undefined) patch.severity = severity
  if (status !== undefined) patch.status = status

  if (mitigation_append && mitigation_append.trim()) {
    // Fetch existing mitigation to append
    const existing = await db
      .select({ mitigation: risks.mitigation })
      .from(risks)
      .where(eq(risks.id, numericId))

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Risk not found' }, { status: 404 })
    }

    const existingMitigation = existing[0].mitigation ?? ''
    const separator = existingMitigation ? '\n\n' : ''
    patch.mitigation = existingMitigation + separator + `${today}: ${mitigation_append.trim()}`
  }

  patch.last_updated = today

  const result = await db
    .update(risks)
    .set(patch)
    .where(eq(risks.id, numericId))
    .returning({ id: risks.id })

  if (result.length === 0) {
    return NextResponse.json({ error: 'Risk not found' }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}

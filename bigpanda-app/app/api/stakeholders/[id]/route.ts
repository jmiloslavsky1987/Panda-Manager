import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '../../../../db'
import { stakeholders } from '../../../../db/schema'
import { eq } from 'drizzle-orm'

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.string().optional(),
  company: z.string().optional(),
  email: z.string().optional(),
  slack_id: z.string().optional(),
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

  const result = await db
    .update(stakeholders)
    .set(patch)
    .where(eq(stakeholders.id, numericId))
    .returning({ id: stakeholders.id })

  if (result.length === 0) {
    return NextResponse.json({ error: 'Stakeholder not found' }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}

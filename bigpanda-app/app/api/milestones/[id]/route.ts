import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '../../../../db'
import { milestones } from '../../../../db/schema'
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

  const result = await db
    .update(milestones)
    .set(patch)
    .where(eq(milestones.id, numericId))
    .returning({ id: milestones.id })

  if (result.length === 0) {
    return NextResponse.json({ error: 'Milestone not found' }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}

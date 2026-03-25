import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/db'
import { workstreams } from '@/db/schema'
import { eq } from 'drizzle-orm'

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

  const result = await db
    .update(workstreams)
    .set(patch)
    .where(eq(workstreams.id, numericId))
    .returning({ id: workstreams.id })

  if (result.length === 0) return NextResponse.json({ error: 'Workstream not found' }, { status: 404 })

  return NextResponse.json({ ok: true })
}

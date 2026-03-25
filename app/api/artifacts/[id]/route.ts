import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/db'
import { artifacts } from '@/db/schema'
import { eq } from 'drizzle-orm'

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  status: z.string().optional(),
  owner: z.string().optional(),
  description: z.string().optional(),
}).refine(
  d => d.name !== undefined || d.status !== undefined || d.owner !== undefined || d.description !== undefined,
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

  const patch: Record<string, unknown> = {}
  if (parsed.data.name !== undefined) patch.name = parsed.data.name
  if (parsed.data.status !== undefined) patch.status = parsed.data.status
  if (parsed.data.owner !== undefined) patch.owner = parsed.data.owner
  if (parsed.data.description !== undefined) patch.description = parsed.data.description

  const result = await db.update(artifacts).set(patch).where(eq(artifacts.id, numericId)).returning({ id: artifacts.id })
  if (result.length === 0) return NextResponse.json({ error: 'Artifact not found' }, { status: 404 })

  return NextResponse.json({ ok: true })
}

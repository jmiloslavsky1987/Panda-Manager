import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/db'
import { artifacts, auditLog } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { requireSession } from "@/lib/auth-server";

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
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;

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

  // Read before-state for audit
  const [before] = await db.select().from(artifacts).where(eq(artifacts.id, numericId))
  if (!before) return NextResponse.json({ error: 'Artifact not found' }, { status: 404 })

  await db.transaction(async (tx) => {
    await tx.update(artifacts).set(patch).where(eq(artifacts.id, numericId))
    await tx.insert(auditLog).values({
      entity_type: 'artifact',
      entity_id: numericId,
      action: 'update',
      actor_id: 'default',
      before_json: before as Record<string, unknown>,
      after_json: { ...before, ...patch } as Record<string, unknown>,
    })
  })

  return NextResponse.json({ ok: true })
}

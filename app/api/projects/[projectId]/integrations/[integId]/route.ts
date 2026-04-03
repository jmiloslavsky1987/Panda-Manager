import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { integrations } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import { z } from 'zod'
import { requireSession } from "@/lib/auth-server";

const ADR_TYPES = ['Inbound', 'Outbound', 'Enrichment'] as const
const BIGGY_TYPES = ['Real-time', 'Context', 'Knowledge', 'UDC'] as const

const patchSchema = z.object({
  status: z.enum(['not-connected', 'configured', 'validated', 'production', 'blocked']).optional(),
  notes: z.string().optional(),
  track: z.enum(['ADR', 'Biggy']).nullable().optional(),
  integration_type: z.string().nullable().optional(),
}).superRefine((data, ctx) => {
  if (data.track === 'ADR' && data.integration_type != null && !ADR_TYPES.includes(data.integration_type as any)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['integration_type'], message: 'ADR integrations must use: Inbound, Outbound, or Enrichment' })
  }
  if (data.track === 'Biggy' && data.integration_type != null && !BIGGY_TYPES.includes(data.integration_type as any)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['integration_type'], message: 'Biggy integrations must use: Real-time, Context, Knowledge, or UDC' })
  }
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; integId: string }> }
) {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;

  const { projectId, integId } = await params
  const numericProjectId = parseInt(projectId, 10)
  const numericIntegId = parseInt(integId, 10)

  if (isNaN(numericProjectId)) {
    return NextResponse.json({ error: 'Invalid projectId' }, { status: 400 })
  }
  if (isNaN(numericIntegId)) {
    return NextResponse.json({ error: 'Invalid integId' }, { status: 400 })
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

  const { status, notes, track, integration_type } = parsed.data

  const updateData: Partial<typeof integrations.$inferInsert> & { updated_at: Date } = {
    updated_at: new Date(),
  }
  if (status !== undefined) updateData.status = status
  if (notes !== undefined) updateData.notes = notes
  if (track !== undefined) updateData.track = track
  if (integration_type !== undefined) updateData.integration_type = integration_type

  try {
    await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.current_project_id = ${numericProjectId}`))

      await tx
        .update(integrations)
        .set(updateData)
        .where(eq(integrations.id, numericIntegId))
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('PATCH /api/projects/[projectId]/integrations/[integId] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { architectureIntegrations, auditLog } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import { z } from 'zod'
import { requireSession } from "@/lib/auth-server";

const patchSchema = z.object({
  tool_name: z.string().min(1).optional(),
  track: z.string().min(1).optional(),
  phase: z.string().nullable().optional(),
  integration_group: z.string().nullable().optional(),
  status: z.enum(['live', 'in_progress', 'pilot', 'planned']).optional(),
  integration_method: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; id: string }> }
) {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;

  const { projectId, id } = await params
  const numericProjectId = parseInt(projectId, 10)
  const numericId = parseInt(id, 10)

  if (isNaN(numericProjectId)) {
    return NextResponse.json({ error: 'Invalid projectId' }, { status: 400 })
  }
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

  const updateData: Partial<typeof architectureIntegrations.$inferInsert> = {}
  const { tool_name, track, phase, integration_group, status, integration_method, notes } = parsed.data
  if (tool_name !== undefined) updateData.tool_name = tool_name
  if (track !== undefined) updateData.track = track
  if (phase !== undefined) updateData.phase = phase
  if (integration_group !== undefined) updateData.integration_group = integration_group
  if (status !== undefined) updateData.status = status
  if (integration_method !== undefined) updateData.integration_method = integration_method
  if (notes !== undefined) updateData.notes = notes

  // Read before-state for audit
  const [before] = await db.select().from(architectureIntegrations)
    .where(and(eq(architectureIntegrations.id, numericId), eq(architectureIntegrations.project_id, numericProjectId)))
  if (!before) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const result = await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.current_project_id = ${numericProjectId}`))

      const updated = await tx
        .update(architectureIntegrations)
        .set(updateData)
        .where(
          and(
            eq(architectureIntegrations.id, numericId),
            eq(architectureIntegrations.project_id, numericProjectId)
          )
        )
        .returning()
      await tx.insert(auditLog).values({
        entity_type: 'architecture_integration',
        entity_id: numericId,
        action: 'update',
        actor_id: 'default',
        before_json: before as Record<string, unknown>,
        after_json: { ...before, ...updateData } as Record<string, unknown>,
      })
      return updated
    })

    if (result.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({ integration: result[0] })
  } catch (err) {
    console.error('PATCH /api/projects/[projectId]/architecture-integrations/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; id: string }> }
) {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;

  const { projectId, id } = await params
  const numericProjectId = parseInt(projectId, 10)
  const numericId = parseInt(id, 10)

  if (isNaN(numericProjectId)) {
    return NextResponse.json({ error: 'Invalid projectId' }, { status: 400 })
  }
  if (isNaN(numericId)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  // Read before-state for audit
  const [beforeDelete] = await db.select().from(architectureIntegrations)
    .where(and(eq(architectureIntegrations.id, numericId), eq(architectureIntegrations.project_id, numericProjectId)))

  try {
    await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.current_project_id = ${numericProjectId}`))

      if (beforeDelete) {
        await tx.insert(auditLog).values({
          entity_type: 'architecture_integration',
          entity_id: numericId,
          action: 'delete',
          actor_id: 'default',
          before_json: beforeDelete as Record<string, unknown>,
          after_json: null,
        })
      }

      await tx
        .delete(architectureIntegrations)
        .where(
          and(
            eq(architectureIntegrations.id, numericId),
            eq(architectureIntegrations.project_id, numericProjectId)
          )
        )
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/projects/[projectId]/architecture-integrations/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// app/api/projects/[projectId]/arch-nodes/reorder/route.ts
import { NextRequest } from 'next/server'
import { z } from 'zod'
import db from '@/db'
import { archNodes } from '@/db/schema'
import { eq, and, gte, gt, ne, sql } from 'drizzle-orm'
import { requireProjectRole } from '@/lib/auth-server'

const ReorderArchNodeSchema = z.object({
  nodeId: z.number().int(),
  trackId: z.number().int(),
  newDisplayOrder: z.number().int().min(1),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const resolvedParams = await params
  const projectId = parseInt(resolvedParams.projectId, 10)
  if (isNaN(projectId)) {
    return Response.json({ error: 'Invalid project ID' }, { status: 400 })
  }

  const { session, redirectResponse } = await requireProjectRole(projectId, 'user')
  if (redirectResponse) return redirectResponse

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = ReorderArchNodeSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { nodeId, trackId, newDisplayOrder } = parsed.data

  try {
    // Fetch current node
    const [node] = await db
      .select({ display_order: archNodes.display_order })
      .from(archNodes)
      .where(eq(archNodes.id, nodeId))
      .limit(1)

    if (!node) {
      return Response.json({ error: 'Node not found' }, { status: 404 })
    }

    const oldDisplayOrder = node.display_order

    // Step 1: Close gap at old position
    await db
      .update(archNodes)
      .set({ display_order: sql`${archNodes.display_order} - 1` })
      .where(
        and(
          eq(archNodes.project_id, projectId),
          eq(archNodes.track_id, trackId),
          gt(archNodes.display_order, oldDisplayOrder),
          ne(archNodes.id, nodeId)
        )
      )

    // Step 2: Open gap at new position
    await db
      .update(archNodes)
      .set({ display_order: sql`${archNodes.display_order} + 1` })
      .where(
        and(
          eq(archNodes.project_id, projectId),
          eq(archNodes.track_id, trackId),
          gte(archNodes.display_order, newDisplayOrder),
          ne(archNodes.id, nodeId)
        )
      )

    // Step 3: Place node
    await db
      .update(archNodes)
      .set({ display_order: newDisplayOrder })
      .where(eq(archNodes.id, nodeId))

    return Response.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Reorder failed'
    return Response.json({ error: message }, { status: 500 })
  }
}

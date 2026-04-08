import { NextRequest } from 'next/server'
import { z } from 'zod'
import db from '@/db'
import { wbsItems } from '@/db/schema'
import { eq, and, gte } from 'drizzle-orm'
import { requireSession } from '@/lib/auth-server'
import { sql } from 'drizzle-orm'

// ─── Validation Schema ────────────────────────────────────────────────────────

const ReorderWbsItemSchema = z.object({
  itemId: z.number().int(),
  newParentId: z.number().int(),
  newDisplayOrder: z.number().int().min(1),
})

// ─── POST /api/projects/[projectId]/wbs/reorder ───────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { session, redirectResponse } = await requireSession()
  if (redirectResponse) return redirectResponse

  const resolvedParams = await params
  const projectId = parseInt(resolvedParams.projectId, 10)
  if (isNaN(projectId)) {
    return Response.json({ error: 'Invalid project ID' }, { status: 400 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = ReorderWbsItemSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { itemId, newParentId, newDisplayOrder } = parsed.data

  try {
    // Fetch the item to check its level
    const [item] = await db
      .select({ level: wbsItems.level })
      .from(wbsItems)
      .where(eq(wbsItems.id, itemId))
      .limit(1)

    if (!item) {
      return Response.json({ error: 'Item not found' }, { status: 404 })
    }

    // Level 1 nodes cannot be reordered
    if (item.level === 1) {
      return Response.json({ error: 'Level 1 headers cannot be reordered' }, { status: 403 })
    }

    // Shift siblings at target position (those with display_order >= newDisplayOrder)
    await db
      .update(wbsItems)
      .set({ display_order: sql`${wbsItems.display_order} + 1` })
      .where(
        and(
          eq(wbsItems.project_id, projectId),
          eq(wbsItems.parent_id, newParentId),
          gte(wbsItems.display_order, newDisplayOrder)
        )
      )

    // Update the moved item's parent_id and display_order
    await db
      .update(wbsItems)
      .set({
        parent_id: newParentId,
        display_order: newDisplayOrder,
      })
      .where(eq(wbsItems.id, itemId))

    return Response.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to reorder WBS item'
    return Response.json({ error: message }, { status: 500 })
  }
}

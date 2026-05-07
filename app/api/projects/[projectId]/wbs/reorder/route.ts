import { NextRequest } from 'next/server'
import { z } from 'zod'
import db from '@/db'
import { wbsItems } from '@/db/schema'
import { eq, and, gte, isNull } from 'drizzle-orm'
import { requireProjectRole } from '@/lib/auth-server'
import { sql } from 'drizzle-orm'

// ─── Validation Schema ────────────────────────────────────────────────────────

const ReorderWbsItemSchema = z.object({
  itemId: z.number().int(),
  newParentId: z.number().int().nullable(),
  newDisplayOrder: z.number().int().min(0),
})

// ─── POST /api/projects/[projectId]/wbs/reorder ───────────────────────────────

export async function POST(
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

  const parsed = ReorderWbsItemSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { itemId, newParentId, newDisplayOrder: requestedOrder } = parsed.data

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

    // 0 means "append to end" — resolve to max sibling order + 1
    let newDisplayOrder = requestedOrder
    if (newDisplayOrder === 0) {
      const siblingCondition = newParentId === null
        ? and(eq(wbsItems.project_id, projectId), isNull(wbsItems.parent_id))
        : and(eq(wbsItems.project_id, projectId), eq(wbsItems.parent_id, newParentId))
      const [maxRow] = await db
        .select({ max: sql<number>`COALESCE(MAX(${wbsItems.display_order}), 0)` })
        .from(wbsItems)
        .where(siblingCondition)
      newDisplayOrder = (maxRow?.max ?? 0) + 1
    }

    // Shift siblings at target position (those with display_order >= newDisplayOrder)
    const shiftCondition = newParentId === null
      ? and(eq(wbsItems.project_id, projectId), isNull(wbsItems.parent_id), gte(wbsItems.display_order, newDisplayOrder))
      : and(eq(wbsItems.project_id, projectId), eq(wbsItems.parent_id, newParentId), gte(wbsItems.display_order, newDisplayOrder))

    await db
      .update(wbsItems)
      .set({ display_order: sql`${wbsItems.display_order} + 1` })
      .where(shiftCondition)

    // Recompute level from parent chain
    let newLevel = 1
    if (newParentId !== null) {
      const allItems = await db.select({ id: wbsItems.id, parent_id: wbsItems.parent_id }).from(wbsItems).where(eq(wbsItems.project_id, projectId))
      const parentMap = new Map(allItems.map(i => [i.id, i.parent_id ?? null]))
      let cur: number | null = newParentId
      while (cur !== null) { newLevel++; cur = parentMap.get(cur) ?? null }
    }

    // Update the moved item's parent_id, display_order, and level
    await db
      .update(wbsItems)
      .set({
        parent_id: newParentId,
        display_order: newDisplayOrder,
        level: newLevel,
      })
      .where(eq(wbsItems.id, itemId))

    return Response.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to reorder WBS item'
    return Response.json({ error: message }, { status: 500 })
  }
}

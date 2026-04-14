import { NextRequest } from 'next/server'
import { z } from 'zod'
import db from '@/db'
import { wbsItems } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { requireProjectRole } from '@/lib/auth-server'
import { deleteWbsSubtree } from '@/lib/queries'

// ─── Validation Schema ────────────────────────────────────────────────────────

const UpdateWbsItemSchema = z
  .object({
    name: z.string().min(1).optional(),
    status: z.enum(['not_started', 'in_progress', 'complete']).optional(),
  })
  .refine((data) => data.name !== undefined || data.status !== undefined, {
    message: 'At least one field (name or status) is required',
  })

// ─── PATCH /api/projects/[projectId]/wbs/[itemId] ─────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; itemId: string }> }
) {
  const resolvedParams = await params
  const projectId = parseInt(resolvedParams.projectId, 10)
  const itemId = parseInt(resolvedParams.itemId, 10)

  if (isNaN(projectId) || isNaN(itemId)) {
    return Response.json({ error: 'Invalid project ID or item ID' }, { status: 400 })
  }

  const { session, redirectResponse } = await requireProjectRole(projectId, 'user')
  if (redirectResponse) return redirectResponse

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = UpdateWbsItemSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { name, status } = parsed.data

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

    // Level 1 nodes cannot have their name changed
    if (item.level === 1 && name !== undefined) {
      return Response.json({ error: 'Level 1 headers are locked' }, { status: 403 })
    }

    // Build update object with only provided fields
    const updateFields: { name?: string; status?: 'not_started' | 'in_progress' | 'complete' } = {}
    if (name !== undefined) updateFields.name = name
    if (status !== undefined) updateFields.status = status

    // Perform update
    const [updatedItem] = await db
      .update(wbsItems)
      .set(updateFields)
      .where(eq(wbsItems.id, itemId))
      .returning()

    return Response.json(updatedItem)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update WBS item'
    return Response.json({ error: message }, { status: 500 })
  }
}

// ─── DELETE /api/projects/[projectId]/wbs/[itemId] ────────────────────────────

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; itemId: string }> }
) {
  const resolvedParams = await params
  const projectId = parseInt(resolvedParams.projectId, 10)
  const itemId = parseInt(resolvedParams.itemId, 10)

  if (isNaN(projectId) || isNaN(itemId)) {
    return Response.json({ error: 'Invalid project ID or item ID' }, { status: 400 })
  }

  const { session, redirectResponse } = await requireProjectRole(projectId, 'user')
  if (redirectResponse) return redirectResponse

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

    // Level 1 nodes cannot be deleted
    if (item.level === 1) {
      return Response.json({ error: 'Level 1 headers cannot be deleted' }, { status: 403 })
    }

    // Delete the item and its entire subtree
    await deleteWbsSubtree(itemId)

    return new Response(null, { status: 204 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete WBS item'
    return Response.json({ error: message }, { status: 500 })
  }
}

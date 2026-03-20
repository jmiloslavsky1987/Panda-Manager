import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '../../../db'
import { tasks } from '../../../db/schema'
import { inArray } from 'drizzle-orm'

// ─── Validation Schema ────────────────────────────────────────────────────────

const BulkUpdateSchema = z.object({
  task_ids: z.array(z.number()).min(1, 'At least one task ID required'),
  patch: z.object({
    owner: z.string().optional(),
    due: z.string().optional(),
    phase: z.string().optional(),
    status: z.string().optional(),
  }),
})

// ─── POST /api/tasks-bulk ─────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = BulkUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { task_ids, patch } = parsed.data

  // Only include fields that were actually provided
  const updateFields: Record<string, string | undefined> = {}
  if (patch.owner !== undefined) updateFields.owner = patch.owner
  if (patch.due !== undefined) updateFields.due = patch.due
  if (patch.phase !== undefined) updateFields.phase = patch.phase
  if (patch.status !== undefined) updateFields.status = patch.status

  if (Object.keys(updateFields).length === 0) {
    return Response.json({ error: 'No fields to update in patch' }, { status: 400 })
  }

  try {
    await db
      .update(tasks)
      .set(updateFields)
      .where(inArray(tasks.id, task_ids))

    return Response.json({ ok: true, count: task_ids.length })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Bulk update failed'
    return Response.json({ error: message }, { status: 500 })
  }
}

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '../../../../db'
import { actions } from '../../../../db/schema'
import { inArray } from 'drizzle-orm'
import { requireSession } from "@/lib/auth-server";

// ─── Validation Schema ────────────────────────────────────────────────────────

const BulkUpdateSchema = z.object({
  action_ids: z.array(z.number()).min(1, 'At least one action ID required'),
  patch: z.object({
    status: z.string().optional(),
    owner: z.string().optional(),
    due: z.string().optional(),
  }),
})

// ─── POST /api/actions/bulk-update ────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = BulkUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { action_ids, patch } = parsed.data

  // Only include fields that were actually provided
  const updateFields: Record<string, string | undefined> = {}
  if (patch.status !== undefined) updateFields.status = patch.status
  if (patch.owner !== undefined) updateFields.owner = patch.owner
  if (patch.due !== undefined) updateFields.due = patch.due

  if (Object.keys(updateFields).length === 0) {
    return Response.json({ error: 'No fields to update in patch' }, { status: 400 })
  }

  try {
    await db
      .update(actions)
      .set(updateFields)
      .where(inArray(actions.id, action_ids))

    return Response.json({ ok: true, count: action_ids.length })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Bulk update failed'
    return Response.json({ error: message }, { status: 500 })
  }
}

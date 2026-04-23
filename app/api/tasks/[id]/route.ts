import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '../../../../db'
import { tasks, auditLog } from '../../../../db/schema'
import { eq } from 'drizzle-orm'
import { updateWorkstreamProgress } from '../../../../lib/queries'
import { requireSession } from "@/lib/auth-server";

// ─── Validation Schema ────────────────────────────────────────────────────────

const TaskPatchSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  owner: z.string().nullable().optional(),
  owner_id: z.number().nullable().optional(),
  due: z.string().nullable().optional(),
  priority: z.string().nullable().optional(),
  type: z.string().nullable().optional(),
  phase: z.string().nullable().optional(),
  workstream_id: z.number().nullable().optional(),
  blocked_by: z.number().nullable().optional(),
  milestone_id: z.number().nullable().optional(),
  start_date: z.string().nullable().optional(),
  status: z.string().optional(),
  source: z.string().optional(),
})

type TaskPatch = z.infer<typeof TaskPatchSchema>

// ─── PATCH /api/tasks/:id ─────────────────────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;

  const { id } = await params
  const taskId = parseInt(id, 10)
  if (isNaN(taskId)) {
    return Response.json({ error: 'Invalid task ID' }, { status: 400 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = TaskPatchSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const patch: TaskPatch = parsed.data

  try {
    // Full SELECT for both 404 check and audit before_json
    const [beforeFull] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1)

    if (!beforeFull) {
      return Response.json({ error: 'Task not found' }, { status: 404 })
    }

    await db.transaction(async (tx) => {
      await tx.update(tasks).set(patch).where(eq(tasks.id, taskId))
      const [afterFull] = await tx.select().from(tasks).where(eq(tasks.id, taskId)).limit(1)
      await tx.insert(auditLog).values({
        entity_type: 'task',
        entity_id: taskId,
        action: 'update',
        actor_id: 'default',
        before_json: beforeFull as Record<string, unknown>,
        after_json: afterFull as Record<string, unknown>,
      })
    })

    // PLAN-09 progress rollup: update workstream if workstream changed or status changed
    const affectedWorkstreamId = patch.workstream_id !== undefined
      ? patch.workstream_id
      : (patch.status !== undefined ? beforeFull.workstream_id : null)

    if (affectedWorkstreamId) {
      await updateWorkstreamProgress(affectedWorkstreamId)
    }

    return Response.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Update failed'
    return Response.json({ error: message }, { status: 500 })
  }
}

// ─── DELETE /api/tasks/:id ────────────────────────────────────────────────────

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;

  const { id } = await params
  const taskId = parseInt(id, 10)
  if (isNaN(taskId)) {
    return Response.json({ error: 'Invalid task ID' }, { status: 400 })
  }

  try {
    // Full SELECT for both workstream rollup and audit before_json
    const [beforeFull] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1)

    await db.transaction(async (tx) => {
      await tx.delete(tasks).where(eq(tasks.id, taskId))
      await tx.insert(auditLog).values({
        entity_type: 'task',
        entity_id: taskId,
        action: 'delete',
        actor_id: 'default',
        before_json: beforeFull as Record<string, unknown> ?? null,
        after_json: null,
      })
    })

    // PLAN-09 progress rollup: recalculate workstream percent_complete after task deletion
    if (beforeFull?.workstream_id) {
      await updateWorkstreamProgress(beforeFull.workstream_id)
    }

    return Response.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Delete failed'
    return Response.json({ error: message }, { status: 500 })
  }
}

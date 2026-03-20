import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '../../../../db'
import { tasks } from '../../../../db/schema'
import { eq } from 'drizzle-orm'
import { updateWorkstreamProgress } from '../../../../lib/queries'

// ─── Validation Schema ────────────────────────────────────────────────────────

const TaskPatchSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  owner: z.string().optional(),
  due: z.string().optional(),
  priority: z.string().optional(),
  type: z.string().optional(),
  phase: z.string().optional(),
  workstream_id: z.number().nullable().optional(),
  blocked_by: z.number().nullable().optional(),
  milestone_id: z.number().nullable().optional(),
  start_date: z.string().optional(),
  status: z.string().optional(),
  source: z.string().optional(),
})

type TaskPatch = z.infer<typeof TaskPatchSchema>

// ─── PATCH /api/tasks/:id ─────────────────────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    // Get current task for workstream rollup
    const [existing] = await db
      .select({ workstream_id: tasks.workstream_id })
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1)

    if (!existing) {
      return Response.json({ error: 'Task not found' }, { status: 404 })
    }

    await db
      .update(tasks)
      .set(patch)
      .where(eq(tasks.id, taskId))

    // PLAN-09 progress rollup: update workstream if workstream changed or status changed
    const affectedWorkstreamId = patch.workstream_id !== undefined
      ? patch.workstream_id
      : (patch.status !== undefined ? existing.workstream_id : null)

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
  const { id } = await params
  const taskId = parseInt(id, 10)
  if (isNaN(taskId)) {
    return Response.json({ error: 'Invalid task ID' }, { status: 400 })
  }

  try {
    await db
      .delete(tasks)
      .where(eq(tasks.id, taskId))

    return Response.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Delete failed'
    return Response.json({ error: message }, { status: 500 })
  }
}

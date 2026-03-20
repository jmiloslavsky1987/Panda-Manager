import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '../../../db'
import { tasks } from '../../../db/schema'
import { eq } from 'drizzle-orm'
import { updateWorkstreamProgress } from '../../../lib/queries'

// ─── Validation Schemas ───────────────────────────────────────────────────────

const TaskCreateSchema = z.object({
  project_id: z.number(),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  owner: z.string().optional(),
  due: z.string().optional(),
  priority: z.string().optional(),
  type: z.string().optional(),
  phase: z.string().optional(),
  workstream_id: z.number().optional(),
  blocked_by: z.number().optional(),
  milestone_id: z.number().optional(),
  start_date: z.string().optional(),
  status: z.string().default('todo'),
  source: z.string().default('manual'),
})

// ─── GET /api/tasks?projectId=N ───────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const projectIdStr = searchParams.get('projectId')
  if (!projectIdStr) {
    return Response.json({ error: 'projectId query param required' }, { status: 400 })
  }

  const projectId = parseInt(projectIdStr, 10)
  if (isNaN(projectId)) {
    return Response.json({ error: 'Invalid projectId' }, { status: 400 })
  }

  try {
    const result = await db
      .select()
      .from(tasks)
      .where(eq(tasks.project_id, projectId))
      .orderBy(tasks.created_at)

    return Response.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Query failed'
    return Response.json({ error: message }, { status: 500 })
  }
}

// ─── POST /api/tasks ──────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = TaskCreateSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const {
    project_id, title, description, owner, due, priority,
    type, phase, workstream_id, blocked_by, milestone_id,
    start_date, status, source,
  } = parsed.data

  try {
    const result = await db
      .insert(tasks)
      .values({
        project_id,
        title,
        description: description ?? null,
        owner: owner ?? null,
        due: due ?? null,
        priority: priority ?? null,
        type: type ?? null,
        phase: phase ?? null,
        workstream_id: workstream_id ?? null,
        blocked_by: blocked_by ?? null,
        milestone_id: milestone_id ?? null,
        start_date: start_date ?? null,
        status,
        source: source ?? 'manual',
      })
      .returning()

    // PLAN-09 progress rollup: update workstream percent_complete after insert
    if (workstream_id) {
      await updateWorkstreamProgress(workstream_id)
    }

    return Response.json(result[0], { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Insert failed'
    return Response.json({ error: message }, { status: 500 })
  }
}

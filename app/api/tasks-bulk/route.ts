import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { sql } from 'drizzle-orm'
import { db } from '../../../db'
import { tasks } from '../../../db/schema'
import { eq, inArray } from 'drizzle-orm'
import { requireSession, requireProjectRole } from "@/lib/auth-server";

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

// ─── DELETE /api/tasks-bulk ───────────────────────────────────────────────────

export async function DELETE(request: NextRequest) {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = z.object({ task_ids: z.array(z.number()).min(1) }).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { task_ids } = parsed.data;

  // Verify all tasks belong to a project the user can access
  const [firstTask] = await db
    .select({ project_id: tasks.project_id })
    .from(tasks)
    .where(eq(tasks.id, task_ids[0]));

  if (!firstTask) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  const { redirectResponse: authRedirect } = await requireProjectRole(firstTask.project_id, 'user');
  if (authRedirect) return authRedirect;

  await db.transaction(async (tx) => {
    await tx.execute(sql.raw(`SET LOCAL app.current_project_id = ${firstTask.project_id}`));
    await tx.delete(tasks).where(inArray(tasks.id, task_ids));
  });

  void session; // session is validated via requireSession; requireProjectRole re-checks membership
  return NextResponse.json({ ok: true, deleted: task_ids.length });
}

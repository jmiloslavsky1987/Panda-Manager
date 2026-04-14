import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { e2eWorkflows, auditLog } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import { requireProjectRole } from "@/lib/auth-server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; workflowId: string }> }
) {
  const { projectId, workflowId } = await params
  const numericProjectId = parseInt(projectId, 10)
  const numericWorkflowId = parseInt(workflowId, 10)
  if (isNaN(numericProjectId) || isNaN(numericWorkflowId)) {
    return NextResponse.json({ error: 'Invalid projectId or workflowId' }, { status: 400 })
  }

  const { session, redirectResponse } = await requireProjectRole(numericProjectId, 'user');
  if (redirectResponse) return redirectResponse;

  let body: { team_name?: string; workflow_name?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}
  if (body.team_name !== undefined) updates.team_name = body.team_name
  if (body.workflow_name !== undefined) updates.workflow_name = body.workflow_name

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  // Read before-state for audit
  const [before] = await db.select().from(e2eWorkflows)
    .where(and(eq(e2eWorkflows.id, numericWorkflowId), eq(e2eWorkflows.project_id, numericProjectId)))
  if (!before) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const result = await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.current_project_id = ${numericProjectId}`))
      const updated = await tx.update(e2eWorkflows)
        .set(updates)
        .where(and(eq(e2eWorkflows.id, numericWorkflowId), eq(e2eWorkflows.project_id, numericProjectId)))
        .returning()
      await tx.insert(auditLog).values({
        entity_type: 'e2e_workflow',
        entity_id: numericWorkflowId,
        action: 'update',
        actor_id: 'default',
        before_json: before as Record<string, unknown>,
        after_json: { ...before, ...updates } as Record<string, unknown>,
      })
      return updated
    })
    if (result.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json({ workflow: result[0] })
  } catch (err) {
    console.error('PATCH /api/projects/[projectId]/e2e-workflows/[workflowId] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; workflowId: string }> }
) {
  const { projectId, workflowId } = await params
  const numericProjectId = parseInt(projectId, 10)
  const numericWorkflowId = parseInt(workflowId, 10)
  if (isNaN(numericProjectId) || isNaN(numericWorkflowId)) {
    return NextResponse.json({ error: 'Invalid projectId or workflowId' }, { status: 400 })
  }

  const { session, redirectResponse } = await requireProjectRole(numericProjectId, 'user');
  if (redirectResponse) return redirectResponse;

  // Read before-state for audit
  const [beforeDelete] = await db.select().from(e2eWorkflows)
    .where(and(eq(e2eWorkflows.id, numericWorkflowId), eq(e2eWorkflows.project_id, numericProjectId)))

  try {
    await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.current_project_id = ${numericProjectId}`))
      if (beforeDelete) {
        await tx.insert(auditLog).values({
          entity_type: 'e2e_workflow',
          entity_id: numericWorkflowId,
          action: 'delete',
          actor_id: 'default',
          before_json: beforeDelete as Record<string, unknown>,
          after_json: null,
        })
      }
      // Steps cascade-delete via FK on workflow_id
      await tx.delete(e2eWorkflows)
        .where(and(eq(e2eWorkflows.id, numericWorkflowId), eq(e2eWorkflows.project_id, numericProjectId)))
    })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/projects/[projectId]/e2e-workflows/[workflowId] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

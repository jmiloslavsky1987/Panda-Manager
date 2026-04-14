import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { workflowSteps, e2eWorkflows, auditLog } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import { requireProjectRole } from "@/lib/auth-server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; workflowId: string; stepId: string }> }
) {
  const { projectId, workflowId, stepId } = await params
  const numericProjectId = parseInt(projectId, 10)
  const numericWorkflowId = parseInt(workflowId, 10)
  const numericStepId = parseInt(stepId, 10)
  if (isNaN(numericProjectId) || isNaN(numericWorkflowId) || isNaN(numericStepId)) {
    return NextResponse.json({ error: 'Invalid projectId, workflowId, or stepId' }, { status: 400 })
  }

  const { session, redirectResponse } = await requireProjectRole(numericProjectId, 'user');
  if (redirectResponse) return redirectResponse;

  let body: { label?: string; track?: string; status?: string; position?: number }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}
  if (body.label !== undefined) updates.label = body.label
  if (body.track !== undefined) updates.track = body.track
  if (body.status !== undefined) updates.status = body.status
  if (body.position !== undefined) updates.position = body.position

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  // Read before-state for audit (outside transaction)
  const [before] = await db.select().from(workflowSteps)
    .where(and(eq(workflowSteps.id, numericStepId), eq(workflowSteps.workflow_id, numericWorkflowId)))

  try {
    const result = await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.current_project_id = ${numericProjectId}`))

      // Verify the workflow belongs to this project
      const workflow = await tx.select({ id: e2eWorkflows.id })
        .from(e2eWorkflows)
        .where(and(eq(e2eWorkflows.id, numericWorkflowId), eq(e2eWorkflows.project_id, numericProjectId)))
      if (workflow.length === 0) return null

      const updated = await tx.update(workflowSteps)
        .set(updates)
        .where(and(eq(workflowSteps.id, numericStepId), eq(workflowSteps.workflow_id, numericWorkflowId)))
        .returning()

      if (before && updated.length > 0) {
        await tx.insert(auditLog).values({
          entity_type: 'workflow_step',
          entity_id: numericStepId,
          action: 'update',
          actor_id: 'default',
          before_json: before as Record<string, unknown>,
          after_json: { ...before, ...updates } as Record<string, unknown>,
        })
      }

      return updated
    })

    if (!result) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
    }
    if (result.length === 0) {
      return NextResponse.json({ error: 'Step not found' }, { status: 404 })
    }
    return NextResponse.json({ step: result[0] })
  } catch (err) {
    console.error('PATCH /api/projects/[projectId]/e2e-workflows/[workflowId]/steps/[stepId] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; workflowId: string; stepId: string }> }
) {
  const { projectId, workflowId, stepId } = await params
  const numericProjectId = parseInt(projectId, 10)
  const numericWorkflowId = parseInt(workflowId, 10)
  const numericStepId = parseInt(stepId, 10)
  if (isNaN(numericProjectId) || isNaN(numericWorkflowId) || isNaN(numericStepId)) {
    return NextResponse.json({ error: 'Invalid projectId, workflowId, or stepId' }, { status: 400 })
  }

  const { session, redirectResponse } = await requireProjectRole(numericProjectId, 'user');
  if (redirectResponse) return redirectResponse;

  // Read before-state for audit (outside transaction)
  const [beforeDelete] = await db.select().from(workflowSteps)
    .where(and(eq(workflowSteps.id, numericStepId), eq(workflowSteps.workflow_id, numericWorkflowId)))

  try {
    await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.current_project_id = ${numericProjectId}`))

      // Verify the workflow belongs to this project
      const workflow = await tx.select({ id: e2eWorkflows.id })
        .from(e2eWorkflows)
        .where(and(eq(e2eWorkflows.id, numericWorkflowId), eq(e2eWorkflows.project_id, numericProjectId)))
      if (workflow.length === 0) return

      if (beforeDelete) {
        await tx.insert(auditLog).values({
          entity_type: 'workflow_step',
          entity_id: numericStepId,
          action: 'delete',
          actor_id: 'default',
          before_json: beforeDelete as Record<string, unknown>,
          after_json: null,
        })
      }

      await tx.delete(workflowSteps)
        .where(and(eq(workflowSteps.id, numericStepId), eq(workflowSteps.workflow_id, numericWorkflowId)))
    })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/projects/[projectId]/e2e-workflows/[workflowId]/steps/[stepId] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

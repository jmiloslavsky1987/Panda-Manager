import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { workflowSteps, e2eWorkflows } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import { requireProjectRole } from "@/lib/auth-server";

export async function POST(
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

  let body: { label?: string; track?: string; status?: string; position?: number }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.label) {
    return NextResponse.json({ error: 'label is required' }, { status: 400 })
  }

  try {
    const result = await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.current_project_id = ${numericProjectId}`))

      // Verify the workflow belongs to this project
      const workflow = await tx.select({ id: e2eWorkflows.id })
        .from(e2eWorkflows)
        .where(and(eq(e2eWorkflows.id, numericWorkflowId), eq(e2eWorkflows.project_id, numericProjectId)))
      if (workflow.length === 0) {
        return null
      }

      return tx.insert(workflowSteps).values({
        workflow_id: numericWorkflowId,
        label: body.label!,
        track: body.track ?? null,
        status: body.status ?? null,
        position: body.position ?? 0,
      }).returning()
    })

    if (!result) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
    }
    return NextResponse.json({ step: result[0] }, { status: 201 })
  } catch (err) {
    console.error('POST /api/projects/[projectId]/e2e-workflows/[workflowId]/steps error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

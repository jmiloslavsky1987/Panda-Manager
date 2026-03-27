import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { e2eWorkflows, workflowSteps } from '@/db/schema'
import { eq, asc } from 'drizzle-orm'
import { sql } from 'drizzle-orm'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params
  const numericId = parseInt(projectId, 10)
  if (isNaN(numericId)) {
    return NextResponse.json({ error: 'Invalid projectId' }, { status: 400 })
  }

  try {
    const result = await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.current_project_id = ${numericId}`))

      const workflows = await tx.select().from(e2eWorkflows).where(eq(e2eWorkflows.project_id, numericId))
      const steps = await tx.select().from(workflowSteps)
        .innerJoin(e2eWorkflows, eq(workflowSteps.workflow_id, e2eWorkflows.id))
        .where(eq(e2eWorkflows.project_id, numericId))
        .orderBy(asc(workflowSteps.position))

      const stepsMap = new Map<number, typeof workflowSteps.$inferSelect[]>()
      for (const row of steps) {
        const wfId = row.workflow_steps.workflow_id
        if (!stepsMap.has(wfId)) stepsMap.set(wfId, [])
        stepsMap.get(wfId)!.push(row.workflow_steps)
      }

      return workflows.map(wf => ({ ...wf, steps: stepsMap.get(wf.id) ?? [] }))
    })
    return NextResponse.json({ workflows: result })
  } catch (err) {
    console.error('GET /api/projects/[projectId]/e2e-workflows error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params
  const numericId = parseInt(projectId, 10)
  if (isNaN(numericId)) {
    return NextResponse.json({ error: 'Invalid projectId' }, { status: 400 })
  }

  let body: { team_name?: string; workflow_name?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.team_name || !body.workflow_name) {
    return NextResponse.json({ error: 'team_name and workflow_name are required' }, { status: 400 })
  }

  try {
    const result = await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.current_project_id = ${numericId}`))
      return tx.insert(e2eWorkflows).values({
        project_id: numericId,
        team_name: body.team_name!,
        workflow_name: body.workflow_name!,
      }).returning()
    })
    return NextResponse.json({ workflow: { ...result[0], steps: [] } }, { status: 201 })
  } catch (err) {
    console.error('POST /api/projects/[projectId]/e2e-workflows error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

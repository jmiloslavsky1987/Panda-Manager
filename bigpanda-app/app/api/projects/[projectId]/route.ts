import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { projects } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params
  const numericId = parseInt(projectId, 10)
  if (isNaN(numericId)) {
    return NextResponse.json({ error: 'Invalid projectId' }, { status: 400 })
  }

  const rows = await db
    .select({
      id: projects.id,
      name: projects.name,
      customer: projects.customer,
      status_summary: projects.status_summary,
      go_live_target: projects.go_live_target,
    })
    .from(projects)
    .where(eq(projects.id, numericId))
    .limit(1)

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  return NextResponse.json({ project: rows[0] })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params
  const numericId = parseInt(projectId, 10)
  if (isNaN(numericId)) {
    return NextResponse.json({ error: 'Invalid projectId' }, { status: 400 })
  }

  const body = await req.json()
  const { status } = body

  const updated = await db
    .update(projects)
    .set({ status, updated_at: new Date() })
    .where(eq(projects.id, numericId))
    .returning({ id: projects.id })

  if (updated.length === 0) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}

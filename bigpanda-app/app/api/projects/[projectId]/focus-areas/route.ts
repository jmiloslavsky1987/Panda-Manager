import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { focusAreas } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import { requireProjectRole } from "@/lib/auth-server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params
  const numericId = parseInt(projectId, 10)
  if (isNaN(numericId)) {
    return NextResponse.json({ error: 'Invalid projectId' }, { status: 400 })
  }

  const { session, redirectResponse } = await requireProjectRole(numericId, 'user');
  if (redirectResponse) return redirectResponse;

  try {
    const result = await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.current_project_id = ${numericId}`))
      return tx.select().from(focusAreas).where(eq(focusAreas.project_id, numericId))
    })
    return NextResponse.json({ focusAreas: result })
  } catch (err) {
    console.error('GET /api/projects/[projectId]/focus-areas error:', err)
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

  const { session, redirectResponse } = await requireProjectRole(numericId, 'user');
  if (redirectResponse) return redirectResponse;

  let body: {
    title?: string
    tracks?: string
    why_it_matters?: string
    current_status?: string
    next_step?: string
    bp_owner?: string
    customer_owner?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.title) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 })
  }

  try {
    const result = await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.current_project_id = ${numericId}`))
      return tx.insert(focusAreas).values({
        project_id: numericId,
        title: body.title!,
        tracks: body.tracks ?? null,
        why_it_matters: body.why_it_matters ?? null,
        current_status: body.current_status ?? null,
        next_step: body.next_step ?? null,
        bp_owner: body.bp_owner ?? null,
        customer_owner: body.customer_owner ?? null,
      }).returning()
    })
    return NextResponse.json({ focusArea: result[0] }, { status: 201 })
  } catch (err) {
    console.error('POST /api/projects/[projectId]/focus-areas error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

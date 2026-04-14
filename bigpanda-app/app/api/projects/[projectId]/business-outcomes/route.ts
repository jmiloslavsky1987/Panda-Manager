import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { businessOutcomes } from '@/db/schema'
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
      return tx.select().from(businessOutcomes).where(eq(businessOutcomes.project_id, numericId))
    })
    return NextResponse.json({ outcomes: result })
  } catch (err) {
    console.error('GET /api/projects/[projectId]/business-outcomes error:', err)
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
    track?: string
    description?: string
    delivery_status?: string
    mapping_note?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.title || !body.track) {
    return NextResponse.json({ error: 'title and track are required' }, { status: 400 })
  }

  try {
    const result = await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.current_project_id = ${numericId}`))
      return tx.insert(businessOutcomes).values({
        project_id: numericId,
        title: body.title!,
        track: body.track!,
        description: body.description ?? null,
        delivery_status: (body.delivery_status as 'live' | 'in_progress' | 'blocked' | 'planned') ?? 'planned',
        mapping_note: body.mapping_note ?? null,
      }).returning()
    })
    return NextResponse.json({ outcome: result[0] }, { status: 201 })
  } catch (err) {
    console.error('POST /api/projects/[projectId]/business-outcomes error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { teamPathways } from '@/db/schema'
import { eq, asc } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import { z } from 'zod'
import { requireSession } from "@/lib/auth-server"

const postSchema = z.object({
  team_name:   z.string().min(1),
  route_steps: z.array(z.object({ label: z.string() })),
  status:      z.enum(['live', 'in_progress', 'pilot', 'planned']).optional(),
  notes:       z.string().optional(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;

  const { projectId } = await params
  const numericId = parseInt(projectId, 10)
  if (isNaN(numericId)) {
    return NextResponse.json({ error: 'Invalid projectId' }, { status: 400 })
  }

  try {
    const result = await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.current_project_id = ${numericId}`))
      return tx
        .select()
        .from(teamPathways)
        .where(eq(teamPathways.project_id, numericId))
        .orderBy(asc(teamPathways.team_name))
    })
    return NextResponse.json({ pathways: result })
  } catch (err) {
    console.error('GET /api/projects/[projectId]/team-pathways error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;

  const { projectId } = await params
  const numericId = parseInt(projectId, 10)
  if (isNaN(numericId)) {
    return NextResponse.json({ error: 'Invalid projectId' }, { status: 400 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = postSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { team_name, route_steps, status, notes } = parsed.data

  try {
    const result = await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.current_project_id = ${numericId}`))
      return tx
        .insert(teamPathways)
        .values({
          project_id:  numericId,
          team_name,
          route_steps: route_steps as unknown as typeof teamPathways.$inferInsert['route_steps'],
          status:      status ?? 'planned',
          notes:       notes ?? null,
          source:      'manual',
        })
        .returning()
    })
    return NextResponse.json({ pathway: result[0] }, { status: 201 })
  } catch (err) {
    console.error('POST /api/projects/[projectId]/team-pathways error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

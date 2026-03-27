import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { architectureIntegrations } from '@/db/schema'
import { eq, asc } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import { z } from 'zod'

const postSchema = z.object({
  tool_name: z.string().min(1),
  track: z.string().min(1),
  phase: z.string().optional(),
  status: z.enum(['live', 'in_progress', 'pilot', 'planned']).optional(),
  integration_method: z.string().optional(),
  notes: z.string().optional(),
})

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

      return tx
        .select()
        .from(architectureIntegrations)
        .where(eq(architectureIntegrations.project_id, numericId))
        .orderBy(asc(architectureIntegrations.phase), asc(architectureIntegrations.tool_name))
    })

    return NextResponse.json({ integrations: result })
  } catch (err) {
    console.error('GET /api/projects/[projectId]/architecture-integrations error:', err)
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

  const { tool_name, track, phase, status, integration_method, notes } = parsed.data

  try {
    const result = await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.current_project_id = ${numericId}`))

      return tx
        .insert(architectureIntegrations)
        .values({
          project_id: numericId,
          tool_name,
          track,
          phase: phase ?? null,
          status: status ?? 'planned',
          integration_method: integration_method ?? null,
          notes: notes ?? null,
          source: 'manual',
        })
        .returning()
    })

    return NextResponse.json({ integration: result[0] }, { status: 201 })
  } catch (err) {
    console.error('POST /api/projects/[projectId]/architecture-integrations error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

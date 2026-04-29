// app/api/projects/[projectId]/arch-nodes/route.ts
import { NextRequest } from 'next/server'
import { z } from 'zod'
import db from '@/db'
import { archNodes, archTracks } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { requireProjectRole } from '@/lib/auth-server'

const CreateArchNodeSchema = z.object({
  name: z.string().min(1).max(200),
  track_id: z.number().int().positive(),
  status: z.enum(['planned', 'in_progress', 'live']).optional().default('planned'),
  notes: z.string().optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const resolvedParams = await params
  const projectId = parseInt(resolvedParams.projectId, 10)

  if (isNaN(projectId)) {
    return Response.json({ error: 'Invalid project ID' }, { status: 400 })
  }

  const { session, redirectResponse } = await requireProjectRole(projectId, 'user')
  if (redirectResponse) return redirectResponse

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = CreateArchNodeSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { name, track_id, status, notes } = parsed.data

  try {
    // Security: verify track_id belongs to this project (prevents cross-project node creation)
    const [track] = await db
      .select({ id: archTracks.id })
      .from(archTracks)
      .where(and(eq(archTracks.id, track_id), eq(archTracks.project_id, projectId)))
      .limit(1)

    if (!track) {
      return Response.json({ error: 'Track not found for this project' }, { status: 404 })
    }

    const [newNode] = await db
      .insert(archNodes)
      .values({
        project_id: projectId,
        track_id,
        name,
        status,
        notes: notes ?? null,
        display_order: 0,
        source_trace: 'chat',
      })
      .returning()

    return Response.json(newNode, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Create failed'
    return Response.json({ error: message }, { status: 500 })
  }
}

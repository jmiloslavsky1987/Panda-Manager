import { NextRequest } from 'next/server'
import { z } from 'zod'
import db from '@/db'
import { wbsItems } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { requireProjectRole } from '@/lib/auth-server'
import { sql } from 'drizzle-orm'

// ─── Validation Schema ────────────────────────────────────────────────────────

const CreateWbsItemSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  parent_id: z.number().int(),
  level: z.number().int().min(2).max(3, 'Level must be 2 or 3'),
  track: z.enum(['ADR', 'Biggy']),
})

// ─── POST /api/projects/[projectId]/wbs ───────────────────────────────────────

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

  const parsed = CreateWbsItemSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { name, parent_id, level, track } = parsed.data

  try {
    // Get max display_order for siblings at this parent
    const [maxOrder] = await db
      .select({ max: sql<number>`COALESCE(MAX(${wbsItems.display_order}), 0)` })
      .from(wbsItems)
      .where(and(eq(wbsItems.project_id, projectId), eq(wbsItems.parent_id, parent_id)))

    const newDisplayOrder = (maxOrder?.max ?? 0) + 1

    // Insert the new item
    const [newItem] = await db
      .insert(wbsItems)
      .values({
        project_id: projectId,
        name,
        parent_id,
        level,
        track,
        display_order: newDisplayOrder,
        status: 'not_started',
      })
      .returning()

    return Response.json(newItem, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create WBS item'
    return Response.json({ error: message }, { status: 500 })
  }
}

// ─── GET /api/projects/[projectId]/wbs ────────────────────────────────────────

export async function GET(
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

  const url = new URL(request.url)
  const track = url.searchParams.get('track')

  if (!track) {
    return Response.json({ error: 'Track parameter is required' }, { status: 400 })
  }

  try {
    const items = await db
      .select()
      .from(wbsItems)
      .where(and(eq(wbsItems.project_id, projectId), eq(wbsItems.track, track)))
      .orderBy(wbsItems.level, wbsItems.display_order)

    return Response.json(items)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch WBS items'
    return Response.json({ error: message }, { status: 500 })
  }
}

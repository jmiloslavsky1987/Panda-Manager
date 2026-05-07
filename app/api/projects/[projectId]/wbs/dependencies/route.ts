import { NextRequest } from 'next/server'
import { z } from 'zod'
import db from '@/db'
import { wbsDependencies } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { requireProjectRole } from '@/lib/auth-server'

const CreateDepSchema = z.object({
  from_item_id: z.number().int(),
  to_item_id: z.number().int(),
  dependency_type: z.enum(['FS', 'SS']),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const resolvedParams = await params
  const projectId = parseInt(resolvedParams.projectId, 10)
  if (isNaN(projectId)) return Response.json({ error: 'Invalid project ID' }, { status: 400 })

  const { redirectResponse } = await requireProjectRole(projectId, 'user')
  if (redirectResponse) return redirectResponse

  try {
    const deps = await db.select().from(wbsDependencies).where(eq(wbsDependencies.project_id, projectId))
    return Response.json(deps)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch dependencies'
    return Response.json({ error: message }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const resolvedParams = await params
  const projectId = parseInt(resolvedParams.projectId, 10)
  if (isNaN(projectId)) return Response.json({ error: 'Invalid project ID' }, { status: 400 })

  const { redirectResponse } = await requireProjectRole(projectId, 'user')
  if (redirectResponse) return redirectResponse

  let body: unknown
  try { body = await request.json() }
  catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const parsed = CreateDepSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 })

  const { from_item_id, to_item_id, dependency_type } = parsed.data

  try {
    const [dep] = await db
      .insert(wbsDependencies)
      .values({ project_id: projectId, from_item_id, to_item_id, dependency_type })
      .onConflictDoNothing()
      .returning()

    // If duplicate (onConflictDoNothing returned nothing), fetch the existing dep
    if (!dep) {
      const [existing] = await db
        .select()
        .from(wbsDependencies)
        .where(and(eq(wbsDependencies.from_item_id, from_item_id), eq(wbsDependencies.to_item_id, to_item_id)))
      return Response.json(existing ?? {}, { status: 201 })
    }
    return Response.json(dep, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create dependency'
    return Response.json({ error: message }, { status: 500 })
  }
}

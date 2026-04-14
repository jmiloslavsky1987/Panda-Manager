// app/api/projects/[projectId]/arch-nodes/[nodeId]/route.ts
import { NextRequest } from 'next/server'
import { z } from 'zod'
import db from '@/db'
import { archNodes } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { requireProjectRole } from '@/lib/auth-server'

const UpdateArchNodeSchema = z.object({
  status: z.enum(['planned', 'in_progress', 'live']),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; nodeId: string }> }
) {
  const resolvedParams = await params
  const projectId = parseInt(resolvedParams.projectId, 10)
  const nodeId = parseInt(resolvedParams.nodeId, 10)

  if (isNaN(projectId)) {
    return Response.json({ error: 'Invalid project ID' }, { status: 400 })
  }

  const { session, redirectResponse } = await requireProjectRole(projectId, 'user')
  if (redirectResponse) return redirectResponse

  if (isNaN(nodeId)) {
    return Response.json({ error: 'Invalid node ID' }, { status: 400 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = UpdateArchNodeSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { status } = parsed.data

  try {
    // Check if node exists
    const [existingNode] = await db
      .select({ id: archNodes.id })
      .from(archNodes)
      .where(eq(archNodes.id, nodeId))
      .limit(1)

    if (!existingNode) {
      return Response.json({ error: 'Node not found' }, { status: 404 })
    }

    // Update status
    await db
      .update(archNodes)
      .set({ status })
      .where(eq(archNodes.id, nodeId))

    return Response.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Update failed'
    return Response.json({ error: message }, { status: 500 })
  }
}

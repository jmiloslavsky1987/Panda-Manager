import { NextRequest } from 'next/server'
import db from '@/db'
import { wbsDependencies } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { requireProjectRole } from '@/lib/auth-server'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; depId: string }> }
) {
  const resolvedParams = await params
  const projectId = parseInt(resolvedParams.projectId, 10)
  const depId = parseInt(resolvedParams.depId, 10)

  if (isNaN(projectId) || isNaN(depId)) {
    return Response.json({ error: 'Invalid project ID or dep ID' }, { status: 400 })
  }

  const { redirectResponse } = await requireProjectRole(projectId, 'user')
  if (redirectResponse) return redirectResponse

  try {
    const [dep] = await db
      .select({ id: wbsDependencies.id, project_id: wbsDependencies.project_id })
      .from(wbsDependencies)
      .where(eq(wbsDependencies.id, depId))
      .limit(1)

    if (!dep) return Response.json({ error: 'Dependency not found' }, { status: 404 })

    if (dep.project_id !== projectId) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    await db.delete(wbsDependencies).where(eq(wbsDependencies.id, depId))

    return new Response(null, { status: 204 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete dependency'
    return Response.json({ error: message }, { status: 500 })
  }
}

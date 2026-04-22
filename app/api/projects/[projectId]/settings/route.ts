import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/db'
import { projects } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { requireProjectRole } from '@/lib/auth-server'

const patchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().nullable().optional(),
  go_live_target: z.string().nullable().optional(),
  active_tracks: z.object({
    adr: z.boolean(),
    biggy: z.boolean(),
  }).optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId: rawId } = await params
  const projectId = parseInt(rawId, 10)
  if (isNaN(projectId)) return NextResponse.json({ error: 'Invalid projectId' }, { status: 400 })

  const { redirectResponse } = await requireProjectRole(projectId, 'admin')
  if (redirectResponse) return redirectResponse

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const patch = parsed.data
  const [updated] = await db.update(projects)
    .set({ ...patch, updated_at: new Date() })
    .where(eq(projects.id, projectId))
    .returning()

  if (!updated) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  return NextResponse.json({ ok: true, project: updated })
}

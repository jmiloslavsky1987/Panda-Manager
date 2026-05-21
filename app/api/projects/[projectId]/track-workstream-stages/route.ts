import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { trackWorkstreamStages } from '@/db/schema'
import { eq, asc } from 'drizzle-orm'
import { requireProjectRole } from '@/lib/auth-server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params
  const numericId = parseInt(projectId, 10)
  if (isNaN(numericId)) {
    return NextResponse.json({ error: 'Invalid projectId' }, { status: 400 })
  }

  const { redirectResponse } = await requireProjectRole(numericId, 'user')
  if (redirectResponse) return redirectResponse

  try {
    const rows = await db
      .select({
        id: trackWorkstreamStages.id,
        track: trackWorkstreamStages.track,
        stage_key: trackWorkstreamStages.stage_key,
        stage_label: trackWorkstreamStages.stage_label,
        display_order: trackWorkstreamStages.display_order,
        source: trackWorkstreamStages.source,
      })
      .from(trackWorkstreamStages)
      .where(eq(trackWorkstreamStages.project_id, numericId))
      .orderBy(asc(trackWorkstreamStages.track), asc(trackWorkstreamStages.display_order))

    return NextResponse.json({ rows })
  } catch (err) {
    console.error('GET /api/projects/[projectId]/track-workstream-stages error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

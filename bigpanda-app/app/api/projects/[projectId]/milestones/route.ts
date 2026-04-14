import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { milestones } from '@/db/schema'
import { eq, asc } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
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

  const { session, redirectResponse } = await requireProjectRole(numericId, 'user');
  if (redirectResponse) return redirectResponse;

  try {
    const result = await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.current_project_id = ${numericId}`))
      return tx
        .select()
        .from(milestones)
        .where(eq(milestones.project_id, numericId))
        .orderBy(asc(milestones.target))
    })

    return NextResponse.json({ milestones: result })
  } catch (err) {
    console.error('GET /api/projects/[projectId]/milestones error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

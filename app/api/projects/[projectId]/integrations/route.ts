import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { integrations } from '@/db/schema'
import { eq, asc } from 'drizzle-orm'
import { sql } from 'drizzle-orm'

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
        .from(integrations)
        .where(eq(integrations.project_id, numericId))
        .orderBy(asc(integrations.display_order))
    })

    return NextResponse.json({ integrations: result })
  } catch (err) {
    console.error('GET /api/projects/[projectId]/integrations error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

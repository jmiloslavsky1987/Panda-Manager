import { NextRequest, NextResponse } from 'next/server'
import { and, eq, gte, lte, desc } from 'drizzle-orm'
import db from '@/db'
import { timeEntries, projects } from '@/db/schema'
import { requireSession } from '@/lib/auth-server'

export async function GET(req: NextRequest) {
  const { session, redirectResponse } = await requireSession()
  if (redirectResponse) return redirectResponse

  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('project_id')
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  // Build conditions - always filter by current user
  const conditions = [eq(timeEntries.user_id, session.user.id)]

  if (projectId) {
    conditions.push(eq(timeEntries.project_id, parseInt(projectId, 10)))
  }
  if (from) {
    conditions.push(gte(timeEntries.date, from))
  }
  if (to) {
    conditions.push(lte(timeEntries.date, to))
  }

  try {
    // Cross-project query with LEFT JOIN to include project name
    // No RLS on time_entries - no SET LOCAL needed
    const rows = await db
      .select({
        id: timeEntries.id,
        project_id: timeEntries.project_id,
        user_id: timeEntries.user_id,
        date: timeEntries.date,
        hours: timeEntries.hours,
        description: timeEntries.description,
        created_at: timeEntries.created_at,
        updated_at: timeEntries.updated_at,
        submitted_on: timeEntries.submitted_on,
        submitted_by: timeEntries.submitted_by,
        approved_on: timeEntries.approved_on,
        approved_by: timeEntries.approved_by,
        rejected_on: timeEntries.rejected_on,
        rejected_by: timeEntries.rejected_by,
        locked: timeEntries.locked,
        project_name: projects.customer,
      })
      .from(timeEntries)
      .leftJoin(projects, eq(timeEntries.project_id, projects.id))
      .where(and(...conditions))
      .orderBy(desc(timeEntries.date))

    return NextResponse.json({ entries: rows })
  } catch (err) {
    console.error('GET /api/time-entries error:', err)
    return NextResponse.json(
      { error: 'Failed to load time entries' },
      { status: 500 }
    )
  }
}

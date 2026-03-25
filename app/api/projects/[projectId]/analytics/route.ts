import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import db from '@/db'
import { timeEntries, projects } from '@/db/schema'

interface WeekRollupRow extends Record<string, unknown> {
  week_start: string
  total_hours: string | number
}

interface TotalHoursRow extends Record<string, unknown> {
  total_hours: string | number | null
}

function formatWeekLabel(weekStartISO: string): string {
  const start = new Date(weekStartISO + 'T00:00:00Z')
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
  return `${fmt(start)}–${fmt(end)}`
}

/**
 * Monday-snap a date to the start of its ISO week (Monday).
 * Returns a YYYY-MM-DD string in UTC.
 */
function getMondayISO(d: Date): string {
  const day = d.getUTCDay() // 0=Sun, 1=Mon...6=Sat
  const diff = (day === 0 ? -6 : 1 - day)
  const monday = new Date(d)
  monday.setUTCDate(d.getUTCDate() + diff)
  return monday.toISOString().slice(0, 10)
}

/**
 * Generate the last N ISO week start dates (Monday), newest first reversed to oldest first.
 * Returns YYYY-MM-DD strings.
 */
function generateWeekStarts(n: number): string[] {
  const today = new Date()
  const currentMonday = getMondayISO(today)
  const weeks: string[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(currentMonday + 'T00:00:00Z')
    d.setUTCDate(d.getUTCDate() - i * 7)
    weeks.push(d.toISOString().slice(0, 10))
  }
  return weeks
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params
  const numericId = parseInt(projectId, 10)

  if (isNaN(numericId)) {
    return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 })
  }

  try {
    const result = await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.current_project_id = ${numericId}`))

      // 8-week rollup from time_entries (hours is TEXT — must cast)
      const rollupRows = await tx.execute<WeekRollupRow>(sql`
        SELECT date_trunc('week', date::date)::text AS week_start,
               SUM(hours::numeric)::numeric AS total_hours
        FROM time_entries
        WHERE project_id = ${numericId}
          AND date::date >= CURRENT_DATE - INTERVAL '8 weeks'
        GROUP BY week_start
        ORDER BY week_start ASC
      `)

      // Fetch weekly_hour_target from projects table
      const [project] = await tx
        .select({ weekly_hour_target: projects.weekly_hour_target })
        .from(projects)
        .where(eq(projects.id, numericId))

      const weeklyTarget = project?.weekly_hour_target != null
        ? parseFloat(String(project.weekly_hour_target))
        : null

      // Get current ISO week start (Monday)
      const currentWeekStart = getMondayISO(new Date())
      const nextWeekStart = new Date(currentWeekStart + 'T00:00:00Z')
      nextWeekStart.setUTCDate(nextWeekStart.getUTCDate() + 7)

      // Current week total hours
      const thisWeekRows = await tx.execute<TotalHoursRow>(sql`
        SELECT SUM(hours::numeric)::numeric AS total_hours
        FROM time_entries
        WHERE project_id = ${numericId}
          AND date::date >= ${currentWeekStart}::date
          AND date::date < ${nextWeekStart.toISOString().slice(0, 10)}::date
      `)
      const firstThisWeek = Array.from(thisWeekRows)[0]
      const totalHoursThisWeek = firstThisWeek?.total_hours != null
        ? parseFloat(String(firstThisWeek.total_hours))
        : 0

      // Build lookup map from SQL results (week_start -> hours)
      const rowMap = new Map<string, number>()
      for (const row of rollupRows) {
        // Normalize week_start — postgres date_trunc returns full timestamp string
        const weekKey = String(row.week_start).slice(0, 10)
        rowMap.set(weekKey, parseFloat(String(row.total_hours)))
      }

      // Fill 8 week slots, oldest first
      const weekStarts = generateWeekStarts(8)
      const weeklyRollup = weekStarts.map((ws) => {
        const hours = rowMap.get(ws) ?? 0
        const variance = weeklyTarget != null ? hours - weeklyTarget : null
        return {
          weekLabel: formatWeekLabel(ws),
          hours,
          variance,
        }
      })

      return { weeklyRollup, weeklyTarget, totalHoursThisWeek }
    })

    return NextResponse.json(result)
  } catch (err) {
    console.error('GET analytics error:', err)
    return NextResponse.json({ error: 'Failed to load analytics' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params
  const numericId = parseInt(projectId, 10)

  if (isNaN(numericId)) {
    return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 })
  }

  let body: { weekly_hour_target?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const value = body.weekly_hour_target

  // Validate: must be positive number or null
  if (value !== null && value !== undefined) {
    const num = typeof value === 'number' ? value : parseFloat(String(value))
    if (isNaN(num) || num <= 0) {
      return NextResponse.json(
        { error: 'weekly_hour_target must be a positive number or null' },
        { status: 400 }
      )
    }

    try {
      await db
        .update(projects)
        .set({ weekly_hour_target: String(num) })
        .where(eq(projects.id, numericId))

      return NextResponse.json({ success: true, weekly_hour_target: num })
    } catch (err) {
      console.error('PATCH analytics error:', err)
      return NextResponse.json({ error: 'Failed to update target' }, { status: 500 })
    }
  }

  // value is null — clear the target
  try {
    await db
      .update(projects)
      .set({ weekly_hour_target: null })
      .where(eq(projects.id, numericId))

    return NextResponse.json({ success: true, weekly_hour_target: null })
  } catch (err) {
    console.error('PATCH analytics (null) error:', err)
    return NextResponse.json({ error: 'Failed to clear target' }, { status: 500 })
  }
}

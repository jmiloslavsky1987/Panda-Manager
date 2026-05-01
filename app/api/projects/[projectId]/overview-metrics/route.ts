import { NextRequest, NextResponse } from 'next/server'
import { count, eq, sql, and, isNull, or, inArray } from 'drizzle-orm'
import db from '@/db'
import { onboardingSteps, onboardingPhases, risks, integrations, teamOnboardingStatus, milestones, projects, timeEntries, tasks } from '@/db/schema'
import { requireProjectRole } from '@/lib/auth-server'

// --- Helper functions (copied from analytics/route.ts) ---

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

  const { session, redirectResponse } = await requireProjectRole(numericId, 'user')
  if (redirectResponse) return redirectResponse

  try {
    const result = await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.current_project_id = ${numericId}`))

      // 1. stepCounts: only count steps from the standard phases shown in the header rings.
      // ADR: Discovery & Kickoff, Platform Configuration, UAT
      // Biggy: Discovery & Kickoff, Platform Configuration, Validation
      const COUNTED_PHASES = [
        'Discovery & Kickoff',
        'Platform Configuration',
        'UAT',
        'Validation',
      ]
      const stepCountsRaw = await tx
        .select({
          track: onboardingSteps.track,
          status: onboardingSteps.status,
          count: count(),
        })
        .from(onboardingSteps)
        .innerJoin(onboardingPhases, eq(onboardingSteps.phase_id, onboardingPhases.id))
        .where(and(
          eq(onboardingSteps.project_id, numericId),
          inArray(onboardingPhases.name, COUNTED_PHASES),
        ))
        .groupBy(onboardingSteps.track, onboardingSteps.status)

      const stepCounts = stepCountsRaw.map(row => ({
        track: row.track || '',
        status: row.status,
        count: Number(row.count),
      }))

      // 2. riskCounts: count open risks per severity (exclude mitigated/resolved/accepted)
      const riskCountsRaw = await tx
        .select({
          severity: risks.severity,
          count: count(),
        })
        .from(risks)
        .where(and(eq(risks.project_id, numericId), or(eq(risks.status, 'open'), isNull(risks.status))))
        .groupBy(risks.severity)

      const riskCounts = riskCountsRaw.map(row => ({
        severity: row.severity || '',
        count: Number(row.count),
      }))

      // 3. integrationCounts: count integrations per status (for pie/summary)
      const integrationCountsRaw = await tx
        .select({
          status: integrations.status,
          count: count(),
        })
        .from(integrations)
        .where(eq(integrations.project_id, numericId))
        .groupBy(integrations.status)

      const integrationCounts = integrationCountsRaw.map(row => ({
        status: row.status,
        count: Number(row.count),
      }))

      // 3b. integrationTrackCounts: per-track totals for progress rings
      const integrationTrackCountsRaw = await tx
        .select({
          track: integrations.track,
          status: integrations.status,
          count: count(),
        })
        .from(integrations)
        .where(and(eq(integrations.project_id, numericId), sql`${integrations.track} IS NOT NULL`))
        .groupBy(integrations.track, integrations.status)

      const integrationTrackCounts = integrationTrackCountsRaw
        .filter(r => r.track != null)
        .map(row => ({
          track: row.track as string,
          status: row.status,
          count: Number(row.count),
        }))

      // 3c. teamCounts: per-track team totals for progress rings
      const teamCountsRaw = await tx
        .select({
          track: teamOnboardingStatus.track,
          status: teamOnboardingStatus.status,
          count: count(),
        })
        .from(teamOnboardingStatus)
        .where(eq(teamOnboardingStatus.project_id, numericId))
        .groupBy(teamOnboardingStatus.track, teamOnboardingStatus.status)

      const teamCounts = teamCountsRaw
        .filter(r => r.track != null)
        .map(row => ({
          track: row.track as string,
          status: row.status,
          count: Number(row.count),
        }))

      // 4. milestoneOnTrack: count milestones per status
      const milestoneOnTrackRaw = await tx
        .select({
          status: milestones.status,
          count: count(),
        })
        .from(milestones)
        .where(eq(milestones.project_id, numericId))
        .groupBy(milestones.status)

      const milestoneOnTrack = milestoneOnTrackRaw.map(row => ({
        status: row.status || '',
        count: Number(row.count),
      }))

      // 5. weeklyRollup: 8-week hours rollup from time_entries
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

      // 6. blockedTasks: tasks with status='blocked' for this project
      const blockedTasksRows = await tx
        .select({ id: tasks.id, title: tasks.title })
        .from(tasks)
        .where(and(eq(tasks.project_id, numericId), eq(tasks.status, 'blocked')))

      // 7. overdueMilestones: count milestones with parseable ISO date < today and status != 'completed'
      const overdueMilestonesRows = await tx.execute<{ count: string | number }>(sql`
        SELECT COUNT(*) as count
        FROM milestones
        WHERE project_id = ${numericId}
          AND (status IS NULL OR (status != 'complete' AND status != 'missed'))
          AND date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
          AND date::date < CURRENT_DATE
      `)
      const overdueMilestones = Number(Array.from(overdueMilestonesRows)[0]?.count || 0)

      return {
        stepCounts,
        riskCounts,
        integrationCounts,
        integrationTrackCounts,
        teamCounts,
        milestoneOnTrack,
        weeklyRollup,
        weeklyTarget,
        totalHoursThisWeek,
        blockedTasks: blockedTasksRows,
        overdueMilestones,
      }
    })

    return NextResponse.json(result)
  } catch (err) {
    console.error('GET overview-metrics error:', err)
    return NextResponse.json({ error: 'Failed to load metrics' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { projects, risks, timeEntries, weeklyReportNotes, projectMembers, users, onboardingSteps, onboardingPhases, integrations, teamOnboardingStatus } from '@/db/schema'
import { eq, and, or, isNull, sql, count, inArray } from 'drizzle-orm'
import { requireSession } from '@/lib/auth-server'
import { resolveRole } from '@/lib/auth-utils'

function isoWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

const COUNTED_PHASES = ['Discovery & Kickoff', 'Platform Configuration', 'UAT', 'Validation']

export async function GET(req: NextRequest) {
  const { session, redirectResponse } = await requireSession()
  if (redirectResponse) return redirectResponse

  const weekOf = req.nextUrl.searchParams.get('week') ?? isoWeek(new Date())
  const isAdmin = resolveRole(session!) === 'admin'
  const userId = session!.user.id

  // Determine which project IDs the user can see
  let visibleProjectIds: number[] | null = null
  if (!isAdmin) {
    const memberships = await db
      .select({ project_id: projectMembers.project_id })
      .from(projectMembers)
      .where(eq(projectMembers.user_id, userId))
    visibleProjectIds = memberships.map(m => m.project_id)
  }

  // All active projects (filtered by membership for non-admins)
  const projectRows = await db
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.status, 'active'),
        visibleProjectIds ? inArray(projects.id, visibleProjectIds) : undefined,
      )
    )
    .orderBy(projects.customer)

  if (projectRows.length === 0) return NextResponse.json({ rows: [], weekOf })

  const projectIds = projectRows.map(p => p.id)

  // Parallel data fetches
  const [riskRows, hoursRows, notesRows, memberRows, stepRows, integRows, teamRows] = await Promise.all([
    // Open risks per project
    db.select({ project_id: risks.project_id, severity: risks.severity, description: risks.description })
      .from(risks)
      .where(and(
        inArray(risks.project_id, projectIds),
        or(eq(risks.status, 'open'), isNull(risks.status)),
      )),

    // Total hours consumed per project
    db.select({
      project_id: timeEntries.project_id,
      total: sql<string>`SUM(${timeEntries.hours}::numeric)`,
    })
      .from(timeEntries)
      .where(inArray(timeEntries.project_id, projectIds))
      .groupBy(timeEntries.project_id),

    // Report notes for this week
    db.select({ project_id: weeklyReportNotes.project_id, notes: weeklyReportNotes.notes })
      .from(weeklyReportNotes)
      .where(and(
        inArray(weeklyReportNotes.project_id, projectIds),
        eq(weeklyReportNotes.week_of, weekOf),
      )),

    // Project members with user names (for PM/owner)
    db.select({
      project_id: projectMembers.project_id,
      role: projectMembers.role,
      name: users.name,
    })
      .from(projectMembers)
      .innerJoin(users, eq(users.id, projectMembers.user_id))
      .where(inArray(projectMembers.project_id, projectIds)),

    // Onboarding step counts (standard phases only)
    db.select({
      project_id: onboardingSteps.project_id,
      status: onboardingSteps.status,
      count: count(),
    })
      .from(onboardingSteps)
      .innerJoin(onboardingPhases, eq(onboardingSteps.phase_id, onboardingPhases.id))
      .where(and(
        inArray(onboardingSteps.project_id, projectIds),
        inArray(onboardingPhases.name, COUNTED_PHASES),
      ))
      .groupBy(onboardingSteps.project_id, onboardingSteps.status),

    // Integration counts per project (assigned to a track only)
    db.select({
      project_id: integrations.project_id,
      status: integrations.status,
      count: count(),
    })
      .from(integrations)
      .where(and(
        inArray(integrations.project_id, projectIds),
        sql`${integrations.track} IS NOT NULL`,
      ))
      .groupBy(integrations.project_id, integrations.status),

    // Team counts per project
    db.select({
      project_id: teamOnboardingStatus.project_id,
      status: teamOnboardingStatus.status,
      count: count(),
    })
      .from(teamOnboardingStatus)
      .where(and(
        inArray(teamOnboardingStatus.project_id, projectIds),
        sql`${teamOnboardingStatus.track} IS NOT NULL`,
      ))
      .groupBy(teamOnboardingStatus.project_id, teamOnboardingStatus.status),
  ])

  // Build lookup maps
  const risksByProject = new Map<number, typeof riskRows>()
  for (const r of riskRows) {
    if (!r.project_id) continue
    if (!risksByProject.has(r.project_id)) risksByProject.set(r.project_id, [])
    risksByProject.get(r.project_id)!.push(r)
  }

  const hoursMap = new Map<number, number>()
  for (const h of hoursRows) {
    if (h.project_id) hoursMap.set(h.project_id, parseFloat(h.total ?? '0'))
  }

  const notesMap = new Map<number, string>()
  for (const n of notesRows) notesMap.set(n.project_id, n.notes)

  const ownerMap = new Map<number, string>()
  for (const m of memberRows) {
    if (m.role === 'admin' && !ownerMap.has(m.project_id)) {
      ownerMap.set(m.project_id, m.name)
    }
  }
  // Fall back to first member if no admin found
  for (const m of memberRows) {
    if (!ownerMap.has(m.project_id)) ownerMap.set(m.project_id, m.name)
  }

  // Progress: combine steps + integrations + teams
  type CountRow = { project_id: number; status: string; count: unknown }
  function progressForProject(pid: number, rows: CountRow[]) {
    const matching = rows.filter(r => r.project_id === pid)
    const total = matching.reduce((s, r) => s + Number(r.count), 0)
    const complete = matching.filter(r => r.status === 'complete').reduce((s, r) => s + Number(r.count), 0)
    return { total, complete }
  }

  const rows = projectRows.map(p => {
    const pRisks = risksByProject.get(p.id) ?? []
    const openRisks = pRisks.length
    const highRisks = pRisks.filter(r => r.severity === 'high' || r.severity === 'critical').length
    const riskSummary = pRisks.slice(0, 3).map(r => r.description).join('; ')

    const steps  = progressForProject(p.id, stepRows as CountRow[])
    const integ  = progressForProject(p.id, integRows as CountRow[])
    const teams  = progressForProject(p.id, teamRows as CountRow[])
    const totalItems    = steps.total + integ.total + teams.total
    const completeItems = steps.complete + integ.complete + teams.complete
    const progressPct   = totalItems > 0 ? Math.round((completeItems / totalItems) * 100) : null

    return {
      id: p.id,
      name: p.name,
      customer: p.customer,
      project_type: p.project_type ?? '',
      owner: ownerMap.get(p.id) ?? '',
      health: p.overall_status ?? '',
      progress_pct: progressPct,
      notes: notesMap.get(p.id) ?? '',
      open_risks: openRisks,
      high_risks: highRisks,
      risk_summary: riskSummary,
      start_date: p.start_date ?? '',
      go_live_target: p.go_live_target ?? '',
      budgeted_hours: p.budgeted_hours ? parseFloat(String(p.budgeted_hours)) : null,
      hours_consumed: hoursMap.get(p.id) ?? 0,
      arr: p.arr ?? '',
    }
  })

  return NextResponse.json({ rows, weekOf })
}

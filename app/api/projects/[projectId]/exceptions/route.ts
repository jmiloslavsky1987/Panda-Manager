export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import db from '@/db'
import { requireProjectRole } from '@/lib/auth-server'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ExceptionRecord = {
  type: 'overdue_task' | 'at_risk_milestone' | 'stale_item' | 'open_risk'
  id: number
  name: string
  reason: string
  link: string
}

// ─── GET /api/projects/[projectId]/exceptions ─────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params
  const numericId = parseInt(projectId, 10)
  if (isNaN(numericId)) {
    return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 })
  }

  const { redirectResponse } = await requireProjectRole(numericId, 'user')
  if (redirectResponse) return redirectResponse

  try {
    const exceptions = await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.current_project_id = ${numericId}`))

      const results: ExceptionRecord[] = []

      // ─── 1. Overdue Tasks ─────────────────────────────────────────────────────
      // status NOT IN ('done', 'complete') AND due is ISO date AND due::date < CURRENT_DATE

      interface OverdueTaskRow extends Record<string, unknown> {
        id: number | string
        title: string
        due: string
        days_overdue: number | string
      }

      const overdueTasksRows = await tx.execute<OverdueTaskRow>(sql`
        SELECT
          id,
          title,
          due,
          (CURRENT_DATE - due::date) AS days_overdue
        FROM tasks
        WHERE project_id = ${numericId}
          AND status NOT IN ('done', 'complete')
          AND due ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
          AND due::date < CURRENT_DATE
        ORDER BY days_overdue DESC
      `)

      for (const row of overdueTasksRows) {
        const daysOverdue = Number(row.days_overdue)
        results.push({
          type: 'overdue_task',
          id: Number(row.id),
          name: row.title,
          reason: `Overdue ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''}`,
          link: `/customer/${numericId}/tasks`,
        })
      }

      // ─── 2. At-Risk Milestones ────────────────────────────────────────────────
      // status = 'at_risk' OR (status != 'complete' AND date is ISO AND date < today)

      interface AtRiskMilestoneRow extends Record<string, unknown> {
        id: number | string
        name: string
        status: string
        date: string | null
        days_overdue: number | string | null
      }

      const atRiskMilestonesRows = await tx.execute<AtRiskMilestoneRow>(sql`
        SELECT
          id,
          name,
          status,
          date,
          CASE
            WHEN date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' AND date::date < CURRENT_DATE
              THEN (CURRENT_DATE - date::date)
            ELSE NULL
          END AS days_overdue
        FROM milestones
        WHERE project_id = ${numericId}
          AND (
            status = 'at_risk'
            OR (
              status != 'complete'
              AND date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
              AND date::date < CURRENT_DATE
            )
          )
        ORDER BY
          CASE WHEN status = 'at_risk' AND (date IS NULL OR date !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' OR date::date >= CURRENT_DATE) THEN 0 ELSE 1 END ASC,
          days_overdue DESC NULLS LAST
      `)

      for (const row of atRiskMilestonesRows) {
        const daysOverdue = row.days_overdue != null ? Number(row.days_overdue) : null
        let reason: string
        if (daysOverdue != null && daysOverdue > 0) {
          reason = `Overdue ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''}`
        } else {
          reason = 'At Risk'
        }
        results.push({
          type: 'at_risk_milestone',
          id: Number(row.id),
          name: row.name,
          reason,
          link: `/customer/${numericId}/milestones`,
        })
      }

      // ─── 3. Open Critical / High Risks ───────────────────────────────────────
      // Matches the HealthDashboard red/yellow formula so both panels reflect the same signals

      interface OpenRiskRow extends Record<string, unknown> {
        id: number | string
        description: string
        severity: string
      }

      const openRisksRows = await tx.execute<OpenRiskRow>(sql`
        SELECT id, description, severity
        FROM risks
        WHERE project_id = ${numericId}
          AND status = 'open'
          AND severity IN ('critical', 'high')
        ORDER BY
          CASE severity WHEN 'critical' THEN 0 ELSE 1 END ASC,
          id ASC
      `)

      for (const row of openRisksRows) {
        const desc = row.description ?? ''
        const name = desc.length > 60 ? desc.slice(0, 60) + '…' : desc
        const severity = row.severity === 'critical' ? 'Critical' : 'High'
        results.push({
          type: 'open_risk',
          id: Number(row.id),
          name,
          reason: `${severity} risk`,
          link: `/customer/${numericId}/risks`,
        })
      }

      // ─── 4. Stale Items ───────────────────────────────────────────────────────
      // created_at < NOW() - INTERVAL '14 days' for tasks, actions, risks (not done/closed)

      interface StaleTaskRow extends Record<string, unknown> {
        id: number | string
        title: string
        days_stale: number | string
      }

      const staleTasksRows = await tx.execute<StaleTaskRow>(sql`
        SELECT
          id,
          title,
          (CURRENT_DATE - created_at::date) AS days_stale
        FROM tasks
        WHERE project_id = ${numericId}
          AND status NOT IN ('done', 'complete')
          AND created_at < NOW() - INTERVAL '14 days'
        ORDER BY days_stale DESC
      `)

      for (const row of staleTasksRows) {
        const daysStale = Number(row.days_stale)
        results.push({
          type: 'stale_item',
          id: Number(row.id),
          name: row.title,
          reason: `Stale ${daysStale} day${daysStale !== 1 ? 's' : ''}`,
          link: `/customer/${numericId}/tasks`,
        })
      }

      interface StaleActionRow extends Record<string, unknown> {
        id: number | string
        description: string
        days_stale: number | string
      }

      const staleActionsRows = await tx.execute<StaleActionRow>(sql`
        SELECT
          id,
          description,
          (CURRENT_DATE - created_at::date) AS days_stale
        FROM actions
        WHERE project_id = ${numericId}
          AND status NOT IN ('completed', 'cancelled')
          AND created_at < NOW() - INTERVAL '14 days'
        ORDER BY days_stale DESC
      `)

      for (const row of staleActionsRows) {
        const daysStale = Number(row.days_stale)
        const desc = row.description ?? ''
        const name = desc.length > 60 ? desc.slice(0, 60) + '…' : desc
        results.push({
          type: 'stale_item',
          id: Number(row.id),
          name,
          reason: `Stale ${daysStale} day${daysStale !== 1 ? 's' : ''}`,
          link: `/customer/${numericId}/actions`,
        })
      }

      interface StaleRiskRow extends Record<string, unknown> {
        id: number | string
        description: string
        days_stale: number | string
      }

      const staleRisksRows = await tx.execute<StaleRiskRow>(sql`
        SELECT
          id,
          description,
          (CURRENT_DATE - created_at::date) AS days_stale
        FROM risks
        WHERE project_id = ${numericId}
          AND status = 'open'
          AND created_at < NOW() - INTERVAL '14 days'
        ORDER BY days_stale DESC
      `)

      for (const row of staleRisksRows) {
        const daysStale = Number(row.days_stale)
        const desc = row.description ?? ''
        const name = desc.length > 60 ? desc.slice(0, 60) + '…' : desc
        results.push({
          type: 'stale_item',
          id: Number(row.id),
          name,
          reason: `Stale ${daysStale} day${daysStale !== 1 ? 's' : ''}`,
          link: `/customer/${numericId}/risks`,
        })
      }

      return results
    })

    return NextResponse.json(exceptions)
  } catch (err) {
    console.error('GET exceptions error:', err)
    return NextResponse.json({ error: 'Failed to load exceptions' }, { status: 500 })
  }
}

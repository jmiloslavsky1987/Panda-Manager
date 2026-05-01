'use client'

import { useEffect, useState } from 'react'
import type { ProjectWithHealth } from '../lib/queries'

interface WorkspaceKpiStripProps {
  project: ProjectWithHealth
  projectId: number
}

interface LiveMetrics {
  stepCounts: { track: string; status: string; count: number }[]
  integrationTrackCounts: { track: string; status: string; count: number }[]
  teamCounts: { track: string; status: string; count: number }[]
  riskCounts: { severity: string; count: number }[]
}

function sumTrack(rows: { track: string; status: string; count: number }[], track: string) {
  const lc = track.toLowerCase()
  const matching = rows.filter(r => r.track.toLowerCase() === lc)
  return {
    total: matching.reduce((s, r) => s + r.count, 0),
    complete: matching.filter(r => r.status === 'complete').reduce((s, r) => s + r.count, 0),
  }
}

export function WorkspaceKpiStrip({ project, projectId }: WorkspaceKpiStripProps) {
  const [metrics, setMetrics] = useState<LiveMetrics | null>(null)

  const fetchMetrics = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/overview-metrics`)
      if (res.ok) setMetrics(await res.json())
    } catch {}
  }

  useEffect(() => {
    fetchMetrics()
  }, [projectId])

  useEffect(() => {
    window.addEventListener('metrics:invalidate', fetchMetrics)
    return () => window.removeEventListener('metrics:invalidate', fetchMetrics)
  }, [projectId])

  // Compute live percent complete from steps + integrations + teams
  let percentComplete: number | null = project.percentComplete ?? null
  let openRisks: number = project.openRiskCount ?? 0

  if (metrics) {
    const adrSteps  = sumTrack(metrics.stepCounts, 'adr')
    const adrInteg  = sumTrack(metrics.integrationTrackCounts ?? [], 'adr')
    const adrTeams  = sumTrack(metrics.teamCounts ?? [], 'adr')
    const biggySteps = sumTrack(metrics.stepCounts, 'biggy')
    const biggyInteg = sumTrack(metrics.integrationTrackCounts ?? [], 'biggy')
    const biggyTeams = sumTrack(metrics.teamCounts ?? [], 'biggy')

    const total    = adrSteps.total + adrInteg.total + adrTeams.total + biggySteps.total + biggyInteg.total + biggyTeams.total
    const complete = adrSteps.complete + adrInteg.complete + adrTeams.complete + biggySteps.complete + biggyInteg.complete + biggyTeams.complete
    percentComplete = total > 0 ? Math.round((complete / total) * 100) : 0

    openRisks = metrics.riskCounts.reduce((s, r) => s + r.count, 0)
  }

  const daysToGoLive = project.go_live_target
    ? Math.ceil((new Date(project.go_live_target).getTime() - Date.now()) / 86400000)
    : null

  const kpiColumns = [
    {
      label: 'Phase',
      value: project.currentPhase ?? '—',
      sub: '',
      tone: 'neutral' as const,
    },
    {
      label: 'Progress',
      value: percentComplete != null ? `${percentComplete}%` : '—',
      sub: percentComplete != null ? 'complete' : '',
      tone: 'neutral' as const,
    },
    {
      label: 'Days to Go-Live',
      value: daysToGoLive !== null ? String(Math.abs(daysToGoLive)) : '—',
      sub: daysToGoLive !== null && daysToGoLive < 0 ? 'overdue' : 'remaining',
      tone: (
        daysToGoLive !== null && daysToGoLive < 0
          ? 'error'
          : daysToGoLive !== null && daysToGoLive < 30
            ? 'warning'
            : 'neutral'
      ) as 'error' | 'warning' | 'neutral',
    },
    {
      label: 'Open Risks',
      value: String(openRisks),
      sub: project.highRisks > 0 ? `${project.highRisks} high` : 'all low',
      tone: (
        project.highRisks > 0 ? 'error' : openRisks > 3 ? 'warning' : 'neutral'
      ) as 'error' | 'warning' | 'neutral',
    },
    {
      label: 'Velocity',
      value:
        project.velocityWeeks?.length > 0
          ? String(project.velocityWeeks[project.velocityWeeks.length - 1])
          : '—',
      sub: 'tasks/wk',
      tone: 'neutral' as const,
    },
  ]

  return (
    <div
      className="border-b"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        borderColor: 'var(--kata-stroke-subtle)',
        background: 'var(--kata-surface-container)',
      }}
    >
      {kpiColumns.map((k, i) => {
        const valueColor =
          k.tone === 'error'
            ? 'var(--kata-status-red)'
            : k.tone === 'warning'
              ? 'var(--kata-status-amber)'
              : 'var(--kata-on-container)'

        return (
          <div
            key={k.label}
            style={{
              padding: '18px',
              borderRight:
                i < 4 ? '1px solid var(--kata-stroke-subtle)' : 'none',
            }}
          >
            <span
              className="block text-[10px] font-medium uppercase tracking-widest"
              style={{ color: 'var(--kata-on-container-tertiary)' }}
            >
              {k.label}
            </span>
            <span
              className="block font-mono font-medium tabular-nums"
              style={{
                fontSize: 28,
                lineHeight: 1,
                letterSpacing: '-0.01em',
                color: valueColor,
                marginTop: '6px',
              }}
            >
              {k.value}
            </span>
            {k.sub && (
              <span
                className="text-[11px] block mt-0.5"
                style={{ color: 'var(--kata-on-container-tertiary)' }}
              >
                {k.sub}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

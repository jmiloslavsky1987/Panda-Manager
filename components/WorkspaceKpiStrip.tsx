import type { ProjectWithHealth } from '../lib/queries'

/**
 * WorkspaceKpiStrip
 * Phase 81: KDS-06
 *
 * Server component. Renders a 5-column KPI strip below the workspace page-bar.
 * JBM 28px numerals, Kata status token tinting for risky values.
 *
 * Columns: Phase | Progress | Days to Go-Live | Open Risks | Velocity
 *
 * Note: ProjectWithHealth does not carry currentPhase / percentComplete at the
 * base level — those fields live on PortfolioProject (getPortfolioData).
 * The strip accepts optional overrides for these fields so workspace layout can
 * pass enriched data in future; they default to '—' / 0 when absent.
 */

interface WorkspaceKpiStripProps {
  project: ProjectWithHealth & {
    currentPhase?: string | null
    percentComplete?: number | null
  }
}

export function WorkspaceKpiStrip({ project }: WorkspaceKpiStripProps) {
  const daysToGoLive = project.go_live_target
    ? Math.ceil((new Date(project.go_live_target).getTime() - Date.now()) / 86400000)
    : null

  const openRisks = project.openRiskCount ?? 0

  const kpiColumns = [
    {
      label: 'Phase',
      value: project.currentPhase ?? '—',
      sub: '',
      tone: 'neutral' as const,
    },
    {
      label: 'Progress',
      value: project.percentComplete != null ? `${project.percentComplete}%` : '—',
      sub: project.percentComplete != null ? 'complete' : '',
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

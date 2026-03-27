'use client'

import type { E2eWorkflowWithSteps, OpenAction } from '@/lib/queries'
import { WarnBanner } from './WarnBanner'

// Design tokens
const ADR = { text: '#1e40af', bg: '#eff6ff', border: '#bfdbfe' }
const BIGGY = { text: '#6d28d9', bg: '#f5f3ff', border: '#ddd6fe' }

const AMEX_TEAM_ORDER = [
  'ITSM & Platform Ops',
  'Loyalty',
  'Observability & Monitoring',
  'OETM/Infrastructure',
  'MIM Team',
  'Global Remittance',
  'Merchant Domain',
  'Change Management',
]

function statusPill(status: string) {
  switch (status) {
    case 'live':
      return { bg: '#dcfce7', text: '#14532d', label: 'Live' }
    case 'in_progress':
      return { bg: '#fef3c7', text: '#92400e', label: 'In Progress' }
    case 'planned':
    default:
      return { bg: '#f1f5f9', text: '#475569', label: 'Planned' }
  }
}

interface Props {
  customer: string
  workflows: E2eWorkflowWithSteps[]
  openActions: OpenAction[]
}

export function TeamsEngagementSection({ customer, workflows, openActions }: Props) {
  // Derive distinct team names
  const teamNamesSet = new Set<string>()
  for (const wf of workflows) {
    if (wf.team_name) teamNamesSet.add(wf.team_name)
  }
  let teamNames = Array.from(teamNamesSet)

  // AMEX canonical ordering
  if (customer.toLowerCase().includes('amex')) {
    const ordered: string[] = []
    for (const canonical of AMEX_TEAM_ORDER) {
      if (teamNamesSet.has(canonical)) ordered.push(canonical)
    }
    // Append any team not in canonical list (future-proof)
    for (const name of teamNames) {
      if (!AMEX_TEAM_ORDER.includes(name)) ordered.push(name)
    }
    teamNames = ordered
  }

  // Top 3 project-level open actions (shared across all team cards)
  const topActions = openActions.slice(0, 3)

  return (
    <section>
      <h2 className="text-lg font-semibold text-zinc-900 mb-4">
        Teams &amp; Engagement Status
      </h2>

      {teamNames.length === 0 ? (
        <WarnBanner message="No team data — add E2E workflows to generate team cards." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {teamNames.map((teamName) => {
            const teamWorkflows = workflows.filter((wf) => wf.team_name === teamName)
            const allSteps = teamWorkflows.flatMap((wf) => wf.steps)
            const adrSteps = allSteps.filter((s) => s.track === 'ADR')
            const biggySteps = allSteps.filter((s) => s.track === 'Biggy')

            // Status pill counts
            const statusCounts: Record<string, number> = {}
            for (const step of allSteps) {
              const k = step.status ?? 'planned'
              statusCounts[k] = (statusCounts[k] ?? 0) + 1
            }

            const workflowNames = teamWorkflows.map((wf) => wf.workflow_name).filter(Boolean)

            return (
              <div
                key={teamName}
                className="border border-zinc-200 rounded-lg p-4 space-y-3 bg-white"
              >
                <p className="font-semibold text-zinc-900 text-sm">{teamName}</p>

                {/* ADR track items */}
                {adrSteps.length > 0 && (
                  <div>
                    <p className="text-xs font-medium mb-1" style={{ color: ADR.text }}>
                      ADR Track
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {adrSteps.map((s) => (
                        <span
                          key={s.id}
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: ADR.bg, color: ADR.text, border: `1px solid ${ADR.border}` }}
                        >
                          {s.label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Biggy track items */}
                {biggySteps.length > 0 && (
                  <div>
                    <p className="text-xs font-medium mb-1" style={{ color: BIGGY.text }}>
                      Biggy AI Track
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {biggySteps.map((s) => (
                        <span
                          key={s.id}
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: BIGGY.bg, color: BIGGY.text, border: `1px solid ${BIGGY.border}` }}
                        >
                          {s.label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Workflow names */}
                {workflowNames.length > 0 && (
                  <p className="text-xs text-zinc-400">
                    {workflowNames.join(', ')}
                  </p>
                )}

                {/* Open items (TEAMS-05) */}
                <div>
                  <p className="text-xs font-medium text-zinc-500 mb-1">Open Items</p>
                  {topActions.length === 0 ? (
                    <p className="text-sm text-gray-400">No open items</p>
                  ) : (
                    <ul className="space-y-1">
                      {topActions.map((action) => (
                        <li key={action.id} className="text-xs text-zinc-700">
                          {action.description}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Status footer */}
                {Object.keys(statusCounts).length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1 border-t border-zinc-100">
                    {Object.entries(statusCounts).map(([status, count]) => {
                      const pill = statusPill(status)
                      return (
                        <span
                          key={status}
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: pill.bg, color: pill.text }}
                        >
                          {count} {pill.label}
                        </span>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

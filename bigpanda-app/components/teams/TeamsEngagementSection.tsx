'use client'

import type { E2eWorkflowWithSteps, OpenAction, TeamOnboardingStatus, Stakeholder } from '@/lib/queries'
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

function statusIcon(status: string | null) {
  switch (status) {
    case 'live': return '✓'
    case 'in_progress': return '◐'
    case 'blocked': return '⚠'
    case 'planned':
    default: return '○'
  }
}

function statusLabel(status: string | null) {
  switch (status) {
    case 'live': return 'Live'
    case 'in_progress': return 'In Progress'
    case 'blocked': return 'Blocked'
    case 'planned': return 'Planned'
    default: return status || 'Not Started'
  }
}

interface Props {
  customer: string
  workflows: E2eWorkflowWithSteps[]
  openActions: OpenAction[]
  teamOnboardingStatus: TeamOnboardingStatus[]
  stakeholders: Stakeholder[]
}

export function TeamsEngagementSection({ customer, workflows, openActions, teamOnboardingStatus, stakeholders }: Props) {
  // Derive team names from teamOnboardingStatus OR workflows
  let teamNames: string[]
  if (teamOnboardingStatus.length > 0) {
    teamNames = teamOnboardingStatus.map(t => t.team_name)
    // AMEX canonical ordering
    if (customer.toLowerCase().includes('amex')) {
      const teamNamesSet = new Set(teamNames)
      const ordered: string[] = []
      for (const canonical of AMEX_TEAM_ORDER) {
        if (teamNamesSet.has(canonical)) ordered.push(canonical)
      }
      // Append any team not in canonical list
      for (const name of teamNames) {
        if (!AMEX_TEAM_ORDER.includes(name)) ordered.push(name)
      }
      teamNames = ordered
    }
  } else {
    // Fallback: derive from workflows
    const teamNamesSet = new Set<string>()
    for (const wf of workflows) {
      if (wf.team_name) teamNamesSet.add(wf.team_name)
    }
    teamNames = Array.from(teamNamesSet)

    // AMEX canonical ordering
    if (customer.toLowerCase().includes('amex')) {
      const ordered: string[] = []
      for (const canonical of AMEX_TEAM_ORDER) {
        if (teamNamesSet.has(canonical)) ordered.push(canonical)
      }
      for (const name of teamNames) {
        if (!AMEX_TEAM_ORDER.includes(name)) ordered.push(name)
      }
      teamNames = ordered
    }
  }

  // Top 3 project-level open actions
  const topActions = openActions.slice(0, 3)

  return (
    <section>
      {teamNames.length === 0 ? (
        <WarnBanner message="No team data — add E2E workflows or team onboarding status to generate team cards." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {teamNames.map((teamName) => {
            // Find team onboarding status (preferred source)
            const teamStatus = teamOnboardingStatus.find(t => t.team_name === teamName)

            // Fallback: derive from workflows
            const teamWorkflows = workflows.filter((wf) => wf.team_name === teamName)
            const allSteps = teamWorkflows.flatMap((wf) => wf.steps)
            const adrSteps = allSteps.filter((s) => s.track === 'ADR')
            const biggySteps = allSteps.filter((s) => s.track === 'Biggy')

            // Find team contacts from stakeholders
            const teamContacts = stakeholders.filter(s =>
              s.name?.toLowerCase().includes(teamName.toLowerCase()) ||
              s.role?.toLowerCase().includes(teamName.toLowerCase())
            ).slice(0, 3)
            const contactsText = teamContacts.map(c => c.name).join(' · ')

            // Track badges
            const hasADR = teamStatus ? (teamStatus.ingest_status || teamStatus.correlation_status || teamStatus.incident_intelligence_status || teamStatus.sn_automation_status) : adrSteps.length > 0
            const hasBiggy = teamStatus ? teamStatus.biggy_ai_status : biggySteps.length > 0

            return (
              <div
                key={teamName}
                className="rounded-xl border border-zinc-200 bg-white p-4 flex flex-col gap-3"
              >
                {/* Header */}
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold text-zinc-900">{teamName}</p>
                      {contactsText && (
                        <p className="text-xs text-zinc-400 mt-0.5">{contactsText}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {hasADR && (
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-semibold border"
                          style={{ background: ADR.bg, color: ADR.text, borderColor: ADR.border }}
                        >
                          ADR
                        </span>
                      )}
                      {hasBiggy && (
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-semibold border"
                          style={{ background: BIGGY.bg, color: BIGGY.text, borderColor: BIGGY.border }}
                        >
                          BIGGY
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* ADR TRACK (from teamOnboardingStatus if available) */}
                {teamStatus && hasADR && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: ADR.text }}>
                      ADR Track
                    </p>
                    <ul className="space-y-1 text-xs text-zinc-700">
                      {teamStatus.ingest_status && (
                        <li>{statusIcon(teamStatus.ingest_status)} Alert Ingest - {statusLabel(teamStatus.ingest_status)}</li>
                      )}
                      {teamStatus.correlation_status && (
                        <li>{statusIcon(teamStatus.correlation_status)} Alert Correlation - {statusLabel(teamStatus.correlation_status)}</li>
                      )}
                      {teamStatus.incident_intelligence_status && (
                        <li>{statusIcon(teamStatus.incident_intelligence_status)} Incident Intelligence - {statusLabel(teamStatus.incident_intelligence_status)}</li>
                      )}
                      {teamStatus.sn_automation_status && (
                        <li>{statusIcon(teamStatus.sn_automation_status)} SN Automation - {statusLabel(teamStatus.sn_automation_status)}</li>
                      )}
                    </ul>
                  </div>
                )}

                {/* ADR TRACK (fallback from workflow steps) */}
                {!teamStatus && adrSteps.length > 0 && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: ADR.text }}>
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

                {/* BIGGY TRACK (from teamOnboardingStatus if available) */}
                {teamStatus?.biggy_ai_status && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: BIGGY.text }}>
                      BIGGY Track
                    </p>
                    <ul className="space-y-1 text-xs text-zinc-700">
                      <li>{statusIcon(teamStatus.biggy_ai_status)} Biggy AI - {statusLabel(teamStatus.biggy_ai_status)}</li>
                    </ul>
                  </div>
                )}

                {/* BIGGY TRACK (fallback from workflow steps) */}
                {!teamStatus && biggySteps.length > 0 && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: BIGGY.text }}>
                      BIGGY Track
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

                {/* TOP OPEN ITEMS */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-zinc-500 mb-1">Top Open Items</p>
                  {topActions.length === 0 ? (
                    <p className="text-xs text-zinc-400">No open items</p>
                  ) : (
                    <ul className="space-y-1">
                      {topActions.map((action) => (
                        <li key={action.id} className="text-xs text-zinc-700">
                          • {action.description}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Status footer (only if using teamOnboardingStatus) */}
                {teamStatus && (
                  <div className="flex flex-wrap gap-1 pt-2 border-t border-zinc-100">
                    {[
                      teamStatus.ingest_status,
                      teamStatus.correlation_status,
                      teamStatus.incident_intelligence_status,
                      teamStatus.sn_automation_status,
                      teamStatus.biggy_ai_status
                    ].filter(Boolean).map((status, idx) => {
                      const pill = statusPill(status!)
                      return (
                        <span
                          key={idx}
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: pill.bg, color: pill.text }}
                        >
                          {pill.label}
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

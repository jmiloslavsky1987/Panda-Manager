'use client'

import type { TeamsTabData, BusinessOutcome, E2eWorkflowWithSteps, FocusArea, ArchitectureIntegration } from '@/lib/queries'
import { WarnBanner } from './WarnBanner'

interface Props {
  projectId: number
  data: TeamsTabData
}

export function TeamEngagementOverview({ projectId, data }: Props) {
  return (
    <div className="space-y-8 pb-8">
      {/* Section 1: Business Value & Expected Outcomes */}
      <section>
        <h2 className="text-lg font-bold text-zinc-900 mb-4">Business Value & Expected Outcomes</h2>
        {(!data.businessOutcomes || data.businessOutcomes.length === 0) ? (
          <WarnBanner message="No business outcomes defined. Add outcomes in the Outcomes section." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.businessOutcomes.map(outcome => (
              <OutcomeCard key={outcome.id} outcome={outcome} />
            ))}
          </div>
        )}
      </section>

      {/* Section 2: End-to-End Workflows */}
      <section>
        <h2 className="text-lg font-bold text-zinc-900 mb-4">End-to-End Workflows</h2>
        {(!data.e2eWorkflows || data.e2eWorkflows.length === 0) ? (
          <WarnBanner message="No E2E workflows defined." />
        ) : (
          <div className="space-y-4">
            {data.e2eWorkflows.map(workflow => (
              <WorkflowCard key={workflow.id} workflow={workflow} />
            ))}
          </div>
        )}
      </section>

      {/* Section 3: Teams & Engagement Status */}
      <section>
        <h2 className="text-lg font-bold text-zinc-900 mb-4">Teams & Engagement Status</h2>
        {(!data.architectureIntegrations || data.architectureIntegrations.length === 0) ? (
          <WarnBanner message="No team engagement data available." />
        ) : (
          <TeamsEngagementSection
            architectureIntegrations={data.architectureIntegrations}
            openActions={data.openActions}
            e2eWorkflows={data.e2eWorkflows}
          />
        )}
      </section>

      {/* Section 4: Top Focus Areas */}
      <section>
        <h2 className="text-lg font-bold text-zinc-900 mb-4">Top Focus Areas</h2>
        {(!data.focusAreas || data.focusAreas.length === 0) ? (
          <WarnBanner message="No focus areas defined." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.focusAreas.map(area => (
              <FocusAreaCard key={area.id} area={area} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

// ─── Outcome Card ─────────────────────────────────────────────────────────────

function OutcomeCard({ outcome }: { outcome: BusinessOutcome }) {
  const statusColors = {
    live: 'bg-green-100 text-green-800 border-green-200',
    in_progress: 'bg-amber-100 text-amber-800 border-amber-200',
    planned: 'bg-zinc-100 text-zinc-600 border-zinc-200',
  }

  const trackColors = {
    ADR: 'bg-blue-500 text-white',
    Biggy: 'bg-purple-500 text-white',
    E2E: 'bg-green-500 text-white',
  }

  return (
    <div className="border border-zinc-200 rounded-lg p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="text-2xl">{outcome.icon || '🎯'}</div>
        <div className="flex-1">
          <h3 className="font-semibold text-zinc-900">{outcome.title}</h3>
          <div className="mt-1">
            <span className={`inline-block px-2 py-0.5 text-xs font-bold rounded uppercase ${trackColors[outcome.outcome_type as keyof typeof trackColors] || 'bg-zinc-500 text-white'}`}>
              {outcome.outcome_type}
            </span>
          </div>
        </div>
      </div>
      <p className="text-sm text-zinc-600">{outcome.description}</p>
      <div className="pt-2 border-t border-zinc-100">
        <span className={`inline-block px-2 py-1 text-xs font-medium border rounded ${statusColors[outcome.status as keyof typeof statusColors] || 'bg-zinc-100 text-zinc-600 border-zinc-200'}`}>
          {outcome.status === 'in_progress' ? 'In Progress' : outcome.status === 'live' ? 'Live' : 'Planned'}
        </span>
      </div>
    </div>
  )
}

// ─── Workflow Card ────────────────────────────────────────────────────────────

function WorkflowCard({ workflow }: { workflow: E2eWorkflowWithSteps }) {
  const statusColors = {
    live: 'bg-green-100 text-green-800 border-green-200',
    in_progress: 'bg-amber-100 text-amber-800 border-amber-200',
    planned: 'bg-zinc-100 text-zinc-600 border-zinc-200',
  }

  const trackColors = {
    ADR: 'bg-blue-500 text-white',
    Biggy: 'bg-purple-500 text-white',
    E2E: 'bg-green-500 text-white',
  }

  const stepStatusColors = {
    live: 'bg-green-100 text-green-800 border-green-200',
    in_progress: 'bg-amber-100 text-amber-800 border-amber-200',
    planned: 'bg-zinc-100 text-zinc-600 border-zinc-200',
    blocked: 'bg-red-100 text-red-800 border-red-200',
  }

  return (
    <div className="border border-zinc-200 rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="mb-2">
            <span className={`inline-block px-2 py-0.5 text-xs font-bold rounded uppercase ${trackColors[workflow.track as keyof typeof trackColors] || 'bg-zinc-500 text-white'}`}>
              {workflow.track}
            </span>
          </div>
          <h3 className="font-semibold text-zinc-900">{workflow.name}</h3>
          {workflow.description && (
            <p className="text-sm text-zinc-600 mt-1">{workflow.description}</p>
          )}
        </div>
        <span className={`ml-3 px-2 py-1 text-xs font-medium border rounded whitespace-nowrap ${statusColors[workflow.status as keyof typeof statusColors] || 'bg-zinc-100 text-zinc-600 border-zinc-200'}`}>
          {workflow.status === 'in_progress' ? 'In Progress' : workflow.status === 'live' ? 'Live' : 'Planned'}
        </span>
      </div>

      {workflow.steps && workflow.steps.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pt-3 border-t border-zinc-100">
          {workflow.steps.map((step, idx) => (
            <div key={step.id} className="flex items-center gap-2 flex-shrink-0">
              <div className="flex flex-col items-center gap-1">
                <div className={`px-2 py-1 text-xs font-medium border rounded ${stepStatusColors[step.status as keyof typeof stepStatusColors] || 'bg-zinc-100 text-zinc-600 border-zinc-200'}`}>
                  {step.name}
                </div>
                <span className={`text-xs font-semibold ${step.track === 'ADR' ? 'text-blue-600' : step.track === 'Biggy' ? 'text-purple-600' : 'text-green-600'}`}>
                  {step.track}
                </span>
              </div>
              {idx < workflow.steps.length - 1 && (
                <div className="text-zinc-400">→</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Teams Engagement Section ─────────────────────────────────────────────────

function TeamsEngagementSection({
  architectureIntegrations,
  openActions,
  e2eWorkflows,
}: {
  architectureIntegrations: ArchitectureIntegration[]
  openActions: any[]
  e2eWorkflows: E2eWorkflowWithSteps[]
}) {
  // Group integrations by track
  const adrIntegrations = architectureIntegrations.filter(i => i.track === 'ADR')
  const biggyIntegrations = architectureIntegrations.filter(i => i.track === 'Biggy')

  // Determine workflow status per track
  const adrWorkflowExists = e2eWorkflows.some(w => w.track === 'ADR')
  const biggyWorkflowExists = e2eWorkflows.some(w => w.track === 'Biggy')

  const statusIcons = {
    live: '✓',
    in_progress: '◐',
    planned: '○',
    blocked: '⚠',
  }

  const statusColors = {
    live: 'text-green-600',
    in_progress: 'text-amber-500',
    planned: 'text-zinc-400',
    blocked: 'text-red-500',
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* ADR Track Card */}
      {adrIntegrations.length > 0 && (
        <div className="border border-zinc-200 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-zinc-900">ADR Track</h3>
            <span className={`px-2 py-1 text-xs font-semibold rounded ${adrWorkflowExists ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-600'}`}>
              {adrWorkflowExists ? 'Workflow Known' : 'Unknown'}
            </span>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-medium text-zinc-700">Integrations</h4>
            <ul className="space-y-1">
              {adrIntegrations.map(integration => (
                <li key={integration.id} className="text-sm flex items-center gap-2">
                  <span className={`font-mono ${statusColors[integration.status as keyof typeof statusColors] || 'text-zinc-400'}`}>
                    {statusIcons[integration.status as keyof typeof statusIcons] || '○'}
                  </span>
                  <span className="text-zinc-700">{integration.tool_name}</span>
                </li>
              ))}
            </ul>
          </div>

          {openActions.length > 0 && (
            <div className="pt-3 border-t border-zinc-100">
              <p className="text-sm text-zinc-600">
                <span className="font-semibold">{openActions.length}</span> open items
              </p>
            </div>
          )}
        </div>
      )}

      {/* Biggy Track Card */}
      {biggyIntegrations.length > 0 && (
        <div className="border border-zinc-200 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-zinc-900">Biggy AI Track</h3>
            <span className={`px-2 py-1 text-xs font-semibold rounded ${biggyWorkflowExists ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-600'}`}>
              {biggyWorkflowExists ? 'Workflow Known' : 'Unknown'}
            </span>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-medium text-zinc-700">Integrations</h4>
            <ul className="space-y-1">
              {biggyIntegrations.map(integration => (
                <li key={integration.id} className="text-sm flex items-center gap-2">
                  <span className={`font-mono ${statusColors[integration.status as keyof typeof statusColors] || 'text-zinc-400'}`}>
                    {statusIcons[integration.status as keyof typeof statusIcons] || '○'}
                  </span>
                  <span className="text-zinc-700">{integration.tool_name}</span>
                </li>
              ))}
            </ul>
          </div>

          {openActions.length > 0 && (
            <div className="pt-3 border-t border-zinc-100">
              <p className="text-sm text-zinc-600">
                <span className="font-semibold">{openActions.length}</span> open items
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Focus Area Card ──────────────────────────────────────────────────────────

function FocusAreaCard({ area }: { area: FocusArea }) {
  const borderColors = {
    live: 'border-l-green-500',
    in_progress: 'border-l-blue-500',
    planned: 'border-l-zinc-300',
  }

  const statusColors = {
    live: 'bg-green-100 text-green-800 border-green-200',
    in_progress: 'bg-blue-100 text-blue-800 border-blue-200',
    planned: 'bg-zinc-100 text-zinc-600 border-zinc-200',
  }

  return (
    <div className={`border border-zinc-200 rounded-lg p-4 border-l-4 ${borderColors[area.status as keyof typeof borderColors] || 'border-l-zinc-300'} space-y-3`}>
      <div className="space-y-2">
        <h3 className="font-bold text-zinc-900">{area.title}</h3>
        <p className="text-sm text-zinc-600">
          <span className="font-medium">Why:</span> {area.why}
        </p>
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-zinc-100">
        <span className={`px-2 py-1 text-xs font-medium border rounded ${statusColors[area.status as keyof typeof statusColors] || 'bg-zinc-100 text-zinc-600 border-zinc-200'}`}>
          {area.status === 'in_progress' ? 'In Progress' : area.status === 'live' ? 'Live' : 'Planned'}
        </span>
        {area.owners && (
          <span className="text-xs text-zinc-500">{area.owners}</span>
        )}
      </div>
    </div>
  )
}

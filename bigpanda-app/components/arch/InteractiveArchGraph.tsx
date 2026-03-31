'use client'
import { useState } from 'react'
import type { ArchitectureIntegration, TeamPathway } from '@/lib/queries'
import { IntegrationDetailDrawer } from './IntegrationDetailDrawer'
import { TeamPathwayBridge } from './TeamPathwayBridge'

interface Props {
  integrations:      ArchitectureIntegration[]
  pathways:          TeamPathway[]
  projectId:         number
  onPathwaysUpdate:  (p: TeamPathway[]) => void
  onEdit?:           (integration: ArchitectureIntegration) => void
  adrTeamNames?:     string[]
  biggyTeamNames?:   string[]
}

const ADR_PHASES = [
  'Event Ingest',
  'Alert Intelligence',
  'Incident Intelligence',
  'Console',
  'Workflow Automation',
]

const BIGGY_PHASES = [
  'Knowledge Sources (Ingested)',
  'Real-Time Query Sources',
  'Biggy Capabilities',
  'Console',
  'Outputs & Actions',
]

// Card background + border driven by STATUS (matches reference screenshot)
function cardBg(status: string): string {
  switch (status) {
    case 'live':        return 'bg-green-50 border-green-200 hover:bg-green-100'
    case 'in_progress': return 'bg-amber-50 border-amber-200 hover:bg-amber-100'
    case 'pilot':       return 'bg-sky-50 border-sky-200 hover:bg-sky-100'
    case 'planned':     return 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100'
    default:            return 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100'
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case 'live':        return 'LIVE'
    case 'in_progress': return 'In Progress'
    case 'pilot':       return 'Pilot'
    case 'planned':     return 'Planned'
    default:            return status
  }
}

function statusColor(status: string): string {
  switch (status) {
    case 'live':        return 'text-green-600 font-semibold'
    case 'in_progress': return 'text-amber-600 font-semibold'
    case 'pilot':       return 'text-sky-600 font-semibold'
    case 'planned':     return 'text-zinc-400'
    default:            return 'text-zinc-400'
  }
}

function IntegrationCard({
  integration,
  onClick,
}: {
  integration: ArchitectureIntegration
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left border rounded-md px-2.5 py-2 transition-shadow hover:shadow-md ${cardBg(integration.status)}`}
    >
      <div className="font-semibold text-zinc-900 text-xs leading-snug">
        {integration.tool_name}
      </div>
      {(integration.notes || integration.integration_method) && (
        <div className="text-[11px] text-zinc-500 mt-0.5 leading-tight">
          {integration.notes ?? integration.integration_method}
        </div>
      )}
      <div className={`text-[11px] mt-1.5 ${statusColor(integration.status)}`}>
        {statusLabel(integration.status)}
      </div>
    </button>
  )
}

function Arrow() {
  return (
    <div className="flex-shrink-0 flex items-start justify-center pt-[46px] px-2">
      <div className="flex items-center">
        <div className="w-7 h-px bg-zinc-300" />
        <div
          style={{
            width: 0,
            height: 0,
            borderTop: '4px solid transparent',
            borderBottom: '4px solid transparent',
            borderLeft: '6px solid #d1d5db',
          }}
        />
      </div>
    </div>
  )
}

function ConsoleNode({ track }: { track: string }) {
  const isADR = track === 'ADR'
  return (
    <div className="flex flex-col items-center justify-start pt-2">
      <div
        className={`w-[72px] h-[72px] rounded-full flex items-center justify-center shadow-md ${
          isADR ? 'bg-zinc-900' : 'bg-amber-500'
        }`}
      >
        <span className="text-3xl select-none">{isADR ? '🐼' : '🤖'}</span>
      </div>
      <div className="text-xs text-zinc-600 mt-2 font-medium text-center leading-tight">
        {isADR ? 'BigPanda Console' : 'Biggy AI Console'}
      </div>
    </div>
  )
}

function PhaseColumn({
  phase,
  integrations,
  track,
  onCardClick,
}: {
  phase: string
  integrations: ArchitectureIntegration[]
  track: string
  onCardClick: (i: ArchitectureIntegration) => void
}) {
  const isConsole = phase === 'Console'

  return (
    <div className="flex flex-col w-[180px] flex-shrink-0">
      {/* Header */}
      <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 text-center mb-3 min-h-[40px] flex items-end justify-center px-1 leading-tight">
        {phase}
      </div>

      {/* Content */}
      {isConsole ? (
        <ConsoleNode track={track} />
      ) : integrations.length === 0 ? (
        <div className="text-zinc-300 text-sm text-center pt-6">—</div>
      ) : (
        <div className="flex flex-col gap-2">
          {integrations.map((int) => (
            <IntegrationCard key={int.id} integration={int} onClick={() => onCardClick(int)} />
          ))}
        </div>
      )}
    </div>
  )
}

function TrackPipeline({
  track,
  phases,
  integrations,
  teamNames,
  onCardClick,
}: {
  track: string
  phases: string[]
  integrations: ArchitectureIntegration[]
  teamNames: string[]
  onCardClick: (i: ArchitectureIntegration) => void
}) {
  const isADR = track === 'ADR'
  const borderClass = isADR ? 'border-l-blue-600' : 'border-l-amber-500'
  const labelClass = isADR ? 'text-blue-700' : 'text-amber-600'
  const byPhase = (p: string) => integrations.filter((i) => i.phase === p)

  return (
    <div className={`border-l-4 ${borderClass} pl-4 py-1`}>
      {/* Track label + optional team names */}
      <div className="flex items-baseline gap-2 mb-5">
        <span className={`text-[11px] font-bold uppercase tracking-widest ${labelClass}`}>
          {isADR ? 'ADR Track' : 'Biggy AI Track'}
        </span>
        {teamNames.length > 0 && (
          <span className="text-[11px] text-zinc-400">
            {teamNames.join(' · ')}
          </span>
        )}
      </div>

      {/* Phase pipeline */}
      <div className="flex items-start">
        {phases.map((phase, idx) => (
          <div key={phase} className="flex items-start">
            <PhaseColumn
              phase={phase}
              integrations={byPhase(phase)}
              track={track}
              onCardClick={onCardClick}
            />
            {idx < phases.length - 1 && <Arrow />}
          </div>
        ))}
      </div>
    </div>
  )
}

export function InteractiveArchGraph({
  integrations,
  pathways,
  projectId,
  onPathwaysUpdate,
  adrTeamNames = [],
  biggyTeamNames = [],
}: Props) {
  const [selectedIntegration, setSelectedIntegration] = useState<ArchitectureIntegration | null>(null)

  const adrIntegrations   = integrations.filter((i) => i.track === 'ADR')
  const biggyIntegrations = integrations.filter((i) => i.track === 'Biggy')

  if (integrations.length === 0) {
    return (
      <div className="h-[200px] border border-zinc-200 rounded-lg flex items-center justify-center text-zinc-400 text-sm">
        Add integrations to see the architecture diagram
      </div>
    )
  }

  return (
    <div className="flex gap-4">
      <div className="flex-1 min-w-0">
        {/* Top navigation row */}
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-600 text-white">
            ADR Track
          </span>
          <span className="text-zinc-400 text-xs">↓ then</span>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-500 text-white">
            Biggy AI Track
          </span>
          <span className="text-xs text-zinc-400 ml-1">
            Team-by-team rollout · see status table below
          </span>
        </div>
        <div className="text-[11px] text-zinc-400 mb-4">↔ Scroll horizontally if needed</div>

        {/* Horizontally scrollable pipeline */}
        <div className="overflow-x-auto pb-2">
          <div className="space-y-8" style={{ minWidth: '1080px' }}>
            <TrackPipeline
              track="ADR"
              phases={ADR_PHASES}
              integrations={adrIntegrations}
              teamNames={adrTeamNames}
              onCardClick={setSelectedIntegration}
            />

            {/* Team Pathway Bridge — replaces static separator */}
            <TeamPathwayBridge
              pathways={pathways}
              projectId={projectId}
              onPathwaysUpdate={onPathwaysUpdate}
            />

            <TrackPipeline
              track="Biggy"
              phases={BIGGY_PHASES}
              integrations={biggyIntegrations}
              teamNames={biggyTeamNames}
              onCardClick={setSelectedIntegration}
            />
          </div>
        </div>
      </div>

      {selectedIntegration && (
        <IntegrationDetailDrawer
          integration={selectedIntegration}
          onClose={() => setSelectedIntegration(null)}
        />
      )}
    </div>
  )
}

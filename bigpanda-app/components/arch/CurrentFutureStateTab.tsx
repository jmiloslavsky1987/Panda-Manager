'use client'
import { useState } from 'react'
import { ArchitectureIntegration, TeamOnboardingStatus, TeamPathway, ArchTrack, ArchNode } from '@/lib/queries'
import { IntegrationEditModal } from './IntegrationEditModal'
import { TeamOnboardingTable } from './TeamOnboardingTable'
import { InteractiveArchGraph } from './InteractiveArchGraph'


interface Props {
  projectId: number
  customer: string
  integrations: ArchitectureIntegration[]
  onboardingRows: TeamOnboardingStatus[]
  pathways: TeamPathway[]
  tracks: ArchTrack[]
  nodes: ArchNode[]
  onIntegrationsUpdate: (integrations: ArchitectureIntegration[]) => void
  onOnboardingUpdate: (rows: TeamOnboardingStatus[]) => void
  onPathwaysUpdate: (p: TeamPathway[]) => void
}

interface EditModalState {
  integration: ArchitectureIntegration | null
  defaultTrack: 'ADR' | 'Biggy'
}

export function CurrentFutureStateTab({
  projectId,
  customer,
  integrations,
  onboardingRows,
  pathways,
  tracks,
  nodes,
  onIntegrationsUpdate,
  onOnboardingUpdate,
  onPathwaysUpdate,
}: Props) {
  const [editModal, setEditModal] = useState<EditModalState | null>(null)

  function handleSaveIntegration(saved: ArchitectureIntegration) {
    const existing = integrations.find((i) => i.id === saved.id)
    if (existing) {
      onIntegrationsUpdate(integrations.map((i) => (i.id === saved.id ? saved : i)))
    } else {
      onIntegrationsUpdate([...integrations, saved])
    }
    setEditModal(null)
  }

  return (
    <div className="space-y-8">
      {/* Architecture diagram header + Add Integration actions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-zinc-900">Integration Architecture</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setEditModal({ integration: null, defaultTrack: 'ADR' })}
              className="px-3 py-1.5 text-xs font-semibold border border-blue-200 bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
            >
              + ADR Integration
            </button>
            <button
              onClick={() => setEditModal({ integration: null, defaultTrack: 'Biggy' })}
              className="px-3 py-1.5 text-xs font-semibold border border-purple-200 bg-purple-50 text-purple-700 rounded hover:bg-purple-100"
            >
              + Biggy Integration
            </button>
          </div>
        </div>

        {/* Pipeline architecture diagram */}
        <InteractiveArchGraph
          integrations={integrations}
          pathways={pathways}
          projectId={projectId}
          tracks={tracks}
          nodes={nodes}
          onPathwaysUpdate={onPathwaysUpdate}
          adrTeamNames={onboardingRows.filter((r) => r.track === 'ADR').map((r) => r.team_name)}
          biggyTeamNames={onboardingRows.filter((r) => r.track === 'Biggy').map((r) => r.team_name)}
        />
      </div>

      {/* Team Onboarding Status table remains below the graph */}
      <TeamOnboardingTable
        projectId={projectId}
        rows={onboardingRows}
        onUpdate={onOnboardingUpdate}
      />

      {/* Integration Edit Modal (unchanged) */}
      {editModal !== null && (
        <IntegrationEditModal
          projectId={projectId}
          integration={editModal.integration}
          defaultTrack={editModal.defaultTrack}
          onSave={handleSaveIntegration}
          onClose={() => setEditModal(null)}
        />
      )}
    </div>
  )
}

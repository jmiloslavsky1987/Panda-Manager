'use client'
import { useState } from 'react'
import dynamic from 'next/dynamic'
import { ArchitectureIntegration, TeamOnboardingStatus } from '@/lib/queries'
import { IntegrationEditModal } from './IntegrationEditModal'
import { TeamOnboardingTable } from './TeamOnboardingTable'

// SSR-safe dynamic import: @xyflow/react uses DOM APIs unavailable in Node.js SSR.
const InteractiveArchGraph = dynamic(
  () => import('./InteractiveArchGraph').then((m) => ({ default: m.InteractiveArchGraph })),
  {
    ssr: false,
    loading: () => (
      <div className="h-[400px] border border-zinc-200 rounded-lg flex items-center justify-center text-zinc-400 text-sm">
        Loading architecture diagram...
      </div>
    ),
  },
)


interface Props {
  projectId: number
  customer: string
  integrations: ArchitectureIntegration[]
  onboardingRows: TeamOnboardingStatus[]
  onIntegrationsUpdate: (integrations: ArchitectureIntegration[]) => void
  onOnboardingUpdate: (rows: TeamOnboardingStatus[]) => void
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
  onIntegrationsUpdate,
  onOnboardingUpdate,
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

        {/* Interactive React Flow architecture graph (VIS-02) */}
        <InteractiveArchGraph integrations={integrations} />
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

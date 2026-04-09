'use client'
import { useState } from 'react'
import { ArchTabData, ArchitectureIntegration, BeforeState, TeamOnboardingStatus, TeamPathway, ArchTrack, ArchNode } from '@/lib/queries'
import { BeforeBigPandaTab } from './BeforeBigPandaTab'
import { CurrentFutureStateTab } from './CurrentFutureStateTab'

interface Props {
  projectId: number
  customer: string
  data: ArchTabData
  tracks: ArchTrack[]
  nodes: ArchNode[]
}

type TabId = 'before' | 'current'

export function WorkflowDiagram({ projectId, customer, data, tracks, nodes }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('before')
  const [integrations, setIntegrations] = useState<ArchitectureIntegration[]>(data.architectureIntegrations)
  const [beforeStateData, setBeforeStateData] = useState<BeforeState | null>(data.beforeState)
  const [onboardingRows, setOnboardingRows] = useState<TeamOnboardingStatus[]>(data.teamOnboardingStatus)
  const [pathways, setPathways] = useState<TeamPathway[]>(data.teamPathways)

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-2 mb-6 border-b border-zinc-200 pb-2">
        <button
          onClick={() => setActiveTab('before')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t ${activeTab === 'before' ? 'bg-white border border-b-white text-zinc-900' : 'text-zinc-500 hover:text-zinc-700'}`}
        >
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#9ca3af', display: 'inline-block' }} />
          Before BigPanda
        </button>
        <button
          onClick={() => setActiveTab('current')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t ${activeTab === 'current' ? 'bg-white border border-b-white text-zinc-900' : 'text-zinc-500 hover:text-zinc-700'}`}
        >
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
          Current &amp; Future State
        </button>
      </div>

      {/* Tab content */}
      {activeTab === 'before' ? (
        <BeforeBigPandaTab
          projectId={projectId}
          customer={customer}
          beforeState={beforeStateData}
          onUpdate={setBeforeStateData}
        />
      ) : (
        <CurrentFutureStateTab
          projectId={projectId}
          customer={customer}
          integrations={integrations}
          onboardingRows={onboardingRows}
          pathways={pathways}
          tracks={tracks}
          nodes={nodes}
          onIntegrationsUpdate={setIntegrations}
          onPathwaysUpdate={setPathways}
        />
      )}
    </div>
  )
}

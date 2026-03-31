'use client'
import { useState } from 'react'
import dynamic from 'next/dynamic'
import type { TeamsTabData, BusinessOutcome, E2eWorkflowWithSteps, FocusArea } from '@/lib/queries'
import { BusinessOutcomesSection } from './BusinessOutcomesSection'
import { ArchOverviewSection } from './ArchOverviewSection'
import { E2eWorkflowsSection } from './E2eWorkflowsSection'
import { TeamsEngagementSection } from './TeamsEngagementSection'
import { FocusAreasSection } from './FocusAreasSection'

// SSR-safe dynamic import: @xyflow/react uses ResizeObserver and DOM APIs unavailable in Node.js SSR.
// dynamic() with { ssr: false } prevents hydration errors.
// Verified with: next build && next start (dev mode does NOT surface hydration errors).
const InteractiveEngagementGraph = dynamic(
  () => import('./InteractiveEngagementGraph').then((m) => ({ default: m.InteractiveEngagementGraph })),
  {
    ssr: false,
    loading: () => (
      <div className="h-96 border border-zinc-200 rounded-lg flex items-center justify-center text-zinc-400 text-sm">
        Loading engagement graph...
      </div>
    ),
  },
)

interface Props {
  projectId: number
  customer: string
  data: TeamsTabData
}

export function TeamEngagementMap({ projectId, customer, data }: Props) {
  const [outcomes, setOutcomes] = useState<BusinessOutcome[]>(data.businessOutcomes)
  const [workflows, setWorkflows] = useState<E2eWorkflowWithSteps[]>(data.e2eWorkflows)
  const [focusAreas, setFocusAreas] = useState<FocusArea[]>(data.focusAreas)

  return (
    <div className="space-y-10">
      {/* Interactive React Flow engagement graph (VIS-01) — prepended above existing sections */}
      <section>
        <h2 className="text-lg font-semibold text-zinc-900 mb-4">Engagement Map</h2>
        <InteractiveEngagementGraph data={{ ...data, e2eWorkflows: workflows }} />
      </section>

      <BusinessOutcomesSection
        projectId={projectId}
        outcomes={outcomes}
        onUpdate={setOutcomes}
      />
      <ArchOverviewSection integrations={data.architectureIntegrations} />
      <E2eWorkflowsSection
        projectId={projectId}
        workflows={workflows}
        onUpdate={setWorkflows}
      />
      <TeamsEngagementSection
        customer={customer}
        workflows={workflows}
        openActions={data.openActions}
      />
      <FocusAreasSection
        projectId={projectId}
        focusAreas={focusAreas}
        onUpdate={setFocusAreas}
      />
    </div>
  )
}

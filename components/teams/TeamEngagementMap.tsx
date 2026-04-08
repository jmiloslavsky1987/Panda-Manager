'use client'
import { useState } from 'react'
import type { TeamsTabData, BusinessOutcome, E2eWorkflowWithSteps, FocusArea } from '@/lib/queries'
import { BusinessOutcomesSection } from './BusinessOutcomesSection'
import { ArchOverviewSection } from './ArchOverviewSection'
import { E2eWorkflowsSection } from './E2eWorkflowsSection'
import { TeamsEngagementSection } from './TeamsEngagementSection'
import { FocusAreasSection } from './FocusAreasSection'

function SectionHeader({ n, title }: { n: number; title: string }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-3">
        <span className="w-8 h-8 rounded-full bg-zinc-800 text-white flex items-center justify-center text-sm font-bold flex-shrink-0 flex-none">
          {n}
        </span>
        <h2 className="text-xl font-bold text-zinc-900">{title}</h2>
      </div>
      <hr className="border-zinc-200" />
    </div>
  )
}

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
      <SectionHeader n={1} title="Business Value &amp; Expected Outcomes" />
      <BusinessOutcomesSection
        projectId={projectId}
        outcomes={outcomes}
        onUpdate={setOutcomes}
      />

      <SectionHeader n={2} title="Architecture Overview" />
      <ArchOverviewSection integrations={data.architectureIntegrations} />

      <SectionHeader n={3} title="End-to-End Workflows" />
      <E2eWorkflowsSection
        projectId={projectId}
        workflows={workflows}
        onUpdate={setWorkflows}
      />

      <SectionHeader n={4} title="Teams &amp; Engagement Status" />
      <TeamsEngagementSection
        customer={customer}
        workflows={workflows}
        openActions={data.openActions}
        teamOnboardingStatus={data.teamOnboardingStatus}
        stakeholders={data.stakeholders}
      />

      <SectionHeader n={5} title="Top Focus Areas" />
      <FocusAreasSection
        projectId={projectId}
        focusAreas={focusAreas}
        onUpdate={setFocusAreas}
      />
    </div>
  )
}

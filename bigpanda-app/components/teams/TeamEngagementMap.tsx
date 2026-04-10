'use client'
import { useState } from 'react'
import type { TeamsTabData, BusinessOutcome, E2eWorkflowWithSteps, FocusArea, TeamOnboardingStatus } from '@/lib/queries'
import { BusinessOutcomesSection } from './BusinessOutcomesSection'
import { E2eWorkflowsSection } from './E2eWorkflowsSection'
import { TeamsEngagementSection } from './TeamsEngagementSection'
import { FocusAreasSection } from './FocusAreasSection'
import { TeamOnboardingTable } from '@/components/arch/TeamOnboardingTable'

interface Props {
  projectId: number
  customer: string
  data: TeamsTabData
}

export function TeamEngagementMap({ projectId, customer, data }: Props) {
  const [outcomes, setOutcomes] = useState<BusinessOutcome[]>(data.businessOutcomes)
  const [workflows, setWorkflows] = useState<E2eWorkflowWithSteps[]>(data.e2eWorkflows)
  const [focusAreas, setFocusAreas] = useState<FocusArea[]>(data.focusAreas)
  const [onboardingRows, setOnboardingRows] = useState<TeamOnboardingStatus[]>(data.teamOnboardingStatus)

  return (
    <div className="space-y-10">
      <h2 className="text-xl font-bold text-zinc-900 border-b border-zinc-200 pb-2 mb-6">
        Business Value &amp; Expected Outcomes
      </h2>
      <BusinessOutcomesSection
        projectId={projectId}
        outcomes={outcomes}
        onUpdate={setOutcomes}
      />

      <h2 className="text-xl font-bold text-zinc-900 border-b border-zinc-200 pb-2 mb-6">
        End-to-End Workflows
      </h2>
      <E2eWorkflowsSection
        projectId={projectId}
        workflows={workflows}
        onUpdate={setWorkflows}
      />

      <h2 className="text-xl font-bold text-zinc-900 border-b border-zinc-200 pb-2 mb-6">
        Teams &amp; Engagement Status
      </h2>
      <TeamsEngagementSection
        customer={customer}
        workflows={workflows}
        openActions={data.openActions}
        teamOnboardingStatus={onboardingRows}
        stakeholders={data.stakeholders}
      />
      <TeamOnboardingTable
        projectId={projectId}
        rows={onboardingRows}
        onUpdate={setOnboardingRows}
      />

      <h2 className="text-xl font-bold text-zinc-900 border-b border-zinc-200 pb-2 mb-6">
        Top Focus Areas
      </h2>
      <FocusAreasSection
        projectId={projectId}
        focusAreas={focusAreas}
        onUpdate={setFocusAreas}
      />
    </div>
  )
}

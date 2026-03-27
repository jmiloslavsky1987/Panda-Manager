'use client'

import { useState } from 'react'
import type {
  TeamsTabData,
  BusinessOutcome,
  E2eWorkflowWithSteps,
  FocusArea,
} from '@/lib/queries'
import { BusinessOutcomesSection } from './BusinessOutcomesSection'
import { ArchOverviewSection } from './ArchOverviewSection'
import { E2eWorkflowsSection } from './E2eWorkflowsSection'
import { TeamsEngagementSection } from './TeamsEngagementSection'
import { FocusAreasSection } from './FocusAreasSection'

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

import { getTeamsTabData, getProjectById } from '@/lib/queries'
import { TeamEngagementMap } from '@/components/teams/TeamEngagementMap'
import { EmptyState } from '@/components/EmptyState'

export default async function TeamsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const projectId = parseInt(id, 10)
  const [data, project] = await Promise.all([
    getTeamsTabData(projectId),
    getProjectById(projectId),
  ])

  // Check if truly empty
  const isEmpty = data.teamOnboardingStatuses.length === 0 &&
    data.e2eWorkflows.length === 0 &&
    data.businessOutcomes.length === 0

  if (isEmpty) {
    return (
      <div data-testid="teams-tab">
        <EmptyState
          title="No team data yet"
          description="The Teams tab captures team structure, workflows, and engagement. Data populates from document ingestion or manual entry."
          action={{ label: 'Add Team Member', onClick: () => {} }}
        />
      </div>
    )
  }

  return (
    <div data-testid="teams-tab" className="space-y-8">
      <TeamEngagementMap
        projectId={projectId}
        customer={project.customer}
        data={data}
      />
    </div>
  )
}

import { getTeamsTabData, getProjectById } from '@/lib/queries'
import { TeamsPageTabs } from '@/components/teams/TeamsPageTabs'
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
  const isEmpty = data.e2eWorkflows.length === 0 &&
    data.businessOutcomes.length === 0 &&
    data.architectureIntegrations.length === 0

  if (isEmpty) {
    return (
      <div data-testid="teams-tab">
        <EmptyState
          title="No team data yet"
          description="The Teams tab captures team structure, workflows, and engagement. Data populates from document ingestion or manual entry."
          action={{ label: 'Upload Document', href: `/customer/${id}/context` }}
        />
      </div>
    )
  }

  return (
    <div data-testid="teams-tab" className="space-y-8">
      <TeamsPageTabs
        projectId={projectId}
        customer={project.customer}
        data={data}
      />
    </div>
  )
}

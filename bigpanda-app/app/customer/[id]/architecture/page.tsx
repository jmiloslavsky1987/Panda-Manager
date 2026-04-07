import { getArchTabData, getProjectById } from '@/lib/queries'
import { WorkflowDiagram } from '@/components/arch/WorkflowDiagram'
import { EmptyState } from '@/components/EmptyState'

export default async function ArchitecturePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const projectId = parseInt(id, 10)
  const [data, project] = await Promise.all([
    getArchTabData(projectId),
    getProjectById(projectId),
  ])

  // Check if truly empty
  const isEmpty = data.architectureIntegrations.length === 0 &&
    data.teamOnboardingStatus.length === 0

  if (isEmpty) {
    return (
      <div data-testid="architecture-tab">
        <EmptyState
          title="No architecture data yet"
          description="The Architecture tab visualises integrations and team pathways. Data populates from document ingestion."
          action={{ label: 'Add Component', onClick: () => {} }}
        />
      </div>
    )
  }

  return (
    <div data-testid="architecture-tab" className="space-y-6">
      <WorkflowDiagram projectId={projectId} customer={project.customer} data={data} />
    </div>
  )
}

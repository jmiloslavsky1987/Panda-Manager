import { getArchTabData, getProjectById } from '@/lib/queries'
import { WorkflowDiagram } from '@/components/arch/WorkflowDiagram'

export default async function ArchitecturePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const projectId = parseInt(id, 10)
  const [data, project] = await Promise.all([
    getArchTabData(projectId),
    getProjectById(projectId),
  ])
  return (
    <div data-testid="architecture-tab" className="space-y-6">
      <WorkflowDiagram projectId={projectId} customer={project.customer} data={data} />
    </div>
  )
}

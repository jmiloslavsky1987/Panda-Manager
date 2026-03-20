import { getTasksForProject, getPlanTemplates } from '@/lib/queries'
import { PhaseBoard } from '@/components/PhaseBoard'

export default async function PhaseBoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const projectId = parseInt(id, 10)

  const [tasks, templates] = await Promise.all([
    getTasksForProject(projectId),
    getPlanTemplates(),
  ])

  return (
    <div className="p-4">
      <PhaseBoard tasks={tasks} projectId={projectId} templates={templates} />
    </div>
  )
}

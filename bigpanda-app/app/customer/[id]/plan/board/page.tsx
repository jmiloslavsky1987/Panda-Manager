import { getTasksForProject, getPlanTemplates } from '@/lib/queries'
import { PhaseBoard } from '@/components/PhaseBoard'
import { AiPlanPanel } from '@/components/AiPlanPanel'

export default async function PhaseBoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const projectId = parseInt(id, 10)

  let tasks: Awaited<ReturnType<typeof getTasksForProject>> = []
  let templates: Awaited<ReturnType<typeof getPlanTemplates>> = []
  try {
    ;[tasks, templates] = await Promise.all([
      getTasksForProject(projectId),
      getPlanTemplates(),
    ])
  } catch {
    // DB not available — render empty board
  }

  return (
    <div className="p-4">
      <AiPlanPanel projectId={projectId} />
      <PhaseBoard tasks={tasks} projectId={projectId} templates={templates} />
    </div>
  )
}

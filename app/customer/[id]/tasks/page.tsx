import { getTasksForProject } from '@/lib/queries'
import { TaskBoard } from '@/components/TaskBoard'

export default async function TaskBoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const projectId = parseInt(id, 10)

  let tasks: Awaited<ReturnType<typeof getTasksForProject>> = []
  try {
    tasks = await getTasksForProject(projectId)
  } catch {
    // DB not available — render empty board
  }

  return (
    <div className="p-4">
      <TaskBoard tasks={tasks} projectId={projectId} />
    </div>
  )
}

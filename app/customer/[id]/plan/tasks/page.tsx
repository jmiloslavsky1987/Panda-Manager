import { getTasksForProject } from '@/lib/queries'
import { TaskBoard } from '@/components/TaskBoard'

export default async function TaskBoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const projectId = parseInt(id, 10)

  const tasks = await getTasksForProject(projectId)

  return (
    <div className="p-4">
      <TaskBoard tasks={tasks} projectId={projectId} />
    </div>
  )
}

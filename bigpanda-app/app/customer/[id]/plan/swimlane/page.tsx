import { getTasksForProject, getWorkstreamsWithProgress } from '@/lib/queries'
import { SwimlaneView } from '@/components/SwimlaneView'

export default async function SwimlanePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const projectId = parseInt(id)

  const [tasks, workstreams] = await Promise.all([
    getTasksForProject(projectId),
    getWorkstreamsWithProgress(projectId),
  ])

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Team Swimlane</h2>
        <p className="text-xs text-zinc-400">
          {workstreams.length} workstreams · {tasks.length} tasks
        </p>
      </div>
      {tasks.length === 0 ? (
        <p className="text-zinc-500 text-sm">
          No tasks yet. Create tasks in the Phase Board or Task Board first.
        </p>
      ) : (
        <SwimlaneView tasks={tasks} workstreams={workstreams} projectId={projectId} />
      )}
    </div>
  )
}

import { getTasksForProject, getWorkstreamsWithProgress } from '@/lib/queries'
import { SwimlaneView } from '@/components/SwimlaneView'

export default async function SwimlanePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const projectId = parseInt(id)

  let tasks: Awaited<ReturnType<typeof getTasksForProject>> = []
  let workstreams: Awaited<ReturnType<typeof getWorkstreamsWithProgress>> = []
  try {
    ;[tasks, workstreams] = await Promise.all([
      getTasksForProject(projectId),
      getWorkstreamsWithProgress(projectId),
    ])
  } catch {
    // DB not available — render empty swimlane
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Team Swimlane</h2>
        <p className="text-xs text-zinc-400">
          {workstreams.length} workstreams · {tasks.length} tasks
        </p>
      </div>
      <SwimlaneView tasks={tasks} workstreams={workstreams} projectId={projectId} />
    </div>
  )
}

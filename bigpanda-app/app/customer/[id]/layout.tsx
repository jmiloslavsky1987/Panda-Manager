import { Suspense } from 'react'
import { getProjectWithHealth } from '../../../lib/queries'
import { ProjectHeader } from '../../../components/ProjectHeader'
import { WorkspaceTabs } from '../../../components/WorkspaceTabs'
import { AddNotesModal } from '../../../components/AddNotesModal'
import { ScanForUpdatesButton } from '../../../components/ScanForUpdatesButton'

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const projectId = parseInt(id, 10)
  // Graceful fallback when DB is unavailable (e.g. PostgreSQL not installed in dev)
  let project = null
  try {
    project = await getProjectWithHealth(projectId)
  } catch {
    // DB not available — render layout with empty project so child routes can still render
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-6 pb-2 border-b border-zinc-200 bg-white">
        {project ? (
          <ProjectHeader project={project} />
        ) : (
          <div className="flex items-center gap-3">
            <h1 className="font-semibold text-xl text-zinc-400">Loading project…</h1>
          </div>
        )}
      </div>
      <Suspense fallback={null}>
        <WorkspaceTabs projectId={id} />
      </Suspense>
      <div className="px-6 py-2 border-b border-zinc-100 bg-zinc-50 flex items-center justify-end">
        <ScanForUpdatesButton projectId={projectId} />
      </div>
      <div className="flex-1 p-6 overflow-y-auto">
        {children}
      </div>
      {project && <AddNotesModal projectId={projectId} />}
    </div>
  )
}

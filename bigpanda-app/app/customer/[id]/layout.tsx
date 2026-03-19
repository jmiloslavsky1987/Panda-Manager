import { getProjectWithHealth } from '../../../lib/queries'
import { ProjectHeader } from '../../../components/ProjectHeader'
import { WorkspaceTabs } from '../../../components/WorkspaceTabs'

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const projectId = parseInt(id, 10)
  const project = await getProjectWithHealth(projectId)

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-6 pb-2 border-b border-zinc-200 bg-white">
        <ProjectHeader project={project} />
      </div>
      <WorkspaceTabs projectId={id} />
      <div className="flex-1 p-6 overflow-y-auto">
        {children}
      </div>
      <button
        data-testid="add-notes-btn-placeholder"
        className="fixed bottom-6 right-6 rounded-full bg-zinc-900 text-white px-4 py-2 shadow-lg z-50 hover:bg-zinc-700"
        disabled
      >
        + Add Notes
      </button>
    </div>
  )
}

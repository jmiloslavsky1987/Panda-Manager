import { getProjectWithHealth } from '../../../lib/queries'
import { ProjectHeader } from '../../../components/ProjectHeader'
import { WorkspaceTabs } from '../../../components/WorkspaceTabs'
import { AddNotesModal } from '../../../components/AddNotesModal'

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
      <AddNotesModal projectId={projectId} />
    </div>
  )
}

import { getWbsItems, getProjectWithHealth, getTasksForProject } from '@/lib/queries'
import { WbsTree } from '@/components/WbsTree'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function WbsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/login')

  const { id } = await params
  const projectId = parseInt(id, 10)

  const [adrItems, biggyItems, project, tasks] = await Promise.all([
    getWbsItems(projectId, 'ADR'),
    getWbsItems(projectId, 'Biggy'),
    getProjectWithHealth(projectId).catch(() => null),
    getTasksForProject(projectId).catch(() => []),
  ])

  const activeTracks = (project?.active_tracks as { adr: boolean; biggy: boolean } | null) ?? { adr: true, biggy: true }

  return (
    <div className="p-6">
      <WbsTree
        adrItems={adrItems}
        biggyItems={biggyItems}
        projectId={projectId}
        activeTracks={activeTracks}
        tasks={tasks}
      />
    </div>
  )
}

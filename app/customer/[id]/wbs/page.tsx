import { getWbsItems, getProjectById, getWbsDependencies } from '@/lib/queries'
import { WbsPageClient } from './WbsPageClient'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function WbsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/login')

  const { id } = await params
  const projectId = parseInt(id, 10)

  const project = await getProjectById(projectId)
  const activeTracks = project.active_tracks ?? { adr: false, biggy: false, incident_prevention: false }

  const [adrItems, biggyItems, incidentPreventionItems, deps] = await Promise.all([
    activeTracks.adr ? getWbsItems(projectId, 'ADR') : Promise.resolve([]),
    activeTracks.biggy ? getWbsItems(projectId, 'Biggy') : Promise.resolve([]),
    activeTracks.incident_prevention ? getWbsItems(projectId, 'Incident Prevention') : Promise.resolve([]),
    getWbsDependencies(projectId).catch(() => []),
  ])

  return (
    <div className="p-4">
      <WbsPageClient
        projectId={projectId}
        activeTracks={activeTracks}
        adrItems={adrItems}
        biggyItems={biggyItems}
        incidentPreventionItems={incidentPreventionItems}
        dependencies={deps}
      />
    </div>
  )
}

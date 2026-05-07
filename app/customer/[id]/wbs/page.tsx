import { getWbsItems, getProjectWithHealth, getWbsDependencies } from '@/lib/queries'
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

  const [adrItems, biggyItems, deps] = await Promise.all([
    getWbsItems(projectId, 'ADR'),
    getWbsItems(projectId, 'Biggy'),
    getWbsDependencies(projectId).catch(() => []),
  ])

  return (
    <div className="p-6">
      <WbsPageClient
        projectId={projectId}
        adrItems={adrItems}
        biggyItems={biggyItems}
        dependencies={deps}
      />
    </div>
  )
}

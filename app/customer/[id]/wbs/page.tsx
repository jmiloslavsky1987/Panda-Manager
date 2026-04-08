import { getWbsItems } from '@/lib/queries'
import { WbsTree } from '@/components/WbsTree'
import { WbsGeneratePlanModal } from '@/components/WbsGeneratePlanModal'
import { requireSession } from '@/lib/auth-server'

export default async function WbsPage({ params }: { params: Promise<{ id: string }> }) {
  const { session, redirectResponse } = await requireSession()
  if (redirectResponse) return redirectResponse

  const { id } = await params
  const projectId = parseInt(id, 10)

  const [adrItems, biggyItems] = await Promise.all([
    getWbsItems(projectId, 'ADR'),
    getWbsItems(projectId, 'Biggy'),
  ])

  return (
    <div className="p-6">
      <WbsTree
        adrItems={adrItems}
        biggyItems={biggyItems}
        projectId={projectId}
        showGeneratePlan
      />
    </div>
  )
}

import { getWbsItems } from '@/lib/queries'
import { WbsTree } from '@/components/WbsTree'
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
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-zinc-800">Work Breakdown Structure</h1>
        {/* Generate Plan button placeholder — wired in Plan 03 */}
      </div>
      <WbsTree adrItems={adrItems} biggyItems={biggyItems} projectId={projectId} />
    </div>
  )
}

import { Suspense } from 'react'
import { getWorkspaceData } from '../../../../lib/queries'
import DecisionsTableClient from '@/components/DecisionsTableClient'

export default async function DecisionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const projectId = parseInt(id, 10)
  const data = await getWorkspaceData(projectId)

  return (
    <Suspense fallback={<div className="text-sm text-zinc-500">Loading decisions...</div>}>
      <DecisionsTableClient
        decisions={data.keyDecisions}
        projectId={projectId}
        artifacts={data.artifacts}
      />
    </Suspense>
  )
}

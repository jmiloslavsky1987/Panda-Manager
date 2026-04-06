import { getWorkspaceData } from '../../../../lib/queries'
import { RisksTableClient } from '../../../../components/RisksTableClient'

export default async function RisksPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const projectId = parseInt(id, 10)

  let data: Awaited<ReturnType<typeof getWorkspaceData>> | null = null
  try {
    data = await getWorkspaceData(projectId)
  } catch {
    // DB not available — render empty state
  }

  const risks = data?.risks ?? []
  const artifacts = data?.artifacts ?? []

  return (
    <div data-testid="risks-tab">
      <RisksTableClient risks={risks} artifacts={artifacts} projectId={projectId} />
    </div>
  )
}

import { getWorkspaceData } from '../../../../lib/queries'
import { MilestonesTableClient } from '../../../../components/MilestonesTableClient'

export default async function MilestonesPage({
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

  const milestones = data?.milestones ?? []
  const artifacts = data?.artifacts ?? []

  return (
    <div data-testid="milestones-tab">
      <MilestonesTableClient milestones={milestones} artifacts={artifacts} projectId={projectId} />
    </div>
  )
}

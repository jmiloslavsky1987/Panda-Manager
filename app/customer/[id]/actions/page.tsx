import { getWorkspaceData } from '../../../../lib/queries'
import { ActionsTableClient } from '../../../../components/ActionsTableClient'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default async function ActionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: SearchParams
}) {
  const { id } = await params
  // Await searchParams to avoid Next.js 16 async warning (plan pitfall 7)
  await searchParams

  const projectId = parseInt(id, 10)

  let data: Awaited<ReturnType<typeof getWorkspaceData>> | null = null
  try {
    data = await getWorkspaceData(projectId)
  } catch {
    // DB not available — render empty state
  }

  const allActions = data?.actions ?? []

  return (
    <div data-testid="actions-tab">
      <ActionsTableClient actions={allActions} projectId={projectId} />
    </div>
  )
}

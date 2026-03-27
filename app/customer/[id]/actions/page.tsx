import Link from 'next/link'
import { getWorkspaceData } from '../../../../lib/queries'
import { Badge } from '../../../../components/ui/badge'
import { ActionEditModal } from '../../../../components/ActionEditModal'
import { SourceBadge } from '../../../../components/SourceBadge'

const PAGE_SIZE = 50

function isOverdue(due: string | null | undefined, status: string): boolean {
  if (!due) return false
  // Skip TBD / N/A / – / short strings
  if (!/^\d{4}-\d{2}-\d{2}/.test(due)) return false
  if (!['open', 'in_progress'].includes(status)) return false
  const dueDate = new Date(due)
  if (isNaN(dueDate.getTime())) return false
  return dueDate < new Date()
}

const statusBadgeColors: Record<string, string> = {
  open: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-orange-100 text-orange-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-zinc-100 text-zinc-600',
}

type SearchParams = Promise<{ status?: string }>

export default async function ActionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: SearchParams
}) {
  const { id } = await params
  const sp = await searchParams
  const statusFilter = sp.status ?? ''
  const projectId = parseInt(id, 10)
  let data: Awaited<ReturnType<typeof getWorkspaceData>> | null = null
  try {
    data = await getWorkspaceData(projectId)
  } catch {
    // DB not available — render empty state
  }

  const allActions = data?.actions ?? []
  const allArtifacts = data?.artifacts ?? []
  const artifactMap = new Map(allArtifacts.map((a) => [a.id, a.name]))

  const filtered = statusFilter
    ? allActions.filter((a) => a.status === statusFilter)
    : allActions

  const displayed = filtered.slice(0, PAGE_SIZE)

  const filterOptions = [
    { label: 'All', value: '' },
    { label: 'Open', value: 'open' },
    { label: 'In Progress', value: 'in_progress' },
    { label: 'Completed', value: 'completed' },
    { label: 'Cancelled', value: 'cancelled' },
  ]

  return (
    <div data-testid="actions-tab" className="space-y-4">
      {/* Filter links */}
      <div className="flex flex-wrap items-center gap-2">
        {filterOptions.map((opt) => {
          const href = opt.value
            ? `/customer/${id}/actions?status=${opt.value}`
            : `/customer/${id}/actions`
          const isActive = statusFilter === opt.value
          return (
            <Link key={opt.value} href={href}>
              <Badge
                className={
                  isActive
                    ? 'cursor-pointer bg-zinc-900 text-white'
                    : 'cursor-pointer bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                }
              >
                {opt.label}
              </Badge>
            </Link>
          )
        })}
      </div>

      {/* Count */}
      <p className="text-sm text-zinc-500">
        Showing {displayed.length} of {filtered.length} action
        {filtered.length !== 1 ? 's' : ''}
        {statusFilter && ` (filtered: ${statusFilter.replace('_', ' ')})`}
      </p>

      {/* Action cards with inline edit modal */}
      <div className="space-y-2">
        {displayed.length === 0 ? (
          <p className="text-zinc-500 text-sm">No actions found.</p>
        ) : (
          displayed.map((action) => {
            const overdue = isOverdue(action.due, action.status)
            const statusKey = action.status
            const badgeClass = statusBadgeColors[statusKey] ?? 'bg-zinc-100 text-zinc-600'

            return (
              <ActionEditModal
                key={action.id}
                action={action}
                trigger={
                  <div
                    className={`border rounded p-3 hover:bg-zinc-50 transition-colors ${
                      overdue ? 'border-red-200 bg-red-50 hover:bg-red-100' : 'border-zinc-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-zinc-400">
                        {action.external_id}
                      </span>
                      <div className="flex items-center gap-1">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${badgeClass}`}
                        >
                          {statusKey.replace('_', ' ')}
                        </span>
                        {overdue && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                            Overdue
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm mt-1 text-zinc-800">{action.description}</p>
                    <div className="flex flex-wrap items-center gap-4 mt-1 text-xs text-zinc-500">
                      <span>Owner: {action.owner ?? '—'}</span>
                      <span>Due: {action.due ?? '—'}</span>
                      <SourceBadge
                        source={action.source}
                        artifactName={action.source_artifact_id ? (artifactMap.get(action.source_artifact_id) ?? null) : null}
                        discoverySource={action.discovery_source}
                      />
                    </div>
                  </div>
                }
              />
            )
          })
        )}
      </div>
    </div>
  )
}

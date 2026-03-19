import Link from 'next/link'
import { getWorkspaceData } from '../../../../lib/queries'
import { Badge } from '../../../../components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../../components/ui/table'

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
  const data = await getWorkspaceData(projectId)

  const allActions = data.actions
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
        Showing {displayed.length} of {filtered.length} action{filtered.length !== 1 ? 's' : ''}
        {statusFilter && ` (filtered: ${statusFilter.replace('_', ' ')})`}
      </p>

      {/* Table */}
      <div className="rounded-md border border-zinc-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">ID</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-[120px]">Owner</TableHead>
              <TableHead className="w-[120px]">Due</TableHead>
              <TableHead className="w-[140px]">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayed.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-zinc-400 py-8">
                  No actions found.
                </TableCell>
              </TableRow>
            ) : (
              displayed.map((action) => {
                const overdue = isOverdue(action.due, action.status)
                const statusKey = action.status
                const badgeClass = statusBadgeColors[statusKey] ?? 'bg-zinc-100 text-zinc-600'
                return (
                  <TableRow key={action.id} className={overdue ? 'bg-red-50' : ''}>
                    <TableCell className="font-mono text-xs text-zinc-500">
                      {action.external_id}
                    </TableCell>
                    <TableCell className="text-sm">{action.description}</TableCell>
                    <TableCell className="text-sm text-zinc-600">{action.owner ?? '—'}</TableCell>
                    <TableCell className="text-sm text-zinc-600">
                      {action.due ?? '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1">
                        <Badge className={`text-xs ${badgeClass}`}>
                          {statusKey.replace('_', ' ')}
                        </Badge>
                        {overdue && (
                          <Badge className="text-xs bg-red-100 text-red-700">Overdue</Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

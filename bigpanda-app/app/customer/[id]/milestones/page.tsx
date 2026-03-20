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
import { MilestoneEditModal } from '../../../../components/MilestoneEditModal'

const statusBadgeColors: Record<string, string> = {
  completed: 'bg-green-100 text-green-800',
  in_progress: 'bg-blue-100 text-blue-800',
  not_started: 'bg-zinc-100 text-zinc-700',
  blocked: 'bg-red-100 text-red-800',
}

function isOverdueMilestone(date: string | null | undefined, status: string | null | undefined): boolean {
  if (!date || !date.trim()) return false
  if (!/^\d{4}-\d{2}-\d{2}/.test(date)) return false
  if ((status ?? '').toLowerCase() === 'completed') return false
  const d = new Date(date)
  if (isNaN(d.getTime())) return false
  return d < new Date()
}

export default async function MilestonesPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const data = await getWorkspaceData(parseInt(id, 10))

  // Sort: incomplete first by target date asc, completed last
  const incomplete = [...data.milestones].filter(
    (m) => (m.status ?? '').toLowerCase() !== 'completed'
  )
  const complete = [...data.milestones].filter(
    (m) => (m.status ?? '').toLowerCase() === 'completed'
  )

  const sortByDate = (a: typeof incomplete[0], b: typeof incomplete[0]) => {
    const aDate = a.target ?? a.date ?? ''
    const bDate = b.target ?? b.date ?? ''
    return aDate.localeCompare(bDate)
  }

  incomplete.sort(sortByDate)
  complete.sort(sortByDate)

  const sortedMilestones = [...incomplete, ...complete]

  return (
    <div data-testid="milestones-tab" className="space-y-4">
      <div className="rounded-md border border-zinc-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[130px]">ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="w-[160px]">Status</TableHead>
              <TableHead className="w-[120px]">Target / Date</TableHead>
              <TableHead className="w-[120px]">Owner</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedMilestones.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-zinc-400 py-8">
                  No milestones found.
                </TableCell>
              </TableRow>
            ) : (
              sortedMilestones.map((m) => {
                const statusKey = (m.status ?? '').toLowerCase().replace(/\s+/g, '_')
                const badgeClass = statusBadgeColors[statusKey] ?? 'bg-zinc-100 text-zinc-700'
                const displayDate = m.target ?? m.date ?? '—'
                const overdue = isOverdueMilestone(m.target ?? m.date, m.status)
                return (
                  <MilestoneEditModal
                    key={m.id}
                    milestone={m}
                    trigger={
                      <TableRow>
                        <TableCell className="font-mono text-xs text-zinc-500">
                          {m.external_id}
                        </TableCell>
                        <TableCell className="text-sm font-medium">{m.name}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-1">
                            <Badge className={`text-xs ${badgeClass}`}>{m.status ?? 'Unknown'}</Badge>
                            {overdue && (
                              <Badge className="text-xs bg-red-100 text-red-700">Overdue</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-zinc-600">{displayDate}</TableCell>
                        <TableCell className="text-sm text-zinc-600">{m.owner ?? '—'}</TableCell>
                        <TableCell className="text-sm text-zinc-400">
                          {m.notes ? (m.notes.length > 80 ? m.notes.slice(0, 80) + '…' : m.notes) : '—'}
                        </TableCell>
                      </TableRow>
                    }
                  />
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="rounded-md bg-zinc-50 border border-zinc-200 px-4 py-3 text-sm text-zinc-500">
        Click any row to edit milestone status, target date, owner, or notes.
      </div>
    </div>
  )
}

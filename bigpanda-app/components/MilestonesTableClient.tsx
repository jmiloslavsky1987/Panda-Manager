'use client'

import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { MilestoneEditModal } from '@/components/MilestoneEditModal'
import { SourceBadge } from '@/components/SourceBadge'
import { InlineSelectCell } from '@/components/InlineSelectCell'
import { DatePickerCell } from '@/components/DatePickerCell'
import { OwnerCell } from '@/components/OwnerCell'
import { EmptyState } from '@/components/EmptyState'
import type { Milestone, Artifact } from '@/lib/queries'

const MILESTONE_STATUS_OPTIONS: { value: 'not_started' | 'in_progress' | 'completed' | 'blocked'; label: string }[] = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'blocked', label: 'Blocked' },
]

const MILESTONE_STATUS_VALUES = ['not_started', 'in_progress', 'completed', 'blocked'] as const
type MilestoneStatus = typeof MILESTONE_STATUS_VALUES[number]

function normaliseMilestoneStatus(s: string | null | undefined): MilestoneStatus {
  const normalized = (s ?? '').toLowerCase().replace(/\s+/g, '_')
  return MILESTONE_STATUS_VALUES.includes(normalized as MilestoneStatus) ? (normalized as MilestoneStatus) : 'not_started'
}

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

interface MilestonesTableClientProps {
  milestones: Milestone[]
  artifacts: Artifact[]
  projectId: number
}

export function MilestonesTableClient({ milestones, artifacts, projectId }: MilestonesTableClientProps) {
  const router = useRouter()

  async function patchMilestone(id: number, patch: Record<string, unknown>) {
    const res = await fetch(`/api/milestones/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Save failed' }))
      throw new Error(err.error ?? 'Save failed')
    }
    router.refresh()
    window.dispatchEvent(new CustomEvent('metrics:invalidate'))
  }

  const artifactMap = new Map(artifacts.map((a) => [a.id, a.name]))

  const incomplete = milestones.filter((m) => (m.status ?? '').toLowerCase() !== 'completed')
  const complete = milestones.filter((m) => (m.status ?? '').toLowerCase() === 'completed')

  const sortByDate = (a: Milestone, b: Milestone) => {
    const aDate = a.target ?? a.date ?? ''
    const bDate = b.target ?? b.date ?? ''
    return aDate.localeCompare(bDate)
  }

  const sortedMilestones = [...[...incomplete].sort(sortByDate), ...[...complete].sort(sortByDate)]

  // Show empty state when no milestones exist
  if (milestones.length === 0) {
    return (
      <EmptyState
        title="No milestones yet"
        description="Milestones mark key dates and deliverables. Add the first milestone to track progress."
        action={{
          label: 'Add Milestone',
          onClick: () => router.push(`/customer/${projectId}/context`),
        }}
      />
    )
  }

  return (
    <div className="space-y-4">
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
                const statusKey = normaliseMilestoneStatus(m.status)
                const badgeClass = statusBadgeColors[statusKey] ?? 'bg-zinc-100 text-zinc-700'
                const displayDate = m.target ?? m.date ?? null
                const overdue = isOverdueMilestone(displayDate, m.status)
                return (
                  <TableRow
                    key={m.id}
                    className={overdue ? 'border-red-500 bg-red-50' : ''}
                    data-testid={`milestone-row-${m.id}`}
                  >
                    <TableCell className="font-mono text-xs text-zinc-500">{m.external_id}</TableCell>
                    <TableCell className="text-sm font-medium">
                      <div className="space-y-1">
                        <span>{m.name}</span>
                        <div>
                          <SourceBadge
                            source={m.source}
                            artifactName={m.source_artifact_id ? (artifactMap.get(m.source_artifact_id) ?? null) : null}
                            discoverySource={m.discovery_source}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1">
                        <InlineSelectCell
                          value={statusKey}
                          options={MILESTONE_STATUS_OPTIONS}
                          onSave={(v) => patchMilestone(m.id, { status: v })}
                          className={`text-xs font-medium ${badgeClass} px-2 py-0.5 rounded-full`}
                        />
                        {overdue && (
                          <Badge className="text-xs bg-red-100 text-red-700">Overdue</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-zinc-600">
                      <DatePickerCell
                        value={displayDate}
                        onSave={(v) => patchMilestone(m.id, { target_date: v })}
                      />
                    </TableCell>
                    <TableCell className="text-sm text-zinc-600">
                      <OwnerCell
                        value={m.owner}
                        projectId={projectId}
                        onSave={(v) => patchMilestone(m.id, { owner: v })}
                      />
                    </TableCell>
                    <TableCell className="text-sm text-zinc-400">
                      <MilestoneEditModal
                        milestone={m}
                        trigger={
                          <span className="cursor-pointer hover:bg-zinc-100 rounded px-1 py-0.5">
                            {m.notes ? (m.notes.length > 80 ? m.notes.slice(0, 80) + '…' : m.notes) : 'Add notes…'}
                          </span>
                        }
                      />
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
      <div className="rounded-md bg-zinc-50 border border-zinc-200 px-4 py-3 text-sm text-zinc-500">
        Click any cell to edit status, date, or owner inline. Click the notes column to add or edit notes.
      </div>
    </div>
  )
}

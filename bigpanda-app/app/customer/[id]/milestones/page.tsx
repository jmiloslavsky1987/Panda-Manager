'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
import { SourceBadge } from '../../../../components/SourceBadge'
import { InlineSelectCell } from '../../../../components/InlineSelectCell'
import { DatePickerCell } from '../../../../components/DatePickerCell'
import { OwnerCell } from '../../../../components/OwnerCell'
import type { WorkspaceData } from '../../../../lib/queries'

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

async function patchMilestone(id: number, patch: Record<string, unknown>, router: ReturnType<typeof useRouter>) {
  const res = await fetch(`/api/milestones/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
  if (!res.ok) throw new Error('Save failed')
  router.refresh()
}

export default function MilestonesPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const router = useRouter()
  const [data, setData] = useState<WorkspaceData | null>(null)
  const [projectId, setProjectId] = useState<number | null>(null)

  useEffect(() => {
    async function loadData() {
      const { id } = await params
      const parsedId = parseInt(id, 10)
      setProjectId(parsedId)

      const res = await fetch(`/api/workspace-data?project_id=${parsedId}`)
      const result = await res.json()
      setData(result)
    }
    loadData()
  }, [params])

  if (!data || projectId === null) {
    return <div className="text-center py-8 text-zinc-400">Loading...</div>
  }

  const artifactMap = new Map(data.artifacts.map((a) => [a.id, a.name]))

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
                const statusKey = normaliseMilestoneStatus(m.status)
                const badgeClass = statusBadgeColors[statusKey] ?? 'bg-zinc-100 text-zinc-700'
                const displayDate = m.target ?? m.date ?? null
                const overdue = isOverdueMilestone(displayDate, m.status)
                return (
                  <TableRow key={m.id}>
                    <TableCell className="font-mono text-xs text-zinc-500">
                      {m.external_id}
                    </TableCell>
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
                          onSave={async (v) => patchMilestone(m.id, { status: v }, router)}
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
                        onSave={async (v) => patchMilestone(m.id, { target_date: v }, router)}
                      />
                    </TableCell>
                    <TableCell className="text-sm text-zinc-600">
                      <OwnerCell
                        value={m.owner}
                        projectId={projectId}
                        onSave={async (v) => patchMilestone(m.id, { owner: v }, router)}
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
        Click any row to edit milestone status, target date, owner, or notes.
      </div>
    </div>
  )
}

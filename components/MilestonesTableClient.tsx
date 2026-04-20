'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useMemo, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { MilestoneEditModal } from '@/components/MilestoneEditModal'
import { SourceBadge } from '@/components/SourceBadge'
import { InlineSelectCell } from '@/components/InlineSelectCell'
import { DatePickerCell } from '@/components/DatePickerCell'
import { OwnerCell } from '@/components/OwnerCell'
import { EmptyState } from '@/components/EmptyState'
import { AddMilestoneModal } from '@/components/AddMilestoneModal'
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
  const searchParams = useSearchParams()
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [q, setQ] = useState('')

  // Read filter values from URL params
  const statusFilter = searchParams.get('status') ?? ''
  const ownerFilter = searchParams.get('owner') ?? ''
  const fromDate = searchParams.get('from') ?? ''
  const toDate = searchParams.get('to') ?? ''

  // Update URL param helper
  const updateParam = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    router.push(`?${params.toString()}`, { scroll: false })
  }, [router, searchParams])

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

  // Bulk update status
  async function bulkUpdateStatus(status: string) {
    await fetch('/api/milestones/bulk-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ milestone_ids: Array.from(selectedIds), patch: { status } }),
    })
    setSelectedIds(new Set())
    router.refresh()
    window.dispatchEvent(new CustomEvent('metrics:invalidate'))
  }

  // Toggle single checkbox
  function toggleSelection(id: number) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // Toggle all checkboxes
  function toggleSelectAll() {
    if (selectedIds.size === filteredMilestones.length && filteredMilestones.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredMilestones.map(m => m.id)))
    }
  }

  const artifactMap = new Map(artifacts.map((a) => [a.id, a.name]))

  // Get unique owners for dropdown
  const uniqueOwners = useMemo(() => {
    const owners = new Set<string>()
    milestones.forEach(m => {
      if (m.owner) owners.add(m.owner)
    })
    return Array.from(owners).sort()
  }, [milestones])

  // Sort helper function (preserved from original)
  const sortByDate = (a: Milestone, b: Milestone) => {
    const aDate = a.target ?? a.date ?? ''
    const bDate = b.target ?? b.date ?? ''
    return aDate.localeCompare(bDate)
  }

  // Filter milestones based on URL params, then apply incomplete-first sort
  const filteredMilestones = useMemo(() => {
    let result = [...milestones]

    // Text search on name and notes
    if (q) {
      const lowerQ = q.toLowerCase()
      result = result.filter(m =>
        (m.name?.toLowerCase().includes(lowerQ) ?? false) ||
        (m.notes?.toLowerCase().includes(lowerQ) ?? false)
      )
    }

    // Apply status filter
    if (statusFilter) {
      result = result.filter(m => normaliseMilestoneStatus(m.status) === statusFilter)
    }

    // Apply owner filter
    if (ownerFilter) {
      result = result.filter(m => m.owner === ownerFilter)
    }

    // Apply date range filter (on target ?? date field)
    if (fromDate) {
      result = result.filter(m => {
        const d = m.target ?? m.date ?? ''
        if (!/^\d{4}-\d{2}-\d{2}/.test(d)) return true  // keep non-ISO rows
        return d >= fromDate
      })
    }
    if (toDate) {
      result = result.filter(m => {
        const d = m.target ?? m.date ?? ''
        if (!/^\d{4}-\d{2}-\d{2}/.test(d)) return true  // keep non-ISO rows
        return d <= toDate
      })
    }

    // Preserve incomplete-first order (split, sort each half, concat)
    const incomplete = result.filter(m => normaliseMilestoneStatus(m.status) !== 'completed')
    const complete = result.filter(m => normaliseMilestoneStatus(m.status) === 'completed')
    return [...incomplete.sort(sortByDate), ...complete.sort(sortByDate)]
  }, [milestones, q, statusFilter, ownerFilter, fromDate, toDate])

  // Show empty state when no milestones exist
  if (milestones.length === 0) {
    return (
      <>
        <EmptyState
          title="No milestones yet"
          description="Milestones mark key dates and deliverables. Add the first milestone to track progress."
          action={{
            label: 'Add Milestone',
            onClick: () => setAddModalOpen(true),
          }}
        />
        <AddMilestoneModal
          projectId={projectId}
          open={addModalOpen}
          onOpenChange={setAddModalOpen}
        />
      </>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-zinc-900">Milestones</h2>
        <AddMilestoneModal projectId={projectId} open={addModalOpen} onOpenChange={setAddModalOpen} />
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Input
          placeholder="Search milestones..."
          value={q}
          onChange={e => setQ(e.target.value)}
          className="h-8 w-48"
        />
        <select
          value={statusFilter}
          onChange={e => updateParam('status', e.target.value)}
          className="border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
        >
          <option value="">All statuses</option>
          <option value="not_started">Not Started</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="blocked">Blocked</option>
        </select>
        <select
          value={ownerFilter}
          onChange={e => updateParam('owner', e.target.value)}
          className="border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
        >
          <option value="">All owners</option>
          {uniqueOwners.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <label className="flex items-center gap-1 text-sm text-zinc-600">
          From
          <input
            type="date"
            value={fromDate}
            onChange={e => updateParam('from', e.target.value)}
            className="border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
          />
        </label>
        <label className="flex items-center gap-1 text-sm text-zinc-600">
          To
          <input
            type="date"
            value={toDate}
            onChange={e => updateParam('to', e.target.value)}
            className="border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
          />
        </label>
        {(q || statusFilter || ownerFilter || fromDate || toDate) && (
          <button
            onClick={() => {
              setQ('')
              updateParam('status', '')
              updateParam('owner', '')
              updateParam('from', '')
              updateParam('to', '')
            }}
            className="text-sm text-zinc-500 hover:text-zinc-800 border rounded px-2 py-1"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Bulk Action Bar (floating above table when rows selected) */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 bg-zinc-50 border rounded px-4 py-2 mb-2">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <select
            onChange={e => {
              if (e.target.value) {
                bulkUpdateStatus(e.target.value)
                e.target.value = '' // Reset
              }
            }}
            className="border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
          >
            <option value="">Change status...</option>
            <option value="not_started">Not Started</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="blocked">Blocked</option>
          </select>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-sm text-zinc-600 hover:text-zinc-800"
          >
            Clear
          </button>
        </div>
      )}

      <div className="rounded-md border border-zinc-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={filteredMilestones.length > 0 && selectedIds.size === filteredMilestones.length}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="w-[160px]">Status</TableHead>
              <TableHead className="w-[120px]">Target / Date</TableHead>
              <TableHead className="w-[120px]">Owner</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMilestones.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-zinc-400 py-8">
                  No milestones found.
                </TableCell>
              </TableRow>
            ) : (
              filteredMilestones.map((m) => {
                const statusKey = normaliseMilestoneStatus(m.status)
                const badgeClass = statusBadgeColors[statusKey] ?? 'bg-zinc-100 text-zinc-700'
                const displayDate = m.date ?? null
                const overdue = isOverdueMilestone(displayDate, m.status)
                return (
                  <TableRow
                    key={m.id}
                    className={overdue ? 'border-red-500 bg-red-50' : ''}
                    data-testid={`milestone-row-${m.id}`}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(m.id)}
                        onCheckedChange={() => toggleSelection(m.id)}
                      />
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
                        onSave={(v) => patchMilestone(m.id, { date: v })}
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

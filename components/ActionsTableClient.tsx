'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { InlineSelectCell } from '@/components/InlineSelectCell'
import { DatePickerCell } from '@/components/DatePickerCell'
import { OwnerCell } from '@/components/OwnerCell'
import { ActionEditModal } from '@/components/ActionEditModal'
import { EmptyState } from '@/components/EmptyState'
import { AddActionModal } from '@/components/AddActionModal'
import type { Action } from '@/lib/queries'

const ACTION_STATUS_OPTIONS: { value: 'open' | 'in_progress' | 'completed' | 'cancelled'; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

const VALID_ACTION_STATUSES = ['open', 'in_progress', 'completed', 'cancelled']

interface ActionsTableClientProps {
  actions: Action[]
  projectId: number
}

export function ActionsTableClient({ actions, projectId }: ActionsTableClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [addModalOpen, setAddModalOpen] = useState(false)

  // Read filter values from URL params
  const q = searchParams.get('q') ?? ''
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

  // Filter actions in-memory based on URL params
  const filteredActions = useMemo(() => {
    let result = actions

    // Text search on description
    if (q) {
      const lowerQ = q.toLowerCase()
      result = result.filter(a => a.description?.toLowerCase().includes(lowerQ))
    }

    // Status filter
    if (statusFilter) {
      result = result.filter(a => a.status === statusFilter)
    }

    // Owner filter
    if (ownerFilter) {
      result = result.filter(a => a.owner === ownerFilter)
    }

    // Date range filter (on due_date)
    if (fromDate) {
      result = result.filter(a => {
        if (!a.due || !/^\d{4}-\d{2}-\d{2}/.test(a.due)) return false
        return a.due >= fromDate
      })
    }
    if (toDate) {
      result = result.filter(a => {
        if (!a.due || !/^\d{4}-\d{2}-\d{2}/.test(a.due)) return false
        return a.due <= toDate
      })
    }

    return result
  }, [actions, q, statusFilter, ownerFilter, fromDate, toDate])

  // Get unique owners for dropdown
  const uniqueOwners = useMemo(() => {
    const owners = new Set<string>()
    actions.forEach(a => {
      if (a.owner) owners.add(a.owner)
    })
    return Array.from(owners).sort()
  }, [actions])

  // PATCH single action
  async function patchAction(id: number, patch: Record<string, unknown>) {
    const res = await fetch(`/api/actions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (!res.ok) throw new Error('Save failed')
    router.refresh()
    window.dispatchEvent(new CustomEvent('metrics:invalidate'))
  }

  // DELETE single action
  async function deleteAction(id: number) {
    try {
      const res = await fetch(`/api/actions/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      router.refresh()
      window.dispatchEvent(new CustomEvent('metrics:invalidate'))
    } catch (err) {
      console.error('Delete failed:', err)
    }
  }

  // Bulk update status
  async function bulkUpdateStatus(status: string) {
    await fetch('/api/actions/bulk-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action_ids: Array.from(selectedIds), patch: { status } }),
    })
    setSelectedIds(new Set())
    router.refresh()
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
    if (selectedIds.size === filteredActions.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredActions.map(a => a.id)))
    }
  }

  // Normalise status to valid value (safe default for legacy data)
  function normaliseStatus(status: string): 'open' | 'in_progress' | 'completed' | 'cancelled' {
    if (VALID_ACTION_STATUSES.includes(status)) {
      return status as 'open' | 'in_progress' | 'completed' | 'cancelled'
    }
    return 'open'
  }

  // Check if action is overdue
  function isOverdueAction(dueDate: string | null | undefined, status: string): boolean {
    if (!dueDate || !/^\d{4}-\d{2}-\d{2}/.test(dueDate)) return false
    if (status === 'completed' || status === 'cancelled') return false
    const today = new Date().toISOString().split('T')[0]
    return dueDate < today
  }

  // Show empty state when no actions exist
  if (actions.length === 0) {
    return (
      <>
        <EmptyState
          title="No actions yet"
          description="Actions track deliverables and commitments. Add the first action to get started."
          action={{
            label: 'Add Action',
            onClick: () => setAddModalOpen(true),
          }}
        />
        <AddActionModal
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
        <h2 className="text-xl font-semibold text-zinc-900">Actions</h2>
        <AddActionModal projectId={projectId} open={addModalOpen} onOpenChange={setAddModalOpen} />
      </div>
      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 border-b pb-3">
        {/* Search input */}
        <input
          type="text"
          placeholder="Search actions..."
          value={q}
          onChange={e => updateParam('q', e.target.value)}
          className="border rounded px-3 py-1.5 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-zinc-400"
        />

        {/* Status chips */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => updateParam('status', '')}
            className={`px-2.5 py-1 text-xs rounded ${!statusFilter ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'}`}
          >
            All
          </button>
          {ACTION_STATUS_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => updateParam('status', opt.value)}
              className={`px-2.5 py-1 text-xs rounded ${statusFilter === opt.value ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Owner dropdown */}
        <select
          value={ownerFilter}
          onChange={e => updateParam('owner', e.target.value)}
          className="border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
        >
          <option value="">All Owners</option>
          {uniqueOwners.map(owner => (
            <option key={owner} value={owner}>
              {owner}
            </option>
          ))}
        </select>

        {/* Date range */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={fromDate}
            onChange={e => updateParam('from', e.target.value)}
            className="border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
            placeholder="From"
          />
          <span className="text-xs text-zinc-500">to</span>
          <input
            type="date"
            value={toDate}
            onChange={e => updateParam('to', e.target.value)}
            className="border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
            placeholder="To"
          />
        </div>
      </div>

      {/* Bulk Action Bar (floating above table when rows selected) */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 bg-zinc-50 border rounded px-4 py-2">
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
            {ACTION_STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-sm text-zinc-600 hover:text-zinc-800"
          >
            Clear
          </button>
        </div>
      )}

      {/* Count */}
      <p className="text-sm text-zinc-500">
        Showing {filteredActions.length} of {actions.length} actions
      </p>

      {/* Table */}
      <div className="border rounded">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={filteredActions.length > 0 && selectedIds.size === filteredActions.length}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-40">Owner</TableHead>
              <TableHead className="w-32">Due Date</TableHead>
              <TableHead className="w-32">Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredActions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-zinc-500 text-sm py-8">
                  No actions found.
                </TableCell>
              </TableRow>
            ) : (
              filteredActions.map(action => {
                const normalisedStatus = normaliseStatus(action.status)
                const overdueAction = isOverdueAction(action.due, normalisedStatus)
                return (
                  <TableRow
                    key={action.id}
                    className={overdueAction ? 'border-red-500 bg-red-50' : ''}
                    data-testid={`action-row-${action.id}`}
                  >
                    {/* Checkbox */}
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(action.id)}
                        onCheckedChange={() => toggleSelection(action.id)}
                      />
                    </TableCell>

                    {/* Description — opens ActionEditModal */}
                    <TableCell>
                      <ActionEditModal
                        action={action}
                        trigger={
                          <span className="cursor-pointer hover:underline text-sm">
                            {action.description || '—'}
                          </span>
                        }
                      />
                    </TableCell>

                    {/* Owner — inline edit */}
                    <TableCell>
                      <OwnerCell
                        value={action.owner}
                        ownerId={action.owner_id}
                        projectId={projectId}
                        onSave={async ({ ownerId, ownerName }) =>
                          patchAction(action.id, { owner: ownerName || null, owner_id: ownerId })
                        }
                      />
                    </TableCell>

                    {/* Due Date — inline edit */}
                    <TableCell>
                      <DatePickerCell
                        value={action.due}
                        onSave={async v => patchAction(action.id, { due_date: v })}
                      />
                    </TableCell>

                    {/* Status — inline edit */}
                    <TableCell>
                      <InlineSelectCell
                        value={normalisedStatus}
                        options={ACTION_STATUS_OPTIONS}
                        onSave={async v => patchAction(action.id, { status: v })}
                      />
                    </TableCell>

                    {/* Delete button */}
                    <TableCell className="w-10">
                      <button
                        onClick={() => deleteAction(action.id)}
                        className="text-zinc-400 hover:text-red-500 transition-colors"
                        title="Delete"
                        aria-label="Delete"
                      >
                        ✕
                      </button>
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

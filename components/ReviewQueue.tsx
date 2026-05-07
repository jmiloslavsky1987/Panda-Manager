'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { QueueItemRow, type DiscoveryQueueItem } from '@/components/QueueItemRow'

interface ReviewQueueProps {
  projectId: number
}

export function ReviewQueue({ projectId }: ReviewQueueProps) {
  const [items, setItems] = useState<DiscoveryQueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [dismissedItems, setDismissedItems] = useState<DiscoveryQueueItem[]>([])
  const [showDismissHistory, setShowDismissHistory] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [bulkApproving, setBulkApproving] = useState(false)

  const fetchQueue = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/discovery/queue?projectId=${projectId}`)
      if (!res.ok) return
      const data = await res.json() as { items?: DiscoveryQueueItem[] }
      if (Array.isArray(data.items)) setItems(data.items)
    } catch {
      // silently ignore
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { fetchQueue() }, [fetchQueue])

  async function fetchDismissHistory() {
    setLoadingHistory(true)
    try {
      const res = await fetch(`/api/discovery/dismiss-history?projectId=${projectId}`)
      if (!res.ok) return
      const data = await res.json() as { items?: DiscoveryQueueItem[] }
      if (Array.isArray(data.items)) setDismissedItems(data.items)
    } catch {
      // silently ignore
    } finally {
      setLoadingHistory(false)
    }
  }

  function handleToggleDismissHistory() {
    const next = !showDismissHistory
    setShowDismissHistory(next)
    if (next && dismissedItems.length === 0) fetchDismissHistory()
  }

  async function handleApprove(itemId: number, _resolution?: string) {
    try {
      await fetch('/api/discovery/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, itemIds: [itemId] }),
      })
    } catch { /* silently ignore */ }
    await fetchQueue()
  }

  async function handleDismiss(itemId: number) {
    try {
      await fetch('/api/discovery/dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, itemIds: [itemId] }),
      })
    } catch { /* silently ignore */ }
    await fetchQueue()
    if (showDismissHistory) fetchDismissHistory()
  }

  async function handleMerge(
    itemId: number,
    entityMatch: string,
    suggestedPosition?: { after: string }
  ) {
    try {
      const res = await fetch('/api/discovery/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          itemIds: [itemId],
          action: 'merge',
          entity_match: entityMatch,
          suggested_position: suggestedPosition,
        }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({})) as { error?: string }
        toast.error(`Merge failed: ${errData.error ?? res.statusText}`)
        return
      }
      const data = await res.json() as { approved?: number; errors?: Array<{ itemId: number; error: string }> }
      if (data.errors && data.errors.length > 0) {
        toast.error(`Merge failed: ${data.errors[0].error}`)
      } else {
        toast.success(`Merged into "${entityMatch}"`)
      }
    } catch {
      toast.error('Merge failed — network error')
    }
    await fetchQueue()
  }

  async function handleBulkApprove() {
    if (items.length === 0) return
    setBulkApproving(true)
    try {
      await fetch('/api/discovery/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, itemIds: items.map(i => i.id) }),
      })
    } catch { /* silently ignore */ } finally {
      setBulkApproving(false)
    }
    await fetchQueue()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-zinc-400">
        Loading queue…
      </div>
    )
  }

  const newItems = items.filter(item => !item.likely_duplicate)
  const likelyDuplicates = items.filter(item => item.likely_duplicate)

  function QueueTable({ rows, readonly = false }: { rows: DiscoveryQueueItem[]; readonly?: boolean }) {
    return (
      <div className="rounded-md border border-zinc-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">Source</TableHead>
              <TableHead className="w-36">Type</TableHead>
              <TableHead>Content</TableHead>
              <TableHead className="w-40">Merge Target</TableHead>
              <TableHead className="w-28">Found</TableHead>
              {!readonly && <TableHead className="w-56">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(item => (
              <QueueItemRow
                key={item.id}
                item={item}
                onApprove={handleApprove}
                onDismiss={handleDismiss}
                onMerge={handleMerge}
                readonly={readonly}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-zinc-900">
          Review Queue{' '}
          <span className="text-zinc-400 font-normal text-base">({newItems.length} pending)</span>
        </h2>
        <div className="flex items-center gap-3">
          <button
            onClick={handleToggleDismissHistory}
            className="text-sm text-zinc-500 hover:text-zinc-700 underline"
          >
            {showDismissHistory ? 'Hide dismissal history' : 'View dismissal history'}
          </button>
          {newItems.length > 0 && (
            <button
              onClick={handleBulkApprove}
              disabled={bulkApproving}
              className="rounded-md bg-amber-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
            >
              {bulkApproving ? 'Approving all…' : 'Approve All'}
            </button>
          )}
        </div>
      </div>

      {/* Primary pending items */}
      {newItems.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 py-12 text-center text-sm text-zinc-400">
          No pending items — run a scan to discover new updates
        </div>
      ) : (
        <QueueTable rows={newItems} />
      )}

      {/* Likely duplicates */}
      {likelyDuplicates.length > 0 && (
        <details>
          <summary className="cursor-pointer text-sm font-medium text-zinc-500 hover:text-zinc-700 select-none">
            {likelyDuplicates.length} item{likelyDuplicates.length !== 1 ? 's' : ''} may already exist in this project
            <span className="ml-2 text-xs text-zinc-400">(click to review)</span>
          </summary>
          <div className="mt-3 opacity-60">
            <QueueTable rows={likelyDuplicates} />
          </div>
        </details>
      )}

      {/* Dismiss history */}
      {showDismissHistory && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-zinc-500 uppercase tracking-wide">
            Dismissed Items
          </h3>
          {loadingHistory ? (
            <div className="text-sm text-zinc-400">Loading history…</div>
          ) : dismissedItems.length === 0 ? (
            <div className="text-sm text-zinc-400">No dismissed items.</div>
          ) : (
            <div className="opacity-60">
              <QueueTable rows={dismissedItems} readonly />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

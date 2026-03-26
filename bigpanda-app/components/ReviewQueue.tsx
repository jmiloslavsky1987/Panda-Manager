'use client'

import { useEffect, useState, useCallback } from 'react'
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
      if (Array.isArray(data.items)) {
        setItems(data.items)
      }
    } catch {
      // silently ignore
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchQueue()
  }, [fetchQueue])

  async function fetchDismissHistory() {
    setLoadingHistory(true)
    try {
      const res = await fetch(`/api/discovery/dismiss-history?projectId=${projectId}`)
      if (!res.ok) return
      const data = await res.json() as { items?: DiscoveryQueueItem[] }
      if (Array.isArray(data.items)) {
        setDismissedItems(data.items)
      }
    } catch {
      // silently ignore
    } finally {
      setLoadingHistory(false)
    }
  }

  function handleToggleDismissHistory() {
    const next = !showDismissHistory
    setShowDismissHistory(next)
    if (next && dismissedItems.length === 0) {
      fetchDismissHistory()
    }
  }

  async function handleApprove(itemId: number, _resolution?: string) {
    try {
      await fetch('/api/discovery/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, itemIds: [itemId] }),
      })
    } catch {
      // silently ignore
    }
    await fetchQueue()
  }

  async function handleDismiss(itemId: number) {
    try {
      await fetch('/api/discovery/dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, itemIds: [itemId] }),
      })
    } catch {
      // silently ignore
    }
    await fetchQueue()
    if (showDismissHistory) {
      fetchDismissHistory()
    }
  }

  async function handleBulkApprove() {
    if (items.length === 0) return
    setBulkApproving(true)
    try {
      const itemIds = items.map((i) => i.id)
      await fetch('/api/discovery/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, itemIds }),
      })
    } catch {
      // silently ignore
    } finally {
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

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-medium text-zinc-800">
          Review Queue{' '}
          <span className="text-zinc-400 font-normal">({items.length} pending)</span>
        </h2>
        <div className="flex items-center gap-3">
          <button
            onClick={handleToggleDismissHistory}
            className="text-sm text-zinc-500 hover:text-zinc-700 underline"
          >
            {showDismissHistory ? 'Hide dismissal history' : 'View dismissal history'}
          </button>
          {items.length > 0 && (
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

      {/* Pending items */}
      {items.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 py-12 text-center text-sm text-zinc-400">
          No pending items — run a scan to discover new updates
        </div>
      ) : (
        <div className="rounded-lg border border-zinc-200 bg-white divide-y divide-zinc-100 px-4">
          {items.map((item) => (
            <QueueItemRow
              key={item.id}
              item={item}
              onApprove={handleApprove}
              onDismiss={handleDismiss}
            />
          ))}
        </div>
      )}

      {/* Dismiss history */}
      {showDismissHistory && (
        <div className="mt-6">
          <h3 className="mb-3 text-sm font-semibold text-zinc-500 uppercase tracking-wide">
            Dismissed Items
          </h3>
          {loadingHistory ? (
            <div className="text-sm text-zinc-400">Loading history…</div>
          ) : dismissedItems.length === 0 ? (
            <div className="text-sm text-zinc-400">No dismissed items.</div>
          ) : (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 divide-y divide-zinc-100 px-4 opacity-60">
              {dismissedItems.map((item) => (
                <QueueItemRow
                  key={item.id}
                  item={item}
                  onApprove={handleApprove}
                  onDismiss={handleDismiss}
                  readonly
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

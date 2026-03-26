'use client'

import { useState } from 'react'
import { DiffView } from '@/components/DiffView'

export interface DiscoveryQueueItem {
  id: number
  source: string          // 'slack' | 'gmail' | 'glean' | 'gong'
  content: string         // Claude's extracted value
  suggested_field: string // destination type: 'action' | 'risk' | 'decision' | etc.
  source_excerpt: string  // raw snippet from source
  source_url?: string     // link to original message/email
  scan_timestamp: string  // ISO date string
  created_at: string
  status: 'pending' | 'dismissed'
  likely_duplicate?: boolean // true when Claude flagged item as matching existing project data
  conflict_existing?: string // populated client-side when conflict detected
}

const SOURCE_COLORS: Record<string, string> = {
  slack: 'bg-blue-100 text-blue-700',
  gmail: 'bg-red-100 text-red-700',
  glean: 'bg-purple-100 text-purple-700',
  gong: 'bg-green-100 text-green-700',
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

function sourceLabel(source: string): string {
  return source.charAt(0).toUpperCase() + source.slice(1)
}

interface QueueItemRowProps {
  item: DiscoveryQueueItem
  onApprove: (id: number, resolution?: string) => void
  onDismiss: (id: number) => void
  readonly?: boolean
}

export function QueueItemRow({ item, onApprove, onDismiss, readonly = false }: QueueItemRowProps) {
  const [showExcerpt, setShowExcerpt] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editedContent, setEditedContent] = useState(item.content)
  const [showDiff, setShowDiff] = useState(false)
  const [conflictExisting, setConflictExisting] = useState<string | null>(null)
  const [approving, setApproving] = useState(false)
  const [dismissing, setDismissing] = useState(false)

  const sourceColorClass = SOURCE_COLORS[item.source] ?? 'bg-zinc-100 text-zinc-700'
  const dateLabel = item.scan_timestamp
    ? `Found ${formatDate(item.scan_timestamp)} · via ${sourceLabel(item.source)}`
    : `via ${sourceLabel(item.source)}`

  async function handleApprove(contentOverride?: string) {
    setApproving(true)
    try {
      const body = {
        projectId: undefined as unknown, // will be set by caller via onApprove
        itemIds: [item.id],
        content: contentOverride ?? editedContent,
      }
      const res = await fetch('/api/discovery/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: 0, itemIds: [item.id] }), // projectId provided by parent
      })

      if (res.status === 409) {
        const data = await res.json() as { conflict: boolean; existingValue: string }
        if (data.conflict) {
          setConflictExisting(data.existingValue)
          setShowDiff(true)
          setApproving(false)
          return
        }
      }

      onApprove(item.id, contentOverride)
    } catch {
      onApprove(item.id, contentOverride)
    } finally {
      setApproving(false)
    }
  }

  async function handleDismiss() {
    setDismissing(true)
    onDismiss(item.id)
  }

  function handleEditSave() {
    setEditing(false)
    onApprove(item.id, editedContent)
  }

  return (
    <div className="border-b border-zinc-100 py-4">
      {/* Header row */}
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${sourceColorClass}`}>
          {sourceLabel(item.source)}
        </span>
        <span className="text-xs text-zinc-400">{dateLabel}</span>
        <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
          {item.suggested_field}
        </span>
      </div>

      {/* Content row */}
      {editing ? (
        <div className="mb-3">
          <textarea
            className="w-full rounded-md border border-zinc-300 p-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-400"
            rows={3}
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
          />
        </div>
      ) : (
        <p className="mb-2 font-medium text-zinc-800">{item.content}</p>
      )}

      {/* Source excerpt */}
      <div className="mb-3">
        <button
          className="text-xs text-zinc-400 hover:text-zinc-600 underline"
          onClick={() => setShowExcerpt((v) => !v)}
        >
          {showExcerpt ? 'Hide source excerpt' : 'Show source excerpt'}
        </button>
        {showExcerpt && (
          <div className="mt-2 rounded bg-zinc-50 p-2">
            <p className="text-sm italic text-zinc-500">{item.source_excerpt}</p>
            {item.source_url && (
              <a
                href={item.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 block text-xs text-blue-500 hover:underline"
              >
                View original
              </a>
            )}
          </div>
        )}
      </div>

      {/* Action row */}
      {!readonly && (
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <button
                onClick={handleEditSave}
                className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
                disabled={approving}
              >
                Save &amp; Approve
              </button>
              <button
                onClick={() => { setEditing(false); setEditedContent(item.content) }}
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => handleApprove()}
                className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
                disabled={approving || dismissing}
              >
                {approving ? 'Approving…' : 'Approve'}
              </button>
              <button
                onClick={() => setEditing(true)}
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50"
              >
                Edit
              </button>
              <button
                onClick={handleDismiss}
                className="px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-600 disabled:opacity-50"
                disabled={approving || dismissing}
              >
                {dismissing ? 'Dismissing…' : 'Dismiss'}
              </button>
            </>
          )}
        </div>
      )}

      {/* Conflict diff view */}
      {showDiff && conflictExisting !== null && (
        <DiffView
          existing={conflictExisting}
          discovered={item.content}
          onMerge={() => {
            setShowDiff(false)
            onApprove(item.id, `${conflictExisting}\n\n${item.content}`)
          }}
          onReplace={() => {
            setShowDiff(false)
            onApprove(item.id, item.content)
          }}
          onSkip={() => {
            setShowDiff(false)
            onDismiss(item.id)
          }}
        />
      )}
    </div>
  )
}

'use client'

import { useState } from 'react'
import { TableCell, TableRow } from '@/components/ui/table'

export interface DiscoveryQueueItem {
  id: number
  source: string
  content: string
  suggested_field: string | null
  source_excerpt: string
  source_url?: string
  scan_timestamp: string
  created_at: string
  status: 'pending' | 'dismissed'
  likely_duplicate?: boolean
  conflict_existing?: string
  entity_match?: string
  suggested_position?: { after: string }
}

const SOURCE_COLORS: Record<string, string> = {
  slack: 'bg-blue-100 text-blue-700',
  gmail: 'bg-red-100 text-red-700',
  glean: 'bg-purple-100 text-purple-700',
  gong: 'bg-green-100 text-green-700',
}

const TYPE_LABELS: Record<string, string> = {
  action: 'Action',
  risk: 'Risk',
  decision: 'Decision',
  milestone: 'Milestone',
  stakeholder: 'Stakeholder',
  history: 'History',
  task: 'Task',
  team_engagement: 'Team Engagement',
  arch_track: 'Arch Track',
  arch_node: 'Arch Node',
  workflow: 'Workflow',
  workflow_step: 'Workflow Step',
  business_outcome: 'Business Outcome',
  integration: 'Integration',
}

export function typeLabel(suggested_field: string | null): string {
  if (!suggested_field) return 'Unknown'
  return TYPE_LABELS[suggested_field] ??
    suggested_field.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export function displayContent(content: string, suggested_field: string | null): string {
  if (!suggested_field) return content
  try {
    const parsed = JSON.parse(content)
    if (suggested_field === 'workflow_step' && parsed.label) return parsed.label
    if (suggested_field === 'workflow' && parsed.workflow_name) return `${parsed.team_name ?? ''} / ${parsed.workflow_name}`.replace(/^\s*\/\s*/, '')
    if (suggested_field === 'arch_node' && parsed.name) return `${parsed.name} (${parsed.track_name ?? ''})`
    if (suggested_field === 'team_engagement' && parsed.content) return parsed.content
  } catch {
    // not JSON — display as-is
  }
  return content
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return iso
  }
}

interface QueueItemRowProps {
  item: DiscoveryQueueItem
  onApprove: (id: number, resolution?: string) => void
  onDismiss: (id: number) => void
  onMerge?: (id: number, entityMatch: string, suggestedPosition?: { after: string }) => void
  readonly?: boolean
}

export function QueueItemRow({ item, onApprove, onDismiss, onMerge, readonly = false }: QueueItemRowProps) {
  const [showExcerpt, setShowExcerpt] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editedContent, setEditedContent] = useState(item.content)
  const [approving, setApproving] = useState(false)
  const [dismissing, setDismissing] = useState(false)

  const sourceColorClass = SOURCE_COLORS[item.source] ?? 'bg-zinc-100 text-zinc-700'
  const label = displayContent(item.content, item.suggested_field)

  function handleApprove() {
    setApproving(true)
    onApprove(item.id, editing ? editedContent : undefined)
    setApproving(false)
    setEditing(false)
  }

  function handleDismiss() {
    setDismissing(true)
    onDismiss(item.id)
  }

  return (
    <TableRow>
      {/* Source */}
      <TableCell className="w-24">
        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${sourceColorClass}`}>
          {item.source.charAt(0).toUpperCase() + item.source.slice(1)}
        </span>
      </TableCell>

      {/* Type */}
      <TableCell className="w-36">
        <span className="inline-block rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
          {typeLabel(item.suggested_field)}
        </span>
      </TableCell>

      {/* Content */}
      <TableCell>
        {editing ? (
          <textarea
            className="w-full rounded-md border border-zinc-300 p-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-400"
            rows={2}
            value={editedContent}
            onChange={e => setEditedContent(e.target.value)}
          />
        ) : (
          <div>
            <p className="text-sm text-zinc-800">{label}</p>
            <button
              className="mt-1 text-xs text-zinc-400 hover:text-zinc-600 underline"
              onClick={() => setShowExcerpt(v => !v)}
            >
              {showExcerpt ? 'Hide excerpt' : 'Show excerpt'}
            </button>
            {showExcerpt && (
              <div className="mt-1 rounded bg-zinc-50 p-2">
                <p className="text-xs italic text-zinc-500">{item.source_excerpt}</p>
                {item.source_url && (
                  <a href={item.source_url} target="_blank" rel="noopener noreferrer"
                    className="mt-1 block text-xs text-blue-500 hover:underline">
                    View original
                  </a>
                )}
              </div>
            )}
          </div>
        )}
      </TableCell>

      {/* Entity match */}
      <TableCell className="w-40">
        {item.entity_match ? (
          <span className="text-xs text-zinc-500 truncate block max-w-[160px]" title={item.entity_match}>
            {item.entity_match}
          </span>
        ) : (
          <span className="text-xs text-zinc-300">—</span>
        )}
      </TableCell>

      {/* Date */}
      <TableCell className="w-28 text-xs text-zinc-400">
        {item.scan_timestamp ? formatDate(item.scan_timestamp) : '—'}
      </TableCell>

      {/* Actions */}
      {!readonly && (
        <TableCell className="w-56">
          <div className="flex items-center gap-1 flex-wrap">
            {editing ? (
              <>
                <button
                  onClick={handleApprove}
                  disabled={approving}
                  className="rounded bg-zinc-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
                >
                  Save &amp; Approve
                </button>
                <button
                  onClick={() => { setEditing(false); setEditedContent(item.content) }}
                  className="rounded border border-zinc-300 px-2.5 py-1 text-xs text-zinc-600 hover:bg-zinc-50"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleApprove}
                  disabled={approving || dismissing}
                  className="rounded bg-zinc-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
                >
                  {approving ? 'Approving…' : 'Approve'}
                </button>
                {item.entity_match && onMerge && (
                  <button
                    onClick={() => onMerge(item.id, item.entity_match!, item.suggested_position)}
                    disabled={approving || dismissing}
                    className="rounded border border-emerald-300 px-2.5 py-1 text-xs text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                    title={`Merge into "${item.entity_match}"`}
                  >
                    Merge
                  </button>
                )}
                <button
                  onClick={() => setEditing(true)}
                  className="rounded border border-zinc-300 px-2.5 py-1 text-xs text-zinc-600 hover:bg-zinc-50"
                >
                  Edit
                </button>
                <button
                  onClick={handleDismiss}
                  disabled={approving || dismissing}
                  className="px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-600 disabled:opacity-50"
                >
                  {dismissing ? 'Dismissing…' : 'Dismiss'}
                </button>
              </>
            )}
          </div>
        </TableCell>
      )}
    </TableRow>
  )
}

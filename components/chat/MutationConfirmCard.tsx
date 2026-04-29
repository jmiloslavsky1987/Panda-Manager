'use client'

import { useState } from 'react'
import type { ToolUIPart } from 'ai'
import { Button } from '@/components/ui/button'

// ─── Operation type detection ──────────────────────────────────────────────────

type OpType = 'create' | 'update' | 'delete'

function getOpType(partType: string): OpType {
  const toolName = partType.replace('tool-', '')
  if (toolName.startsWith('create_')) return 'create'
  if (toolName.startsWith('update_')) return 'update'
  return 'delete'
}

function getEntityLabel(partType: string): string {
  const toolName = partType.replace('tool-', '')
  return toolName.replace(/^(create_|update_|delete_)/, '').replace(/_/g, ' ')
}

// ─── Color tokens ──────────────────────────────────────────────────────────────

const OP_CONFIG: Record<OpType, { label: string; accent: string }> = {
  create: { label: 'New',    accent: 'var(--kata-status-green)' },
  update: { label: 'Update', accent: 'var(--kata-interactive)' },
  delete: { label: 'Delete', accent: 'var(--kata-status-red)' },
}

// ─── Field helpers ─────────────────────────────────────────────────────────────

// Fields that are internal/structural — skip them in the display
const SKIP_FIELDS = new Set(['id'])

function formatKey(key: string): string {
  return key.replace(/_/g, ' ')
}

function formatValue(val: unknown): string {
  if (val === null || val === undefined || val === '') return '—'
  return String(val)
}

// For update ops, pull the title from a "description", "name", or "decision" field
function getEntityTitle(input: Record<string, unknown>): string | null {
  for (const key of ['description', 'name', 'decision', 'title']) {
    if (typeof input[key] === 'string' && input[key]) return input[key] as string
  }
  return null
}

// ─── Props ─────────────────────────────────────────────────────────────────────

interface MutationConfirmCardProps {
  part: ToolUIPart & {
    state: 'approval-requested'
    type: string
    input: unknown
  }
  onApprove: () => void
  onReject: () => void
}

// ─── MutationConfirmCard ───────────────────────────────────────────────────────

export function MutationConfirmCard({ part, onApprove, onReject }: MutationConfirmCardProps) {
  const opType = getOpType(part.type)
  const entityLabel = getEntityLabel(part.type)
  const { label: opLabel, accent } = OP_CONFIG[opType]
  const input = part.input as Record<string, unknown>

  // Delete friction
  const [deletePhrase, setDeletePhrase] = useState('')
  const confirmDisabled = opType === 'delete' && deletePhrase.toLowerCase() !== 'delete'

  // Rows to display — skip internal fields
  const displayFields = Object.entries(input).filter(([k]) => !SKIP_FIELDS.has(k))

  const entityTitle = getEntityTitle(input)

  return (
    <div
      data-testid="mutation-confirm-card"
      className="rounded-md border bg-card shadow-sm overflow-hidden"
      style={{ borderLeftColor: accent, borderLeftWidth: 4 }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b">
        <span
          className="rounded px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-white shrink-0"
          style={{ backgroundColor: accent }}
        >
          {opLabel}
        </span>
        <span className="text-sm font-medium capitalize text-foreground">{entityLabel}</span>
        {entityTitle && opType !== 'create' && (
          <span className="ml-1 text-sm text-muted-foreground truncate">— {entityTitle}</span>
        )}
      </div>

      {/* Field rows */}
      <div className="divide-y">
        {displayFields.map(([key, val]) => (
          <div key={key} className="flex items-baseline gap-3 px-4 py-2">
            <span className="w-28 shrink-0 text-xs font-medium text-muted-foreground capitalize">
              {formatKey(key)}
            </span>
            <span className="text-sm text-foreground">{formatValue(val)}</span>
          </div>
        ))}
      </div>

      {/* Delete friction */}
      {opType === 'delete' && (
        <div className="px-4 py-3 border-t bg-destructive/5">
          <input
            className="w-full rounded border border-destructive px-2 py-1.5 text-sm"
            placeholder='Type "delete" to confirm'
            value={deletePhrase}
            onChange={(e) => setDeletePhrase(e.target.value)}
            autoFocus
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2 px-4 py-2.5 border-t bg-muted/30">
        <Button variant="outline" size="sm" onClick={onReject}>
          Cancel
        </Button>
        <Button size="sm" disabled={confirmDisabled} onClick={onApprove}>
          Confirm
        </Button>
      </div>
    </div>
  )
}

// ─── MutationConfirmCardComplete ───────────────────────────────────────────────

interface MutationConfirmCardCompleteProps {
  state: 'approval-responded' | 'output-available' | 'error'
  approved?: boolean
}

export function MutationConfirmCardComplete({ state, approved }: MutationConfirmCardCompleteProps) {
  const isFailed = state === 'error'
  const isApproved = !isFailed && approved !== false

  const label = isFailed ? 'Failed' : isApproved ? 'Confirmed' : 'Cancelled'
  const accent = isFailed
    ? 'var(--kata-status-red)'
    : isApproved
    ? 'var(--kata-status-green)'
    : 'var(--kata-on-container-tertiary, #9ca3af)'

  return (
    <div
      data-testid="mutation-confirm-complete"
      className="flex items-center gap-2 rounded-md border bg-card px-4 py-2.5 text-sm"
      style={{ borderLeftColor: accent, borderLeftWidth: 4 }}
    >
      <span style={{ color: accent }} className="font-semibold">
        {isFailed ? '✗' : isApproved ? '✓' : '—'}
      </span>
      <span className="font-medium text-foreground">{label}</span>
    </div>
  )
}

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

// ─── Color mapping using kata CSS variable names ───────────────────────────────
// The className literals make the kata token names discoverable in rendered HTML.

const OP_BADGE: Record<OpType, { label: string; colorClass: string; borderStyle: string }> = {
  create: {
    label: 'New',
    colorClass: 'kata-status-green',
    borderStyle: 'var(--kata-status-green)',
  },
  update: {
    label: 'Update',
    colorClass: 'kata-interactive',
    borderStyle: 'var(--kata-interactive)',
  },
  delete: {
    label: 'Delete',
    colorClass: 'kata-status-red',
    borderStyle: 'var(--kata-status-red)',
  },
}

// ─── Props ─────────────────────────────────────────────────────────────────────

interface MutationConfirmCardProps {
  part: ToolUIPart & {
    state: 'approval-requested'
    type: string
    input: unknown
  }
  onApprove: () => void
  /** onReject / onCancel — called when user cancels the operation */
  onReject: () => void
}

// ─── MutationConfirmCard ───────────────────────────────────────────────────────

export function MutationConfirmCard({ part, onApprove, onReject }: MutationConfirmCardProps) {
  const opType = getOpType(part.type)
  const entityLabel = getEntityLabel(part.type)
  const { label: opLabel, colorClass, borderStyle } = OP_BADGE[opType]

  // Local display state for editable fields (review-only, not transmitted)
  const [fieldValues, setFieldValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      Object.entries(part.input as Record<string, unknown>).map(([k, v]) => [k, String(v ?? '')])
    )
  )

  // Delete friction state
  const [deletePhrase, setDeletePhrase] = useState('')
  const deleteConfirmed = deletePhrase.toLowerCase() === 'delete'
  const confirmDisabled = opType === 'delete' && !deleteConfirmed

  return (
    <div
      data-testid="mutation-confirm-card"
      className={`rounded-md border-l-4 bg-card p-4 shadow-sm ${colorClass}`}
      style={{ borderLeftColor: borderStyle }}
    >
      {/* Header */}
      <div className="mb-3 flex items-center gap-2">
        <span
          className={`rounded px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-white ${colorClass}-badge`}
          style={{ backgroundColor: borderStyle }}
        >
          {opLabel}
        </span>
        <span className="text-sm font-medium capitalize">{entityLabel}</span>
      </div>

      {/* Proposed values — editable for review */}
      <div className="mb-3 space-y-2">
        {Object.entries(fieldValues).map(([key, val]) => (
          <div key={key}>
            <label className="text-xs font-medium capitalize text-muted-foreground">
              {key.replace(/_/g, ' ')}
            </label>
            <input
              className="mt-0.5 w-full rounded border px-2 py-1 text-sm"
              value={val}
              onChange={(e) =>
                setFieldValues((prev) => ({ ...prev, [key]: e.target.value }))
              }
            />
          </div>
        ))}
      </div>

      {/* Review note */}
      <p className="mb-3 text-xs text-muted-foreground">
        Edits are for review only — to submit different values, cancel and send a corrected
        message.
      </p>

      {/* Delete friction */}
      {opType === 'delete' && (
        <div className="mb-3">
          <input
            className="w-full rounded border border-destructive px-2 py-1 text-sm"
            placeholder='Type "delete" to confirm'
            value={deletePhrase}
            onChange={(e) => setDeletePhrase(e.target.value)}
          />
        </div>
      )}

      {/* Action buttons */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onReject}>
          Cancel
        </Button>
        <Button
          size="sm"
          disabled={confirmDisabled}
          onClick={onApprove}
        >
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

export function MutationConfirmCardComplete({
  state,
  approved,
}: MutationConfirmCardCompleteProps) {
  const isFailed = state === 'error'
  const isApproved = !isFailed && approved !== false

  const label = isFailed ? 'Failed' : isApproved ? 'Confirmed' : 'Cancelled'
  const colorStyle = isFailed
    ? 'var(--kata-status-red)'
    : isApproved
    ? 'var(--kata-status-green)'
    : 'var(--kata-neutral-400, #9ca3af)'

  return (
    <div
      data-testid="mutation-confirm-complete"
      className="flex items-center gap-2 rounded-md border p-3 text-sm"
      style={{ borderLeftColor: colorStyle, borderLeftWidth: 4 }}
    >
      <span style={{ color: colorStyle }}>{isApproved && !isFailed ? '✓' : isFailed ? '✗' : '—'}</span>
      <span className="font-medium">{label}</span>
    </div>
  )
}

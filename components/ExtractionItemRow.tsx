'use client'

import { useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { ExtractionItemEditForm } from './ExtractionItemEditForm'
import type { ReviewItem } from './IngestionModal'

// ─── Confidence indicator ─────────────────────────────────────────────────────

function ConfidenceDot({ confidence }: { confidence: number }) {
  const color =
    confidence >= 0.8 ? '#16a34a' :
    confidence >= 0.5 ? '#d97706' :
    '#dc2626'

  const label =
    confidence >= 0.8 ? 'High confidence' :
    confidence >= 0.5 ? 'Medium confidence' :
    'Low confidence'

  return (
    <span
      className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
      style={{ backgroundColor: color }}
      title={`${label} (${Math.round(confidence * 100)}%)`}
      aria-label={label}
    />
  )
}

// ─── Conflict badge + resolution selector ─────────────────────────────────────

function ConflictControl({
  conflict,
  onChange,
}: {
  conflict: NonNullable<ReviewItem['conflict']>
  onChange: (resolution: 'merge' | 'replace' | 'skip') => void
}) {
  return (
    <div className="flex items-center gap-2 mt-1">
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-300">
        Conflict
      </span>
      <select
        value={conflict.resolution ?? ''}
        onChange={e => onChange(e.target.value as 'merge' | 'replace' | 'skip')}
        className="text-xs border border-zinc-200 rounded px-1.5 py-0.5 text-zinc-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
        aria-label="Conflict resolution"
        data-testid="conflict-resolution"
      >
        <option value="" disabled>Resolve…</option>
        <option value="merge">Merge</option>
        <option value="replace">Replace</option>
        <option value="skip">Skip</option>
      </select>
    </div>
  )
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExtractionItemRowProps {
  item: ReviewItem
  globalIndex: number
  isExpanded: boolean
  onToggleExpand: () => void
  onChange: (changes: Partial<ReviewItem>) => void
  onTypeChange?: (newType: string) => void
  hasValidationError?: boolean
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ExtractionItemRow({
  item,
  globalIndex,
  isExpanded,
  onToggleExpand,
  onChange,
  onTypeChange,
  hasValidationError,
}: ExtractionItemRowProps) {
  const [showSource, setShowSource] = useState(false)

  // Content summary: first 80 chars of the primary field
  const primaryFieldKeys: Record<string, string> = {
    action: 'description',
    risk: 'description',
    decision: 'decision',
    milestone: 'name',
    stakeholder: 'name',
    task: 'title',
    architecture: 'tool_name',
    history: 'content',
    businessOutcome: 'title',
    team: 'team_name',
    focus_area: 'title',
    e2e_workflow: 'workflow_name',
    wbs_task: 'title',
    note: 'content',
    team_pathway: 'team_name',
    workstream: 'name',
    onboarding_step: 'step_name',
    integration: 'tool_name',
    arch_node: 'node_name',
    before_state: 'alert_to_ticket_problem',
    weekly_focus: 'bullets',
  }
  const primaryKey = primaryFieldKeys[item.entityType] ?? Object.keys(item.fields)[0] ?? ''
  const summary = (item.fields[primaryKey] ?? '').slice(0, 80)

  function handleCheckboxChange(checked: boolean | 'indeterminate') {
    onChange({ approved: checked === true })
  }

  function handleConflictResolution(resolution: 'merge' | 'replace' | 'skip') {
    if (!item.conflict) return
    onChange({ conflict: { ...item.conflict, resolution } })
  }

  function handleSave(updatedFields: Record<string, string>) {
    onChange({ fields: updatedFields, edited: true })
    onToggleExpand()
  }

  function handleCancel() {
    onToggleExpand()
  }

  function handleTypeChange(newType: string) {
    onTypeChange?.(newType)
  }

  return (
    <div
      className={[
        'transition-opacity',
        item.approved ? '' : 'opacity-50',
      ].join(' ')}
      data-testid={`item-row-${globalIndex}`}
    >
      {/* Main row */}
      <div className="flex items-start gap-3 px-4 py-3">
        {/* Checkbox */}
        <div className="mt-0.5 shrink-0" onClick={e => e.stopPropagation()}>
          <Checkbox
            checked={item.approved}
            onCheckedChange={handleCheckboxChange}
            aria-label={`Approve item ${globalIndex + 1}`}
            data-testid={`checkbox-${globalIndex}`}
          />
        </div>

        {/* Content area — clicking expands edit form */}
        <div
          className="flex-1 cursor-pointer min-w-0"
          onClick={onToggleExpand}
          role="button"
          tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && onToggleExpand()}
          aria-expanded={isExpanded}
          aria-label={`Edit item: ${summary}`}
        >
          <div className="flex items-start gap-2 min-w-0">
            <ConfidenceDot confidence={item.confidence} />
            <p className="text-sm text-zinc-800 flex-1 min-w-0" style={{ overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
              {summary || <span className="text-zinc-400 italic">No content</span>}
            </p>
            {item.edited && (
              <span className="text-xs text-blue-600 font-medium shrink-0">edited</span>
            )}
            {hasValidationError && (
              <span className="text-xs text-red-600 font-medium shrink-0">Required field empty</span>
            )}
          </div>

          {/* Conflict badge + resolution */}
          {item.conflict && (
            <div onClick={e => e.stopPropagation()}>
              <ConflictControl
                conflict={item.conflict}
                onChange={handleConflictResolution}
              />
            </div>
          )}

          {/* Source excerpt toggle */}
          <div
            className="mt-1"
            onClick={e => {
              e.stopPropagation()
              setShowSource(prev => !prev)
            }}
          >
            <button
              type="button"
              className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
              tabIndex={-1}
            >
              {showSource ? 'Hide source' : 'Source'}
            </button>
          </div>

          {showSource && item.sourceExcerpt && (
            <blockquote className="mt-1 pl-2 border-l-2 border-zinc-200 text-xs text-zinc-500 italic line-clamp-3">
              {item.sourceExcerpt}
            </blockquote>
          )}
        </div>
      </div>

      {/* Inline edit form */}
      {isExpanded && (
        <ExtractionItemEditForm
          key={item.entityType}
          item={item}
          onSave={handleSave}
          onCancel={handleCancel}
          onTypeChange={handleTypeChange}
        />
      )}
    </div>
  )
}

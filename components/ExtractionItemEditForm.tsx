'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { ReviewItem } from './IngestionModal'

// ─── Entity field definitions ─────────────────────────────────────────────────

export const ENTITY_FIELDS: Record<string, string[]> = {
  action: ['description', 'owner', 'due_date', 'status', 'notes', 'type'],
  risk: ['description', 'severity', 'mitigation', 'owner'],
  decision: ['decision', 'rationale', 'made_by', 'date'],
  milestone: ['name', 'target_date', 'status', 'owner'],
  stakeholder: ['name', 'role', 'email', 'account'],
  task: ['title', 'status', 'owner', 'phase', 'description', 'start_date', 'due_date', 'milestone_name', 'workstream_name', 'priority'],
  architecture: ['tool_name', 'track', 'phase', 'status', 'integration_method'],
  history: ['date', 'content', 'author'],
  businessOutcome: ['title', 'track', 'description', 'delivery_status'],
  team: ['team_name', 'track', 'ingest_status'],
}

function fieldLabel(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExtractionItemEditFormProps {
  item: ReviewItem
  onSave: (updatedFields: Record<string, string>) => void
  onCancel: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ExtractionItemEditForm({ item, onSave, onCancel }: ExtractionItemEditFormProps) {
  const fieldKeys = ENTITY_FIELDS[item.entityType] ?? Object.keys(item.fields)
  const [draft, setDraft] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    fieldKeys.forEach(key => {
      initial[key] = item.fields[key] ?? ''
    })
    return initial
  })

  function handleChange(key: string, value: string) {
    setDraft(prev => ({ ...prev, [key]: value }))
  }

  function handleSave() {
    onSave(draft)
  }

  return (
    <div className="p-4 bg-zinc-50 border-t border-zinc-100 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {fieldKeys.map(key => (
          <div key={key} className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-600">
              {fieldLabel(key)}
            </label>
            <input
              type="text"
              value={draft[key] ?? ''}
              onChange={e => handleChange(key, e.target.value)}
              className="border border-zinc-200 rounded px-2 py-1 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
              data-testid={`edit-field-${key}`}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-2 justify-end pt-1">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" size="sm" onClick={handleSave}>
          Save
        </Button>
      </div>
    </div>
  )
}

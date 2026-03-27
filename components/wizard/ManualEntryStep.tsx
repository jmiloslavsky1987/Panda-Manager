'use client'

import { useState } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import type { ReviewItem } from '@/components/IngestionModal'
import type { ManualItem } from '@/components/ProjectWizard'

// ─── Entity Tab Config ────────────────────────────────────────────────────────

export const ENTITY_TABS = [
  { type: 'action',         label: 'Actions',           fields: ['title', 'owner', 'due', 'status'] },
  { type: 'risk',           label: 'Risks',             fields: ['title', 'severity', 'mitigation'] },
  { type: 'milestone',      label: 'Milestones',        fields: ['title', 'target_date', 'status'] },
  { type: 'stakeholder',    label: 'Stakeholders',      fields: ['name', 'role', 'company'] },
  { type: 'decision',       label: 'Decisions',         fields: ['title', 'decision', 'date'] },
  { type: 'architecture',   label: 'Architecture',      fields: ['tool_name', 'track', 'status'] },
  { type: 'team',           label: 'Teams',             fields: ['team_name', 'track', 'ingest_status'] },
  { type: 'history',        label: 'Engagement History', fields: ['content', 'type', 'date'] },
  { type: 'businessOutcome', label: 'Business Outcomes', fields: ['title', 'track', 'delivery_status'] },
]

// ─── Utility: buildEntityPayload ─────────────────────────────────────────────

export function buildEntityPayload(entityType: string, fields: Record<string, string>): Record<string, string> {
  const tab = ENTITY_TABS.find(t => t.type === entityType)
  if (!tab) return {}
  return fields
}

// ─── Route mapping for manual item writes ────────────────────────────────────

const ENTITY_ROUTE_MAP: Record<string, string> = {
  action: 'actions',
  risk: 'risks',
  milestone: 'milestones',
  stakeholder: 'stakeholders',
  decision: 'decisions',
  architecture: 'architecture',
  team: 'teams',
  history: 'history',
  businessOutcome: 'business-outcomes',
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ManualEntryStepProps {
  projectId: number
  approvedItems: ReviewItem[]
  manualItems: ManualItem[]
  onManualItemsChange: (items: ManualItem[]) => void
  onContinue: () => void
  onSkip: () => void
}

// ─── Inline Add Row Form ──────────────────────────────────────────────────────

interface AddRowFormProps {
  fields: string[]
  onSave: (values: Record<string, string>) => void
  onCancel: () => void
}

function AddRowForm({ fields, onSave, onCancel }: AddRowFormProps) {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(fields.map(f => [f, '']))
  )

  function handleChange(field: string, value: string) {
    setValues(prev => ({ ...prev, [field]: value }))
  }

  function handleSave() {
    const filled = Object.entries(values).filter(([, v]) => v.trim() !== '')
    if (filled.length === 0) return
    onSave(values)
  }

  return (
    <div className="border border-blue-200 bg-blue-50 rounded-md p-3 mb-3">
      <div className="grid grid-cols-2 gap-2 mb-3">
        {fields.map(field => (
          <div key={field}>
            <label className="block text-xs font-medium text-zinc-600 mb-1 capitalize">
              {field.replace(/_/g, ' ')}
            </label>
            <input
              type="text"
              value={values[field] ?? ''}
              onChange={e => handleChange(field, e.target.value)}
              className="w-full text-sm border border-zinc-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
              placeholder={field.replace(/_/g, ' ')}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={handleSave}>Save</Button>
        <Button size="sm" variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ManualEntryStep({
  projectId,
  approvedItems,
  manualItems,
  onManualItemsChange,
  onContinue,
  onSkip,
}: ManualEntryStepProps) {
  const [addingRowForType, setAddingRowForType] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ── Write all manual items to DB on exit ─────────────────────────────────

  async function writeManualItemsAndAdvance(advance: () => void) {
    if (manualItems.length === 0) {
      advance()
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const writes = manualItems.map(item => {
        const routeSegment = ENTITY_ROUTE_MAP[item.entityType]
        if (!routeSegment) return Promise.resolve()
        return fetch(`/api/projects/${projectId}/${routeSegment}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.fields),
        })
      })
      await Promise.all(writes)
      advance()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save items')
    } finally {
      setIsSaving(false)
    }
  }

  // ── Add a manually entered row ────────────────────────────────────────────

  function handleSaveRow(entityType: string, values: Record<string, string>) {
    const newItem: ManualItem = { entityType, fields: values }
    onManualItemsChange([...manualItems, newItem])
    setAddingRowForType(null)
  }

  // ── Per-tab content ───────────────────────────────────────────────────────

  function getApprovedForType(type: string): ReviewItem[] {
    return approvedItems.filter(i => i.entityType === type)
  }

  function getManualForType(type: string): ManualItem[] {
    return manualItems.filter(i => i.entityType === type)
  }

  function getTabCount(type: string): number {
    return getApprovedForType(type).length + getManualForType(type).length
  }

  const defaultTab = ENTITY_TABS[0].type

  return (
    <div className="flex flex-col h-full gap-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
        </div>
      )}

      <Tabs defaultValue={defaultTab} className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="shrink-0 flex-wrap h-auto gap-1 bg-zinc-100 p-1 rounded-md">
          {ENTITY_TABS.map(tab => {
            const count = getTabCount(tab.type)
            return (
              <TabsTrigger key={tab.type} value={tab.type} className="gap-1.5">
                {tab.label}
                {count > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-zinc-200 text-zinc-700 text-[11px] font-semibold px-1">
                    {count}
                  </span>
                )}
              </TabsTrigger>
            )
          })}
        </TabsList>

        {ENTITY_TABS.map(tab => {
          const approvedForTab = getApprovedForType(tab.type)
          const manualForTab = getManualForType(tab.type)
          const isAddingRow = addingRowForType === tab.type

          return (
            <TabsContent key={tab.type} value={tab.type} className="flex-1 overflow-y-auto mt-3">
              {/* AI-approved read-only rows */}
              {approvedForTab.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-zinc-500 mb-2 uppercase tracking-wide">
                    From AI Extraction
                  </p>
                  <div className="divide-y divide-zinc-100 border rounded-md overflow-hidden">
                    {approvedForTab.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3 px-3 py-2 bg-zinc-50">
                        <span className="text-xs bg-blue-100 text-blue-700 rounded px-1.5 py-0.5 font-medium shrink-0">
                          AI
                        </span>
                        <div className="flex-1 text-sm text-zinc-700 truncate">
                          {item.fields?.title ?? item.fields?.name ?? item.fields?.content ?? JSON.stringify(item.fields)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Manually added rows */}
              {manualForTab.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-zinc-500 mb-2 uppercase tracking-wide">
                    Added Manually
                  </p>
                  <div className="divide-y divide-zinc-100 border rounded-md overflow-hidden">
                    {manualForTab.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3 px-3 py-2">
                        <span className="text-xs bg-green-100 text-green-700 rounded px-1.5 py-0.5 font-medium shrink-0">
                          Manual
                        </span>
                        <div className="flex-1 text-sm text-zinc-700 truncate">
                          {item.fields?.title ?? item.fields?.name ?? item.fields?.content ?? JSON.stringify(item.fields)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add Row form */}
              {isAddingRow && (
                <AddRowForm
                  fields={tab.fields}
                  onSave={(values) => handleSaveRow(tab.type, values)}
                  onCancel={() => setAddingRowForType(null)}
                />
              )}

              {/* Empty state */}
              {approvedForTab.length === 0 && manualForTab.length === 0 && !isAddingRow && (
                <p className="text-zinc-400 text-sm text-center py-8">
                  No {tab.label.toLowerCase()} yet. Add one below.
                </p>
              )}

              {/* Add Row button */}
              {!isAddingRow && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAddingRowForType(tab.type)}
                  className="mt-2"
                >
                  + Add Row
                </Button>
              )}
            </TabsContent>
          )
        })}
      </Tabs>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t shrink-0">
        <button
          type="button"
          onClick={() => writeManualItemsAndAdvance(onSkip)}
          disabled={isSaving}
          className="px-4 py-2 text-sm text-zinc-500 hover:text-zinc-700 transition-colors disabled:opacity-50"
        >
          Skip
        </button>
        <Button
          onClick={() => writeManualItemsAndAdvance(onContinue)}
          disabled={isSaving}
        >
          {isSaving ? 'Saving…' : 'Continue to Launch'}
        </Button>
      </div>
    </div>
  )
}

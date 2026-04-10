'use client'

import { useState } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { ExtractionItemRow } from './ExtractionItemRow'
import type { ReviewItem } from './IngestionModal'

// ─── Types ────────────────────────────────────────────────────────────────────

export const TAB_LABELS: Record<string, string> = {
  action: 'Actions',
  risk: 'Risks',
  decision: 'Decisions',
  milestone: 'Milestones',
  stakeholder: 'Stakeholders',
  task: 'Tasks',
  architecture: 'Architecture',
  history: 'History',
  businessOutcome: 'Business Outcomes',
  team: 'Teams',
  focus_area: 'Focus Areas',
  e2e_workflow: 'E2E Workflows',
  team_pathway: 'Team Pathways',
  wbs_task: 'WBS Tasks',
  note: 'Notes',
  workstream: 'Workstreams',
  onboarding_step: 'Onboarding Steps',
  integration: 'Integrations',
  arch_node: 'Arch Nodes',
  before_state: 'Before State',
  weekly_focus: 'Weekly Focus',
}

// Entity type order for consistent tab ordering
const ENTITY_ORDER: string[] = [
  'action', 'risk', 'decision', 'milestone', 'stakeholder',
  'task', 'architecture', 'history', 'businessOutcome', 'team',
  'focus_area', 'e2e_workflow', 'team_pathway',  // Team-adjacent group
  'wbs_task', 'note', 'workstream', 'onboarding_step',  // Delivery group
  'integration', 'arch_node', 'before_state', 'weekly_focus',  // Architecture group
]

interface ExtractionPreviewProps {
  items: ReviewItem[]
  onItemChange: (index: number, changes: Partial<ReviewItem>) => void
  onApprove: (approvedItems: ReviewItem[]) => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ExtractionPreview({ items, onItemChange, onApprove }: ExtractionPreviewProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  // Group items by entityType — only include types that have items
  const grouped = ENTITY_ORDER.reduce<Record<string, number[]>>((acc, type) => {
    const indices = items.reduce<number[]>((idxs, item, i) => {
      if (item.entityType === type) idxs.push(i)
      return idxs
    }, [])
    if (indices.length > 0) acc[type] = indices
    return acc
  }, {})

  const activeTypes = Object.keys(grouped)
  const defaultTab = activeTypes[0] ?? ''

  const approvedCount = items.filter(i => i.approved).length

  function handleApproveAllOnTab(type: string) {
    const indices = grouped[type] ?? []
    indices.forEach(idx => onItemChange(idx, { approved: true }))
  }

  function handleApproveAllTabs() {
    items.forEach((_, idx) => onItemChange(idx, { approved: true }))
  }

  function handleSubmit() {
    const approvedItems = items.filter(i => i.approved)
    onApprove(approvedItems)
  }

  if (activeTypes.length === 0) {
    return (
      <div className="text-center py-16 text-zinc-500 text-sm">
        No items extracted from the uploaded documents.
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Top bar: approve all tabs + submit */}
      <div className="flex items-center justify-between gap-3 pb-2 border-b">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleApproveAllTabs}>
            Approve All Tabs
          </Button>
          <span className="text-xs text-zinc-500">
            {approvedCount} of {items.length} approved
          </span>
        </div>
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={approvedCount === 0}
        >
          Submit Approved ({approvedCount})
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue={defaultTab} className="flex-1 overflow-hidden flex flex-col">
        <TabsList className="shrink-0 flex-wrap h-auto gap-1 bg-zinc-100 p-1 rounded-md">
          {activeTypes.map(type => {
            const count = (grouped[type] ?? []).length
            return (
              <TabsTrigger key={type} value={type} className="gap-1.5">
                {TAB_LABELS[type] ?? type}
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-zinc-200 text-zinc-700 text-[11px] font-semibold px-1">
                  {count}
                </span>
              </TabsTrigger>
            )
          })}
        </TabsList>

        {activeTypes.map(type => {
          const indices = grouped[type] ?? []
          return (
            <TabsContent key={type} value={type} className="flex-1 overflow-y-auto mt-3">
              {/* Per-tab approve all */}
              <div className="flex justify-end mb-2">
                <Button variant="outline" size="sm" onClick={() => handleApproveAllOnTab(type)}>
                  Approve All
                </Button>
              </div>

              <div className="divide-y divide-zinc-100 border rounded-md overflow-hidden">
                {indices.map(globalIdx => (
                  <ExtractionItemRow
                    key={globalIdx}
                    item={items[globalIdx]}
                    globalIndex={globalIdx}
                    isExpanded={expandedIndex === globalIdx}
                    onToggleExpand={() =>
                      setExpandedIndex(prev => (prev === globalIdx ? null : globalIdx))
                    }
                    onChange={changes => onItemChange(globalIdx, changes)}
                  />
                ))}
              </div>
            </TabsContent>
          )
        })}
      </Tabs>
    </div>
  )
}

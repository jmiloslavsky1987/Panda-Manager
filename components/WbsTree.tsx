'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
} from '@dnd-kit/core'
import type { WbsItem, TaskWithBlockedStatus } from '@/lib/queries'
import { WbsNode } from './WbsNode'
import { WbsGeneratePlanModal } from './WbsGeneratePlanModal'
import { toast } from 'sonner'

interface WbsTreeProps {
  adrItems: WbsItem[]
  biggyItems: WbsItem[]
  projectId: number
  showGeneratePlan?: boolean
  activeTracks?: { adr: boolean; biggy: boolean }
  tasks?: TaskWithBlockedStatus[]
}

export function WbsTree({ adrItems, biggyItems, projectId, showGeneratePlan, activeTracks, tasks }: WbsTreeProps) {
  const router = useRouter()

  const tracks = activeTracks ?? { adr: true, biggy: true }
  const visibleTracks: Array<'ADR' | 'Biggy'> = [
    ...(tracks.adr ? ['ADR' as const] : []),
    ...(tracks.biggy ? ['Biggy' as const] : []),
  ]

  const [activeTrack, setActiveTrack] = useState<'ADR' | 'Biggy'>(visibleTracks[0] ?? 'ADR')

  // Derive current items based on active track
  const items = activeTrack === 'ADR' ? adrItems : biggyItems

  // Build childrenMap: Map<parent_id, WbsItem[]>
  const childrenMap = useMemo(() => {
    const map = new Map<number | null, WbsItem[]>()
    items.forEach(item => {
      const key = item.parent_id ?? null
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(item)
    })
    // Sort children by display_order
    map.forEach(children => children.sort((a, b) => a.display_order - b.display_order))
    return map
  }, [items])

  // Build set of phase names that have at least one blocked task
  const blockedPhases = useMemo(() => {
    if (!tasks) return new Set<string>()
    return new Set(
      tasks
        .filter(t => (t.is_blocked || t.status === 'blocked') && t.phase)
        .map(t => t.phase!.toLowerCase())
    )
  }, [tasks])

  // Returns true if a WBS node name is associated with any blocked phase
  const isNodeBlocked = (nodeName: string): boolean => {
    const lower = nodeName.toLowerCase()
    for (const phase of blockedPhases) {
      if (lower.includes(phase) || phase.includes(lower)) return true
    }
    return false
  }

  // Initialize expandedIds with all Level 1 nodes
  const [expandedIds, setExpandedIds] = useState<Set<number>>(() => {
    return new Set(items.filter(item => item.level === 1).map(item => item.id))
  })

  // Only reset expanded state when the track tab changes, not on data refresh
  const prevTrackRef = useRef(activeTrack)
  useEffect(() => {
    if (prevTrackRef.current === activeTrack) return
    prevTrackRef.current = activeTrack
    setExpandedIds(new Set(items.filter(item => item.level === 1).map(item => item.id)))
  }, [activeTrack, items])

  // Reset expandedIds and activeTrack when activeTracks prop changes (e.g. after admin saves settings)
  useEffect(() => {
    const newTracks = activeTracks ?? { adr: true, biggy: true }
    const newVisible: Array<'ADR' | 'Biggy'> = [
      ...(newTracks.adr ? ['ADR' as const] : []),
      ...(newTracks.biggy ? ['Biggy' as const] : []),
    ]
    if (newVisible.length > 0) setActiveTrack(newVisible[0])
    const newItems = newVisible[0] === 'ADR' ? adrItems : biggyItems
    setExpandedIds(new Set(newItems.filter(item => item.level === 1).map(item => item.id)))
  }, [activeTracks, adrItems, biggyItems])

  const [draggingId, setDraggingId] = useState<number | null>(null)

  // Toggle expand/collapse
  const toggleExpand = (id: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // Setup drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    setDraggingId(Number(event.active.id))
  }

  // Handle drag end
  const handleDragEnd = async (event: DragEndEvent) => {
    setDraggingId(null)
    const { active, over } = event
    if (!over || active.id === over.id) return

    const draggedId = Number(active.id)
    const newParentId = over.id === 'root' ? null : Number(over.id)

    try {
      const response = await fetch(`/api/projects/${projectId}/wbs/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: draggedId,
          newParentId,
          newDisplayOrder: 0, // Server auto-assigns to end of target parent
        }),
      })

      if (!response.ok) {
        throw new Error('Reorder failed')
      }

      router.refresh()
    } catch (error) {
      toast.error('Reorder failed — please try again')
      router.refresh()
    }
  }

  // Update expandedIds from external (used by WbsNode for delete operations)
  const handleExpandedIdsChange = (updater: (prev: Set<number>) => Set<number>) => {
    setExpandedIds(updater)
  }

  // Handle Generate Plan confirmation — expand newly added items' parent sections
  const handleGenerateConfirmed = (newParentIds: number[]) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      newParentIds.forEach(id => next.add(id))
      return next
    })
    router.refresh() // Reload WBS items from server
  }

  // Get root nodes (parent_id === null)
  const rootNodes = childrenMap.get(null) ?? []

  return (
    <div className="flex flex-col">
      {/* Header with Generate Plan button */}
      {showGeneratePlan && (
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-semibold text-zinc-800">Work Breakdown Structure</h1>
          <WbsGeneratePlanModal projectId={projectId} onConfirmed={handleGenerateConfirmed} />
        </div>
      )}

      {/* Tab switcher — only render visible tracks */}
      <div className="flex gap-4 border-b border-zinc-200 mb-4">
        {visibleTracks.includes('ADR') && (
          <button
            onClick={() => setActiveTrack('ADR')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTrack === 'ADR'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            ADR
          </button>
        )}
        {visibleTracks.includes('Biggy') && (
          <button
            onClick={() => setActiveTrack('Biggy')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTrack === 'Biggy'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            Biggy
          </button>
        )}
      </div>

      {/* All tracks disabled fallback */}
      {visibleTracks.length === 0 && (
        <p className="text-sm text-zinc-500 py-8 text-center">
          All tracks are disabled. Enable tracks in Admin &gt; Settings.
        </p>
      )}

      {/* Tree content */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="space-y-1">
          {rootNodes.map(node => (
            <WbsNode
              key={node.id}
              node={node}
              childrenMap={childrenMap}
              expandedIds={expandedIds}
              onToggleExpand={toggleExpand}
              onExpandedIdsChange={handleExpandedIdsChange}
              projectId={projectId}
              track={activeTrack}
              blockedPhases={blockedPhases}
              isNodeBlocked={isNodeBlocked}
            />
          ))}
        </div>
        <DragOverlay>
          {draggingId ? (
            <div className="bg-white border border-blue-400 rounded shadow-lg px-3 py-2 text-sm font-medium text-zinc-700">
              {items.find(i => i.id === draggingId)?.name}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

    </div>
  )
}

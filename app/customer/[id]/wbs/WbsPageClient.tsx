'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { WbsGrid } from '@/components/WbsGrid'
import type { WbsGridItem, WbsDependencyItem } from '@/components/WbsGrid.types'

type WbsTrack = 'ADR' | 'Biggy' | 'Incident Prevention'

interface WbsPageClientProps {
  projectId: number
  activeTracks: { adr: boolean; biggy: boolean; incident_prevention: boolean }
  adrItems: WbsGridItem[]
  biggyItems: WbsGridItem[]
  incidentPreventionItems: WbsGridItem[]
  dependencies: WbsDependencyItem[]
}

export function WbsPageClient({ projectId, activeTracks, adrItems, biggyItems, incidentPreventionItems, dependencies }: WbsPageClientProps) {
  const router = useRouter()
  const visibleTracks = (['ADR', 'Biggy', 'Incident Prevention'] as const).filter(t =>
    t === 'ADR' ? activeTracks.adr
    : t === 'Biggy' ? activeTracks.biggy
    : activeTracks.incident_prevention
  )
  const [activeTrack, setActiveTrack] = useState<WbsTrack>(visibleTracks[0] ?? 'ADR')

  const items =
    activeTrack === 'ADR' ? adrItems
    : activeTrack === 'Biggy' ? biggyItems
    : incidentPreventionItems
  const trackItemIds = new Set(items.map(i => i.id))
  const trackDeps = dependencies.filter(
    d => trackItemIds.has(d.from_item_id) && trackItemIds.has(d.to_item_id)
  )

  async function onAddRow() {
    try {
      const res = await fetch(`/api/projects/${projectId}/wbs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New Task', track: activeTrack, level: 1, parent_id: null }),
      })
      if (!res.ok) throw new Error(await res.text())
      router.refresh()
    } catch {
      toast.error('Failed to add row')
    }
  }

  async function onIndent(itemId: number) {
    // Find the item above in the flat DFS order and make it the parent
    const flat = items  // items is already DFS-ordered from server
    const idx = flat.findIndex(i => i.id === itemId)
    if (idx <= 0) return  // Nothing above to indent under
    const prevItem = flat[idx - 1]
    try {
      const res = await fetch(`/api/projects/${projectId}/wbs/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, newParentId: prevItem.id, newDisplayOrder: 0 }),
      })
      if (!res.ok) throw new Error(await res.text())
      router.refresh()
    } catch {
      toast.error('Failed to indent row')
    }
  }

  async function onOutdent(itemId: number) {
    const item = items.find(i => i.id === itemId)
    if (!item || item.parent_id == null) return  // Already at root
    const parent = items.find(i => i.id === item.parent_id)
    const newParentId = parent?.parent_id ?? null
    try {
      const res = await fetch(`/api/projects/${projectId}/wbs/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, newParentId, newDisplayOrder: 0 }),
      })
      if (!res.ok) throw new Error(await res.text())
      router.refresh()
    } catch {
      toast.error('Failed to outdent row')
    }
  }

  async function onDependenciesChange(
    itemId: number,
    newDeps: Array<{ from_item_id: number; to_item_id: number; dependency_type: string }>
  ) {
    try {
      // DELETE all existing deps where this item is the to_item_id
      const existing = dependencies.filter(d => d.to_item_id === itemId)
      for (const dep of existing) {
        const res = await fetch(`/api/projects/${projectId}/wbs/dependencies/${dep.id}`, { method: 'DELETE' })
        if (!res.ok) throw new Error(await res.text())
      }
      // POST each new dep
      for (const dep of newDeps) {
        const res = await fetch(`/api/projects/${projectId}/wbs/dependencies`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dep),
        })
        if (!res.ok) throw new Error(await res.text())
      }
      router.refresh()
    } catch {
      toast.error('Failed to save dependencies')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        {visibleTracks.map(track => (
          <button
            key={track}
            onClick={() => setActiveTrack(track)}
            className={`px-4 py-2 rounded ${activeTrack === track ? 'bg-indigo-600 text-white' : 'bg-gray-100'}`}
          >
            {track}
          </button>
        ))}
      </div>
      <WbsGrid
        key={activeTrack}
        items={items}
        dependencies={trackDeps}
        projectId={projectId}
        onAddRow={onAddRow}
        onIndent={onIndent}
        onOutdent={onOutdent}
        onDependenciesChange={onDependenciesChange}
      />
    </div>
  )
}

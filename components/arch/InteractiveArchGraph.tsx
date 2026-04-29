'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { ArchitectureIntegration, TeamPathway, ArchTrack, ArchNode } from '@/lib/queries'
import { IntegrationDetailDrawer } from './IntegrationDetailDrawer'
import { TeamPathwayBridge } from './TeamPathwayBridge'
import { DndContext, PointerSensor, useSensor, useSensors, DragEndEvent, closestCenter } from '@dnd-kit/core'
import { SortableContext, useSortable, horizontalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import * as Tooltip from '@radix-ui/react-tooltip'

interface Props {
  integrations:      ArchitectureIntegration[]
  pathways:          TeamPathway[]
  projectId:         number
  tracks:            ArchTrack[]
  nodes:             ArchNode[]
  onPathwaysUpdate:  (p: TeamPathway[]) => void
  onEdit?:           (integration: ArchitectureIntegration) => void
  adrTeamNames?:     string[]
  biggyTeamNames?:   string[]
}

// Node status badge colors
function nodeBadgeClass(status: string): string {
  switch (status) {
    case 'live':        return 'bg-green-100 text-green-700'
    case 'in_progress': return 'bg-blue-100 text-blue-600'
    case 'planned':     return 'bg-zinc-100 text-zinc-500'
    default:            return 'bg-zinc-100 text-zinc-500'
  }
}

function nodeStatusLabel(status: string): string {
  switch (status) {
    case 'live':        return 'Live'
    case 'in_progress': return 'In Progress'
    case 'planned':     return 'Planned'
    default:            return status
  }
}

// Card background + border driven by STATUS (matches reference screenshot)
function cardBg(status: string): string {
  switch (status) {
    case 'live':        return 'bg-green-50 border-green-200 hover:bg-green-100'
    case 'in_progress': return 'bg-amber-50 border-amber-200 hover:bg-amber-100'
    case 'pilot':       return 'bg-sky-50 border-sky-200 hover:bg-sky-100'
    case 'planned':     return 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100'
    default:            return 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100'
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case 'live':        return 'LIVE'
    case 'in_progress': return 'In Progress'
    case 'pilot':       return 'Pilot'
    case 'planned':     return 'Planned'
    default:            return status
  }
}

function statusColor(status: string): string {
  switch (status) {
    case 'live':        return 'text-green-600 font-semibold'
    case 'in_progress': return 'text-amber-600 font-semibold'
    case 'pilot':       return 'text-sky-600 font-semibold'
    case 'planned':     return 'text-zinc-400'
    default:            return 'text-zinc-400'
  }
}

function IntegrationCard({
  integration,
  onClick,
}: {
  integration: ArchitectureIntegration
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left border rounded-md px-2.5 py-2 transition-shadow hover:shadow-md ${cardBg(integration.status)}`}
    >
      <div className="font-semibold text-zinc-900 text-xs leading-snug">
        {integration.tool_name}
      </div>
      {(integration.notes || integration.integration_method) && (
        <div className="text-[11px] text-zinc-500 mt-0.5 leading-tight">
          {integration.notes ?? integration.integration_method}
        </div>
      )}
      <div className={`text-[11px] mt-1.5 ${statusColor(integration.status)}`}>
        {statusLabel(integration.status)}
      </div>
    </button>
  )
}

function Arrow() {
  return (
    <div className="flex-shrink-0 flex items-start justify-center pt-[46px] px-2">
      <div className="flex items-center">
        <div className="w-7 h-px bg-zinc-300" />
        <div
          style={{
            width: 0,
            height: 0,
            borderTop: '4px solid transparent',
            borderBottom: '4px solid transparent',
            borderLeft: '6px solid #d1d5db',
          }}
        />
      </div>
    </div>
  )
}

function ConsoleNode({ track }: { track: string }) {
  const isADR = track.includes('ADR')
  const isAI = track.includes('AI') || track.includes('Biggy')
  const icon = isADR ? '🐼' : isAI ? '🦉' : '💻'
  const label = isADR ? 'BigPanda Console' : isAI ? 'Biggy AI Console' : 'Console'
  const bgColor = isADR ? 'bg-zinc-900' : isAI ? 'bg-amber-500' : 'bg-zinc-700'

  return (
    <div className="flex flex-col items-center justify-start pt-2">
      <div
        className={`w-[72px] h-[72px] rounded-full flex items-center justify-center shadow-md ${bgColor}`}
      >
        <span className="text-3xl select-none">{icon}</span>
      </div>
      <div className="text-xs text-zinc-600 mt-2 font-medium text-center leading-tight">
        {label}
      </div>
    </div>
  )
}

function SortablePhaseColumn({
  node,
  phase,
  integrations,
  track,
  onCardClick,
  onStatusClick,
}: {
  node: ArchNode
  phase: string
  integrations: ArchitectureIntegration[]
  track: string
  onCardClick: (i: ArchitectureIntegration) => void
  onStatusClick?: (node: ArchNode) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: node.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="flex items-start">
      <div className="flex-shrink-0 pt-[40px]">
        <span
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-zinc-300 hover:text-zinc-500 mr-1 text-xs"
          title="Drag to reorder"
        >
          ⠿
        </span>
      </div>
      <PhaseColumn
        phase={phase}
        integrations={integrations}
        track={track}
        node={node}
        onCardClick={onCardClick}
        onStatusClick={onStatusClick}
      />
    </div>
  )
}

function phaseHeaderStyle(phase: string): { wrapper: string; text: string } {
  if (phase === 'Event Ingest' || phase === 'Alert Intelligence') {
    return { wrapper: 'bg-blue-50 border-blue-200', text: 'text-blue-700' }
  }
  if (
    phase === 'Incident Intelligence' ||
    phase === 'Knowledge Sources' ||
    phase === 'Real-Time Query' ||
    phase === 'AI Capabilities'
  ) {
    return { wrapper: 'bg-amber-50 border-amber-200', text: 'text-amber-700' }
  }
  if (phase === 'Workflow Automation' || phase === 'Outputs & Actions') {
    return { wrapper: 'bg-green-50 border-green-200', text: 'text-green-700' }
  }
  return { wrapper: 'bg-zinc-50 border-zinc-200', text: 'text-zinc-500' }
}

function PhaseColumn({
  phase,
  integrations,
  track,
  node,
  onCardClick,
  onStatusClick,
}: {
  phase: string
  integrations: ArchitectureIntegration[]
  track: string
  node?: ArchNode
  onCardClick: (i: ArchitectureIntegration) => void
  onStatusClick?: (node: ArchNode) => void
}) {
  const isConsole = phase === 'Console'
  const { wrapper: headerWrapperClass, text: headerTextClass } = phaseHeaderStyle(phase)

  // Partition integrations by group
  const groupMap = new Map<string, ArchitectureIntegration[]>()
  const ungrouped: ArchitectureIntegration[] = []
  for (const int of integrations) {
    if (int.integration_group) {
      const existing = groupMap.get(int.integration_group) ?? []
      existing.push(int)
      groupMap.set(int.integration_group, existing)
    } else {
      ungrouped.push(int)
    }
  }

  return (
    <div className="flex flex-col w-[220px] flex-shrink-0">
      {/* Header with phase-aware color strip */}
      <div className={`text-center mb-3 min-h-[40px] flex flex-col items-center justify-end px-1 rounded-t border ${headerWrapperClass} py-1`}>
        <Tooltip.Provider>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <div className={`text-xs font-bold uppercase tracking-wider leading-tight mb-1 ${headerTextClass}`}>
                {phase}
              </div>
            </Tooltip.Trigger>
            {node?.notes && (
              <Tooltip.Portal>
                <Tooltip.Content
                  className="bg-zinc-900 text-white text-xs px-2 py-1 rounded shadow-lg max-w-xs"
                  sideOffset={5}
                >
                  {node.notes}
                  <Tooltip.Arrow className="fill-zinc-900" />
                </Tooltip.Content>
              </Tooltip.Portal>
            )}
          </Tooltip.Root>
        </Tooltip.Provider>
        {node && onStatusClick && (
          <button
            onClick={() => onStatusClick(node)}
            className={`mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold cursor-pointer transition-colors ${nodeBadgeClass(node.status)}`}
            title="Click to cycle status"
          >
            {nodeStatusLabel(node.status)}
          </button>
        )}
      </div>

      {/* Content */}
      {isConsole ? (
        <ConsoleNode track={track} />
      ) : integrations.length === 0 ? (
        <div className="text-zinc-300 text-sm text-center pt-6">—</div>
      ) : (
        <div className="flex flex-col gap-2">
          {/* Ungrouped integrations first */}
          {ungrouped.map((int) => (
            <IntegrationCard key={int.id} integration={int} onClick={() => onCardClick(int)} />
          ))}
          {/* Grouped integrations in dashed boxes */}
          {Array.from(groupMap.entries()).map(([groupName, items]) => (
            <div
              key={groupName}
              className="border border-dashed border-zinc-300 rounded-md p-2 mt-1"
            >
              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
                {groupName}
              </div>
              <div className="flex flex-col gap-1.5">
                {items.map((int) => (
                  <IntegrationCard key={int.id} integration={int} onClick={() => onCardClick(int)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function TrackPipeline({
  trackData,
  nodes,
  integrations,
  teamNames,
  onCardClick,
  onStatusClick,
  onDragEnd,
  sensors,
}: {
  trackData: ArchTrack
  nodes: ArchNode[]
  integrations: ArchitectureIntegration[]
  teamNames: string[]
  onCardClick: (i: ArchitectureIntegration) => void
  onStatusClick: (node: ArchNode) => void
  onDragEnd: (event: DragEndEvent, trackId: number) => void
  sensors: ReturnType<typeof useSensors>
}) {
  const isADR = trackData.name.includes('ADR')
  const isBiggy = trackData.name.includes('Biggy') || trackData.name.includes('AI')
  const borderClass = isADR ? 'border-l-blue-600' : isBiggy ? 'border-l-amber-500' : 'border-l-zinc-400'
  const labelClass = isADR ? 'text-blue-700' : isBiggy ? 'text-amber-700' : 'text-zinc-600'

  // Sort nodes by display_order
  const sortedNodes = [...nodes].sort((a, b) => a.display_order - b.display_order)
  const byPhase = (p: string) => integrations.filter((i) => i.phase === p)

  return (
    <div className={`border-l-4 ${borderClass} pl-4 py-1`}>
      {/* Track label + optional team names */}
      <div className="flex items-baseline gap-2 mb-5">
        <span className={`text-[11px] font-bold uppercase tracking-widest ${labelClass}`}>
          {trackData.name}
        </span>
        {teamNames.length > 0 && (
          <span className="text-[11px] text-zinc-400">
            {teamNames.join(' · ')}
          </span>
        )}
      </div>

      {/* Phase pipeline with drag-and-drop */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={(e) => onDragEnd(e, trackData.id)}
      >
        <SortableContext items={sortedNodes.map((n) => n.id)} strategy={horizontalListSortingStrategy}>
          <div className="flex items-start">
            {sortedNodes.map((node, idx) => (
              <div key={node.id} className="flex items-start">
                <SortablePhaseColumn
                  node={node}
                  phase={node.name}
                  integrations={byPhase(node.name)}
                  track={trackData.name}
                  onCardClick={onCardClick}
                  onStatusClick={onStatusClick}
                />
                {idx < sortedNodes.length - 1 && <Arrow />}
              </div>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}

export function InteractiveArchGraph({
  integrations,
  pathways,
  projectId,
  tracks,
  nodes,
  onPathwaysUpdate,
  adrTeamNames = [],
  biggyTeamNames = [],
}: Props) {
  const router = useRouter()
  const [selectedIntegration, setSelectedIntegration] = useState<ArchitectureIntegration | null>(null)
  const [localNodes, setLocalNodes] = useState<ArchNode[]>(nodes)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  // Status cycle: planned → in_progress → live → planned
  const statusCycle = { planned: 'in_progress', in_progress: 'live', live: 'planned' } as const

  async function handleStatusClick(node: ArchNode) {
    const newStatus = statusCycle[node.status as keyof typeof statusCycle]
    const prev = [...localNodes]
    setLocalNodes(localNodes.map((n) => (n.id === node.id ? { ...n, status: newStatus } : n)))
    try {
      const res = await fetch(`/api/projects/${projectId}/arch-nodes/${node.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error('Status update failed')
      router.refresh()
    } catch {
      setLocalNodes(prev)
      toast.error('Status update failed — please try again')
    }
  }

  async function handleDragEnd(event: DragEndEvent, trackId: number) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const trackNodes = localNodes
      .filter((n) => n.track_id === trackId)
      .sort((a, b) => a.display_order - b.display_order)
    const oldIndex = trackNodes.findIndex((n) => n.id === Number(active.id))
    const newIndex = trackNodes.findIndex((n) => n.id === Number(over.id))

    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(trackNodes, oldIndex, newIndex)
    // Optimistic: update localNodes with new display_order
    const updatedNodes = localNodes.map((n) => {
      const reorderedNode = reordered.find((r) => r.id === n.id)
      return reorderedNode ? { ...n, display_order: reordered.indexOf(reorderedNode) + 1 } : n
    })
    setLocalNodes(updatedNodes)

    const draggedNode = trackNodes[oldIndex]
    const targetNode = trackNodes[newIndex]
    try {
      const res = await fetch(`/api/projects/${projectId}/arch-nodes/reorder`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeId: draggedNode.id, trackId, newDisplayOrder: targetNode.display_order }),
      })
      if (!res.ok) throw new Error('Reorder failed')
      router.refresh()
    } catch {
      setLocalNodes(nodes) // rollback to original prop
      toast.error('Reorder failed — please try again')
    }
  }

  // Group nodes by track
  const sortedTracks = [...tracks].sort((a, b) => a.display_order - b.display_order)

  if (integrations.length === 0 && localNodes.length === 0) {
    return (
      <div className="h-[200px] border border-zinc-200 rounded-lg flex items-center justify-center text-zinc-400 text-sm">
        Add integrations to see the architecture diagram
      </div>
    )
  }

  return (
    <div className="flex gap-4">
      <div className="flex-1 min-w-0">
        {/* Top navigation row */}
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          {sortedTracks.map((track) => {
            const isADR = track.name.includes('ADR')
            const bgClass = isADR ? 'bg-blue-600' : 'bg-amber-500'
            return (
              <span key={track.id} className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${bgClass} text-white`}>
                {track.name}
              </span>
            )
          })}
          <span className="text-xs text-zinc-400 ml-1">
            Team-by-team rollout · see status table below
          </span>
        </div>
        <div className="text-[11px] text-zinc-400 mb-4">↔ Scroll horizontally if needed</div>

        {/* Horizontally scrollable pipeline */}
        <div className="overflow-x-auto pb-2">
          <div className="space-y-8" style={{ minWidth: '1080px' }}>
            {sortedTracks.map((track, trackIdx) => {
              const trackNodes = localNodes.filter((n) => n.track_id === track.id)
              const trackIntegrations = integrations.filter((i) => i.track === track.name)
              const isADR = track.name.includes('ADR')
              const trackTeamNames = isADR ? adrTeamNames : biggyTeamNames

              return (
                <div key={track.id}>
                  {/* Track separator (except for first track) */}
                  {trackIdx > 0 && (
                    <div className="flex items-center gap-2 my-2">
                      <div className="flex-1 border-t-2 border-zinc-300" />
                      <span className="text-xs font-bold text-zinc-500 px-2">↓ {track.name.toUpperCase()} ↓</span>
                      <div className="flex-1 border-t-2 border-zinc-300" />
                    </div>
                  )}
                  <TrackPipeline
                    trackData={track}
                    nodes={trackNodes}
                    integrations={trackIntegrations}
                    teamNames={trackTeamNames}
                    onCardClick={setSelectedIntegration}
                    onStatusClick={handleStatusClick}
                    onDragEnd={handleDragEnd}
                    sensors={sensors}
                  />
                  {/* Team Pathway Bridge between tracks */}
                  {trackIdx === 0 && sortedTracks.length > 1 && (
                    <TeamPathwayBridge
                      pathways={pathways}
                      projectId={projectId}
                      onPathwaysUpdate={onPathwaysUpdate}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {selectedIntegration && (
        <IntegrationDetailDrawer
          integration={selectedIntegration}
          onClose={() => setSelectedIntegration(null)}
        />
      )}
    </div>
  )
}

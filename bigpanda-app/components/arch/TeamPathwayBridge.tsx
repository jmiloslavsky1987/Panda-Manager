'use client'
import { useState } from 'react'
import type { TeamPathway } from '@/lib/queries'
import { TeamPathwayEditModal } from './TeamPathwayEditModal'

interface Props {
  pathways:           TeamPathway[]
  projectId:          number
  onPathwaysUpdate:   (p: TeamPathway[]) => void
}

function statusPill(status: string): React.ReactNode {
  const map: Record<string, { label: string; cls: string }> = {
    live:        { label: '● LIVE',        cls: 'text-green-600 font-semibold' },
    in_progress: { label: '⏳ In Progress', cls: 'text-amber-600 font-semibold' },
    pilot:       { label: '🔬 Pilot',      cls: 'text-sky-600 font-semibold' },
    planned:     { label: '📋 Planned',    cls: 'text-zinc-400' },
  }
  const entry = map[status] ?? map['planned']
  return <span className={`text-[11px] whitespace-nowrap ${entry.cls}`}>{entry.label}</span>
}

function RouteSteps({ steps }: { steps: Array<{ label: string }> }) {
  if (!steps || steps.length === 0) {
    return <span className="text-zinc-300 text-xs italic">no steps defined</span>
  }
  return (
    <span className="flex items-center gap-1 flex-wrap">
      {steps.map((s, i) => (
        <span key={i} className="flex items-center gap-1">
          <span className="inline-block px-2 py-0.5 rounded text-[11px] bg-amber-100 text-amber-800 font-medium">
            {s.label}
          </span>
          {i < steps.length - 1 && (
            <span className="text-zinc-400 text-xs select-none">→</span>
          )}
        </span>
      ))}
    </span>
  )
}

export function TeamPathwayBridge({ pathways, projectId, onPathwaysUpdate }: Props) {
  const [editingPathway, setEditingPathway] = useState<TeamPathway | null | undefined>(undefined)
  // undefined = modal closed; null = creating new; TeamPathway = editing existing

  function handleSave(saved: TeamPathway) {
    const existing = pathways.find(p => p.id === saved.id)
    if (existing) {
      onPathwaysUpdate(pathways.map(p => p.id === saved.id ? saved : p))
    } else {
      onPathwaysUpdate([...pathways, saved])
    }
    setEditingPathway(undefined)
  }

  function handleDelete(id: number) {
    onPathwaysUpdate(pathways.filter(p => p.id !== id))
    setEditingPathway(undefined)
  }

  return (
    <>
      <div className="my-2">
        {/* Header row */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-amber-600">
              Team Pathways
            </span>
            <span className="text-[11px] text-zinc-400">ADR → Biggy bridge (per team)</span>
          </div>
          <button
            onClick={() => setEditingPathway(null)}
            className="px-2.5 py-1 text-[11px] font-semibold border border-amber-300 bg-amber-50 text-amber-700 rounded hover:bg-amber-100"
          >
            + Add Pathway
          </button>
        </div>

        {/* Pathway rows */}
        <div className="border border-zinc-200 rounded-md overflow-hidden">
          {pathways.length === 0 ? (
            <div className="py-4 px-4 text-zinc-400 text-xs italic text-center">
              No team pathways defined — add one to show ADR→Biggy routing
            </div>
          ) : (
            <table className="w-full text-xs">
              <tbody>
                {pathways.map((p, idx) => {
                  const steps = p.route_steps as Array<{ label: string }>
                  return (
                    <tr
                      key={p.id}
                      className={`${idx % 2 === 0 ? 'bg-white' : 'bg-zinc-50'} hover:bg-amber-50 transition-colors`}
                    >
                      <td className="py-2 px-3 font-semibold text-zinc-800 whitespace-nowrap w-[140px]">
                        {p.team_name}
                      </td>
                      <td className="py-2 px-2">
                        <RouteSteps steps={steps} />
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        {statusPill(p.status)}
                      </td>
                      <td className="py-2 px-2 w-[32px]">
                        {p.source === 'manual' || p.source === 'ingestion' ? (
                          <button
                            onClick={() => setEditingPathway(p)}
                            className="text-zinc-400 hover:text-zinc-700 text-xs px-1"
                            title="Edit pathway"
                          >
                            ✎
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Amber pill separator pointing down to Biggy track */}
        <div className="flex items-center justify-center py-2">
          <div className="inline-flex items-center gap-2 border border-amber-400 bg-white text-amber-600 text-[11px] font-bold uppercase tracking-widest px-5 py-1.5 rounded-full">
            ↓ Biggy AI Track ↓
          </div>
        </div>
      </div>

      {editingPathway !== undefined && (
        <TeamPathwayEditModal
          projectId={projectId}
          pathway={editingPathway}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setEditingPathway(undefined)}
        />
      )}
    </>
  )
}

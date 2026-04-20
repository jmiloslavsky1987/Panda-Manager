'use client'

import { useState } from 'react'
import type { FocusArea } from '@/lib/queries'
import { WarnBanner } from './WarnBanner'
import { TeamMetadataEditModal } from './TeamMetadataEditModal'

// Left border color for cards (4px)
function leftBorderColor(tracks: string | null) {
  if (!tracks) return '#6b7280'
  const trackList = tracks.toLowerCase()
  const hasADR = trackList.includes('adr')
  const hasBiggy = trackList.includes('biggy')

  if (hasADR && hasBiggy) return '#0d9488' // teal for both
  if (hasADR) return '#1e40af' // blue for ADR
  if (hasBiggy) return '#6d28d9' // purple for Biggy
  return '#6b7280' // gray for other
}

// Track badge style
function trackBadgeStyle(track: string) {
  const t = track.trim()
  if (t === 'ADR') return { bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe' }
  if (t === 'Biggy') return { bg: '#f5f3ff', text: '#6d28d9', border: '#ddd6fe' }
  return { bg: '#f3f4f6', text: '#374151', border: '#d1d5db' }
}

const FOCUS_AREA_FIELDS = [
  { name: 'title', label: 'Title', type: 'text' as const },
  { name: 'tracks', label: 'Tracks (comma-separated)', type: 'text' as const },
  { name: 'why_it_matters', label: 'Why It Matters', type: 'textarea' as const },
  { name: 'current_status', label: 'Current Status', type: 'text' as const },
  { name: 'next_step', label: 'Next Step', type: 'text' as const },
  { name: 'bp_owner', label: 'BP Owner', type: 'text' as const },
  { name: 'customer_owner', label: 'Customer Owner', type: 'text' as const },
]

interface Props {
  projectId: number
  focusAreas: FocusArea[]
  onUpdate: (areas: FocusArea[]) => void
}

export function FocusAreasSection({ projectId, focusAreas, onUpdate }: Props) {
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<FocusArea | null>(null)

  async function handleAdd(values: Record<string, string>) {
    const optimistic: FocusArea = {
      id: Date.now(),
      project_id: projectId,
      title: values.title ?? '',
      tracks: values.tracks ?? null,
      why_it_matters: values.why_it_matters ?? null,
      current_status: values.current_status ?? null,
      next_step: values.next_step ?? null,
      bp_owner: values.bp_owner ?? null,
      customer_owner: values.customer_owner ?? null,
      source: 'manual',
      source_artifact_id: null,
      discovery_source: null,
      ingested_at: null,
      created_at: new Date(),
    }
    onUpdate([...focusAreas, optimistic])
    setAddModalOpen(false)

    try {
      const res = await fetch(`/api/projects/${projectId}/focus-areas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (!res.ok) throw new Error('Failed to save')
      const saved: FocusArea = await res.json()
      onUpdate([...focusAreas, saved])
    } catch {
      onUpdate(focusAreas)
    }
  }

  async function handleEdit(area: FocusArea, values: Record<string, string>) {
    const updated: FocusArea = {
      ...area,
      title: values.title ?? area.title,
      tracks: values.tracks ?? area.tracks,
      why_it_matters: values.why_it_matters ?? area.why_it_matters,
      current_status: values.current_status ?? area.current_status,
      next_step: values.next_step ?? area.next_step,
      bp_owner: values.bp_owner ?? area.bp_owner,
      customer_owner: values.customer_owner ?? area.customer_owner,
    }
    onUpdate(focusAreas.map((a) => (a.id === area.id ? updated : a)))
    setEditTarget(null)

    try {
      const res = await fetch(`/api/projects/${projectId}/focus-areas/${area.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (!res.ok) throw new Error('Failed to save')
    } catch {
      onUpdate(focusAreas)
    }
  }

  const displayAreas = focusAreas.slice(0, 5)

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setAddModalOpen(true)}
          className="text-sm px-3 py-1.5 rounded-md border border-zinc-300 hover:bg-zinc-50"
        >
          + Add Focus Area
        </button>
      </div>

      {focusAreas.length === 0 ? (
        <WarnBanner message="No focus areas recorded — add focus areas to populate this section." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {displayAreas.map((area) => {
            const trackList = area.tracks ? area.tracks.split(',').map((t) => t.trim()).filter(Boolean) : []
            const leftBorder = leftBorderColor(area.tracks)
            const statusText = [area.current_status, area.next_step].filter(Boolean).join(' → ')

            return (
              <div
                key={area.id}
                className="border border-zinc-200 rounded-xl bg-white p-4 flex flex-col gap-3 relative"
                style={{ borderLeftWidth: '4px', borderLeftColor: leftBorder }}
              >
                {/* edit icon */}
                <button
                  onClick={() => setEditTarget(area)}
                  className="absolute top-3 right-3 text-zinc-400 hover:text-zinc-600 text-xs"
                  aria-label="Edit focus area"
                >
                  &#9998;
                </button>

                {/* Track badge in top-right area */}
                {trackList.length > 0 && (
                  <div className="flex gap-1 flex-wrap pr-6">
                    {trackList.map((t) => {
                      const tk = trackBadgeStyle(t)
                      return (
                        <span
                          key={t}
                          className="text-xs px-2 py-0.5 rounded-full font-semibold"
                          style={{ background: tk.bg, color: tk.text, border: `1px solid ${tk.border}` }}
                        >
                          {t}
                        </span>
                      )
                    })}
                  </div>
                )}

                {/* Title */}
                <p className="font-bold text-zinc-900 text-sm pr-6">{area.title}</p>

                {/* Description (why it matters) */}
                {area.why_it_matters && (
                  <p className="text-sm text-zinc-600">{area.why_it_matters}</p>
                )}

                {/* Current status & next step */}
                {statusText && (
                  <div>
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Current Status &amp; Next Step</p>
                    <p className="text-sm text-zinc-700 mt-1">{statusText}</p>
                  </div>
                )}

                {/* Horizontal separator */}
                <hr className="border-zinc-100" />

                {/* Footer: owners */}
                <div className="flex gap-4 text-xs text-zinc-500">
                  {area.customer_owner && (
                    <span><span className="font-semibold">AMEX:</span> {area.customer_owner}</span>
                  )}
                  {area.bp_owner && (
                    <span><span className="font-semibold">BigPanda:</span> {area.bp_owner}</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {addModalOpen && (
        <TeamMetadataEditModal
          title="Add Focus Area"
          fields={FOCUS_AREA_FIELDS}
          initialValues={{}}
          onSave={handleAdd}
          onClose={() => setAddModalOpen(false)}
        />
      )}

      {editTarget && (
        <TeamMetadataEditModal
          title="Edit Focus Area"
          fields={FOCUS_AREA_FIELDS}
          initialValues={{
            title: editTarget.title ?? '',
            tracks: editTarget.tracks ?? '',
            why_it_matters: editTarget.why_it_matters ?? '',
            current_status: editTarget.current_status ?? '',
            next_step: editTarget.next_step ?? '',
            bp_owner: editTarget.bp_owner ?? '',
            customer_owner: editTarget.customer_owner ?? '',
          }}
          onSave={(values) => handleEdit(editTarget, values)}
          onClose={() => setEditTarget(null)}
        />
      )}
    </section>
  )
}

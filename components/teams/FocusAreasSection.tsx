'use client'

import { useState } from 'react'
import type { FocusArea } from '@/lib/queries'
import { WarnBanner } from './WarnBanner'
import { InlineEditModal } from './InlineEditModal'

// Design tokens
const ADR = { text: '#1e40af', bg: '#eff6ff', border: '#bfdbfe' }
const BIGGY = { text: '#6d28d9', bg: '#f5f3ff', border: '#ddd6fe' }

function trackTokens(t: string) {
  if (t.trim() === 'ADR') return ADR
  if (t.trim() === 'Biggy') return BIGGY
  return { text: '#374151', bg: '#f3f4f6', border: '#d1d5db' }
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
        <h2 className="text-lg font-semibold text-zinc-900">Top Focus Areas</h2>
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
            return (
              <div
                key={area.id}
                className="border border-zinc-200 rounded-lg p-4 space-y-2 bg-white relative"
              >
                {/* edit icon */}
                <button
                  onClick={() => setEditTarget(area)}
                  className="absolute top-3 right-3 text-zinc-400 hover:text-zinc-600 text-xs"
                  aria-label="Edit focus area"
                >
                  &#9998;
                </button>

                <p className="font-semibold text-zinc-900 text-sm pr-6">{area.title}</p>

                {/* tracks pills */}
                {trackList.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {trackList.map((t) => {
                      const tk = trackTokens(t)
                      return (
                        <span
                          key={t}
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ background: tk.bg, color: tk.text, border: `1px solid ${tk.border}` }}
                        >
                          {t}
                        </span>
                      )
                    })}
                  </div>
                )}

                {/* why it matters */}
                {area.why_it_matters && (
                  <p className="text-xs text-zinc-600 italic">{area.why_it_matters}</p>
                )}

                {/* current status → next step */}
                {(area.current_status || area.next_step) && (
                  <p className="text-xs text-zinc-500">
                    {area.current_status}
                    {area.current_status && area.next_step && ' \u2192 '}
                    {area.next_step}
                  </p>
                )}

                {/* owners */}
                <div className="text-xs text-zinc-400 space-y-0.5 pt-1 border-t border-zinc-100">
                  {area.bp_owner && <p>BP: {area.bp_owner}</p>}
                  {area.customer_owner && <p>Customer: {area.customer_owner}</p>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {addModalOpen && (
        <InlineEditModal
          title="Add Focus Area"
          fields={FOCUS_AREA_FIELDS}
          initialValues={{}}
          onSave={handleAdd}
          onClose={() => setAddModalOpen(false)}
        />
      )}

      {editTarget && (
        <InlineEditModal
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

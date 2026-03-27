'use client'

import type { BusinessOutcome } from '@/lib/queries'
import { WarnBanner } from './WarnBanner'
import { InlineEditModal } from './InlineEditModal'
import { useState } from 'react'

// Design tokens
const ADR = { text: '#1e40af', bg: '#eff6ff', border: '#bfdbfe' }
const BIGGY = { text: '#6d28d9', bg: '#f5f3ff', border: '#ddd6fe' }

function trackStyle(track: string) {
  if (track === 'ADR') return ADR
  if (track === 'Biggy') return BIGGY
  return { text: '#374151', bg: '#f3f4f6', border: '#d1d5db' }
}

function statusBadge(status: string) {
  switch (status) {
    case 'live':
      return { bg: '#dcfce7', text: '#14532d', label: 'Live' }
    case 'in_progress':
      return { bg: '#fef3c7', text: '#92400e', label: 'In Progress' }
    case 'blocked':
      return { bg: '#fee2e2', text: '#991b1b', label: 'Blocked' }
    case 'planned':
    default:
      return { bg: '#f1f5f9', text: '#475569', label: 'Planned' }
  }
}

interface Props {
  projectId: number
  outcomes: BusinessOutcome[]
  onUpdate: (outcomes: BusinessOutcome[]) => void
}

const OUTCOME_FIELDS = [
  { name: 'title', label: 'Title', type: 'text' as const },
  {
    name: 'track',
    label: 'Track',
    type: 'select' as const,
    options: ['ADR', 'Biggy', 'Both'],
  },
  { name: 'description', label: 'Description', type: 'textarea' as const },
  {
    name: 'delivery_status',
    label: 'Delivery Status',
    type: 'select' as const,
    options: ['live', 'in_progress', 'blocked', 'planned'],
  },
  { name: 'mapping_note', label: 'Mapping Note', type: 'text' as const },
]

export function BusinessOutcomesSection({ projectId, outcomes, onUpdate }: Props) {
  const [modalOpen, setModalOpen] = useState(false)

  async function handleSave(values: Record<string, string>) {
    const optimistic: BusinessOutcome = {
      id: Date.now(),
      project_id: projectId,
      title: values.title ?? '',
      track: (values.track as BusinessOutcome['track']) ?? 'ADR',
      description: values.description ?? null,
      delivery_status: (values.delivery_status as BusinessOutcome['delivery_status']) ?? 'planned',
      mapping_note: values.mapping_note ?? null,
      source: 'manual',
      source_artifact_id: null,
      discovery_source: null,
      ingested_at: null,
      created_at: new Date(),
    }
    onUpdate([...outcomes, optimistic])
    setModalOpen(false)

    try {
      const res = await fetch(`/api/projects/${projectId}/business-outcomes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (!res.ok) throw new Error('Failed to save')
      const saved: BusinessOutcome = await res.json()
      onUpdate([...outcomes, saved])
    } catch {
      // revert
      onUpdate(outcomes)
    }
  }

  const tracks = outcomes.map((o) => o.track)
  const allTracks = Array.from(new Set(tracks))

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-zinc-900">
          Business Value &amp; Expected Outcomes
        </h2>
        <button
          onClick={() => setModalOpen(true)}
          className="text-sm px-3 py-1.5 rounded-md border border-zinc-300 hover:bg-zinc-50"
        >
          + Add Outcome
        </button>
      </div>

      {outcomes.length === 0 ? (
        <WarnBanner message="No business outcomes recorded — add outcomes to populate this section." />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {outcomes.map((outcome) => {
            const ts = trackStyle(outcome.track ?? 'ADR')
            const badge = statusBadge(outcome.delivery_status ?? 'planned')
            const tracksArr = outcome.track === 'Both' ? ['ADR', 'Biggy'] : [outcome.track ?? 'ADR']
            return (
              <div
                key={outcome.id}
                className="rounded-lg border p-4 space-y-2"
                style={{ borderColor: ts.border, background: ts.bg }}
              >
                {/* icon + title */}
                <div className="flex items-start gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
                    style={{ background: outcome.track === 'Both' ? 'linear-gradient(135deg, #1e40af, #6d28d9)' : ts.text }}
                  >
                    {outcome.track === 'Both' ? 'B' : (outcome.track ?? 'A')[0]}
                  </div>
                  <p className="font-semibold text-zinc-900 text-sm">{outcome.title}</p>
                </div>

                {/* track pills */}
                <div className="flex gap-1 flex-wrap">
                  {tracksArr.map((t) => {
                    const s = trackStyle(t)
                    return (
                      <span
                        key={t}
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}` }}
                      >
                        {t}
                      </span>
                    )
                  })}
                </div>

                {/* status badge */}
                <span
                  className="inline-block text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: badge.bg, color: badge.text }}
                >
                  {badge.label}
                </span>

                {/* mapping note */}
                {outcome.mapping_note && (
                  <p className="text-xs text-zinc-500 italic">{outcome.mapping_note}</p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {modalOpen && (
        <InlineEditModal
          title="Add Business Outcome"
          fields={OUTCOME_FIELDS}
          initialValues={{}}
          onSave={handleSave}
          onClose={() => setModalOpen(false)}
        />
      )}
    </section>
  )
}

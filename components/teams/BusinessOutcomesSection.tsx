'use client'

import type { BusinessOutcome } from '@/lib/queries'
import { WarnBanner } from './WarnBanner'
import { TeamMetadataEditModal } from './TeamMetadataEditModal'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

// Track emoji mapping
function trackEmoji(track: string) {
  if (track === 'ADR') return '⚡'
  if (track === 'Biggy') return '🤖'
  if (track === 'Both') return '🔄'
  return '📊'
}

// Left border color for cards (4px)
function leftBorderColor(track: string) {
  if (track === 'ADR') return '#1e40af'
  if (track === 'Biggy') return '#6d28d9'
  if (track === 'Both') return '#6d28d9'
  return '#6b7280'
}

// Track badge colors
function trackBadgeStyle(track: string) {
  if (track === 'ADR') return { bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe' }
  if (track === 'Biggy') return { bg: '#f5f3ff', text: '#6d28d9', border: '#ddd6fe' }
  return { bg: '#f3f4f6', text: '#374151', border: '#d1d5db' }
}

function statusBadge(status: string) {
  switch (status) {
    case 'live':
      return { bg: '#dcfce7', text: '#14532d', label: 'Live' }
    case 'in_progress':
      return { bg: '#fef3c7', text: '#92400e', label: 'In Progress' }
    case 'pilot':
      return { bg: '#fef3c7', text: '#92400e', label: 'Pilot' }
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
  const router = useRouter()
  const [modalOpen, setModalOpen] = useState(false)

  async function handleDelete(outcomeId: number) {
    const prev = outcomes
    onUpdate(outcomes.filter(o => o.id !== outcomeId)) // optimistic removal
    try {
      const res = await fetch(`/api/projects/${projectId}/business-outcomes/${outcomeId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Delete failed')
      router.refresh()
    } catch (err) {
      console.error('Failed to delete outcome:', err)
      onUpdate(prev) // rollback on error
    }
  }

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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {outcomes.map((outcome) => {
            const leftBorder = leftBorderColor(outcome.track ?? 'ADR')
            const emoji = trackEmoji(outcome.track ?? 'ADR')
            const pill = statusBadge(outcome.delivery_status ?? 'planned')
            const tracksArr = outcome.track === 'Both' ? ['ADR', 'Biggy'] : [outcome.track ?? 'ADR']
            return (
              <div
                key={outcome.id}
                className="rounded-xl border border-zinc-200 bg-white p-4 flex flex-col gap-3"
                style={{ borderLeftWidth: '4px', borderLeftColor: leftBorder }}
              >
                {/* emoji circle + title + delete button */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full border border-zinc-200 flex-shrink-0 flex items-center justify-center text-lg">
                    {emoji}
                  </div>
                  <p className="font-bold text-zinc-900 text-sm leading-tight flex-1">{outcome.title}</p>
                  <button
                    onClick={() => handleDelete(outcome.id)}
                    className="text-zinc-400 hover:text-red-500 transition-colors flex-shrink-0"
                    title="Delete outcome"
                    aria-label="Delete outcome"
                  >
                    ✕
                  </button>
                </div>

                {/* track badges */}
                <div className="flex gap-1 flex-wrap">
                  {tracksArr.map((t) => {
                    const s = trackBadgeStyle(t)
                    return (
                      <span
                        key={t}
                        className="rounded-full px-2 py-0.5 text-xs font-semibold border"
                        style={{ background: s.bg, color: s.text, borderColor: s.border }}
                      >
                        {t}
                      </span>
                    )
                  })}
                </div>

                {/* description */}
                {outcome.description && (
                  <p className="text-sm text-zinc-600">{outcome.description}</p>
                )}

                {/* divider + status/mapping row */}
                <div className="flex items-center justify-between gap-2 pt-3 border-t border-zinc-100 mt-auto">
                  <span
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                    style={{ background: pill.bg, color: pill.text }}
                  >
                    <span>◑</span> {pill.label}
                  </span>
                  {outcome.mapping_note && (
                    <span className="text-xs text-zinc-400 italic text-right">{outcome.mapping_note}</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {modalOpen && (
        <TeamMetadataEditModal
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

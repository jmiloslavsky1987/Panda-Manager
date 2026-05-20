'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { isEvidenceFresh } from '@/lib/evidence-freshness'
import { SourceBadge } from '@/components/SourceBadge'
import { Icon } from '@/components/Icon'
import type { BusinessOutcome } from '@/lib/queries'
import type { EvidenceLog } from '@/db/schema'

// Status pill: 5-value achievement_status enum (Phase 88.1)
const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  not_started:        { label: 'Not Started',        className: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300' },
  in_progress:        { label: 'In Progress',        className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
  partially_achieved: { label: 'Partially Achieved', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
  achieved:           { label: 'Achieved',           className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' },
  blocked:            { label: 'Blocked',            className: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
}

// Track badge colors
function trackBadgeClass(track: string) {
  if (track === 'ADR') return 'bg-blue-50 text-blue-700 border-blue-200'
  if (track === 'Biggy') return 'bg-purple-50 text-purple-700 border-purple-200'
  return 'bg-zinc-100 text-zinc-700 border-zinc-200'
}

// Evidence dot: filled (●) if fresh, hollow (○) if stale/absent
function EvidenceDot({ entries }: { entries: Pick<EvidenceLog, 'date'>[] }) {
  const fresh = isEvidenceFresh(entries)
  return (
    <span
      data-testid="evidence-dot"
      title={fresh ? 'Recent evidence (< 30 days)' : 'No recent evidence'}
      aria-label={fresh ? 'Recent evidence' : 'No recent evidence'}
      className={`inline-block h-2.5 w-2.5 rounded-full flex-shrink-0 ${
        fresh
          ? 'bg-emerald-500'
          : 'border-2 border-zinc-300 bg-transparent dark:border-zinc-600'
      }`}
    />
  )
}

interface Props {
  projectId: number
  outcomes: BusinessOutcome[]
  evidenceLog?: EvidenceLog[]
  onUpdate?: (outcomes: BusinessOutcome[]) => void
}

export function BusinessOutcomesSection({ projectId, outcomes, evidenceLog = [], onUpdate }: Props) {
  const router = useRouter()
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [addingEvidence, setAddingEvidence] = useState<number | null>(null)
  const [evidenceText, setEvidenceText] = useState('')
  const [evidenceDate, setEvidenceDate] = useState(new Date().toISOString().slice(0, 10))

  // Group evidence by outcome id
  const evidenceByOutcome = outcomes.reduce<Record<number, EvidenceLog[]>>((acc, o) => {
    acc[o.id] = evidenceLog.filter((e) => e.business_outcome_id === o.id)
    return acc
  }, {})

  async function handleDeleteOutcome(outcomeId: number) {
    if (!onUpdate) return
    const prev = outcomes
    onUpdate(outcomes.filter((o) => o.id !== outcomeId))
    try {
      const res = await fetch(`/api/projects/${projectId}/business-outcomes/${outcomeId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Delete failed')
      router.refresh()
    } catch (err) {
      console.error('Failed to delete outcome:', err)
      onUpdate(prev)
    }
  }

  async function handleAddOutcome() {
    // Preserve existing modal pattern — open a lightweight inline form or route to modal
    // Plan 03 will wire the full add-outcome flow via TeamMetadataEditModal
    // For now, trigger a refresh to pick up any newly added outcomes
    router.refresh()
  }

  async function handleAddEvidence(outcomeId: number) {
    if (!evidenceText.trim()) return
    try {
      await fetch(`/api/projects/${projectId}/evidence-log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_outcome_id: outcomeId,
          date: evidenceDate,
          source: 'manual',
          text: evidenceText.trim(),
        }),
      })
      setEvidenceText('')
      setAddingEvidence(null)
      router.refresh()
    } catch (err) {
      console.error('Failed to add evidence:', err)
    }
  }

  async function handleStatusChange(outcomeId: number, newStatus: string) {
    try {
      await fetch(`/api/projects/${projectId}/business-outcomes/${outcomeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ achievement_status: newStatus }),
      })
      router.refresh()
    } catch (err) {
      console.error('Failed to update status:', err)
    }
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">Business Value &amp; Expected Outcomes</h2>
        <button
          type="button"
          onClick={handleAddOutcome}
          className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Icon name="add" size={16} aria-hidden />
          Add Outcome
        </button>
      </div>

      {outcomes.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No business outcomes recorded — add outcomes to populate this section.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border bg-card" role="list">
          {outcomes.map((outcome) => {
            const isOpen = expandedId === outcome.id
            const status = STATUS_CONFIG[outcome.achievement_status ?? 'not_started'] ?? STATUS_CONFIG.not_started
            const entries = evidenceByOutcome[outcome.id] ?? []
            const track = outcome.track ?? 'ADR'

            return (
              <li key={outcome.id} className="text-sm">
                {/* Collapsed row — ~56px tall (h-14) */}
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setExpandedId(isOpen ? null : outcome.id)}
                  className="flex w-full items-center gap-3 px-3 h-14 text-left hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-inset focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {/* Track badge */}
                  <span
                    className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide flex-shrink-0 ${trackBadgeClass(track)}`}
                  >
                    {track}
                  </span>

                  {/* Title */}
                  <span className="flex-1 truncate font-medium text-foreground">{outcome.title}</span>

                  {/* Target metric / mapping note */}
                  {outcome.mapping_note && (
                    <span className="font-mono text-xs text-muted-foreground hidden sm:block">
                      {outcome.mapping_note}
                    </span>
                  )}

                  {/* Achievement status pill */}
                  <span
                    className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium flex-shrink-0 ${status.className}`}
                  >
                    {status.label}
                  </span>

                  {/* Evidence dot */}
                  <EvidenceDot entries={entries} />

                  {/* Expand indicator */}
                  <Icon
                    name={isOpen ? 'expand_less' : 'expand_more'}
                    size={18}
                    className="text-muted-foreground flex-shrink-0"
                    aria-hidden
                  />
                </button>

                {/* Expanded panel */}
                {isOpen && (
                  <div className="px-4 pb-4 pt-2 space-y-4 bg-muted/10 border-t border-border">
                    {/* Description */}
                    {outcome.description && (
                      <p className="text-sm text-foreground/80 leading-relaxed">{outcome.description}</p>
                    )}

                    {/* Status selector */}
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">
                        Achievement Status
                      </label>
                      <select
                        value={outcome.achievement_status ?? 'not_started'}
                        onChange={(e) => handleStatusChange(outcome.id, e.target.value)}
                        className="block w-full max-w-xs rounded-md border border-border bg-background px-2 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {Object.entries(STATUS_CONFIG).map(([value, cfg]) => (
                          <option key={value} value={value}>{cfg.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Target Metric */}
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">
                        Target Metric
                      </label>
                      <input
                        type="text"
                        defaultValue={outcome.mapping_note ?? ''}
                        className="block w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        placeholder="e.g. Reduce MTTR by 30%"
                      />
                    </div>

                    {/* Evidence Log */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          Evidence Log
                        </h3>
                        <button
                          type="button"
                          onClick={() => setAddingEvidence(addingEvidence === outcome.id ? null : outcome.id)}
                          className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400"
                        >
                          <Icon name="add" size={14} aria-hidden />
                          Add Evidence
                        </button>
                      </div>

                      {addingEvidence === outcome.id && (
                        <div className="mb-3 space-y-2 rounded-md border border-border bg-background p-3">
                          <div className="flex gap-2">
                            <input
                              type="date"
                              value={evidenceDate}
                              onChange={(e) => setEvidenceDate(e.target.value)}
                              className="rounded border border-border bg-background px-2 py-1 text-xs font-mono focus-visible:outline-none"
                            />
                          </div>
                          <textarea
                            value={evidenceText}
                            onChange={(e) => setEvidenceText(e.target.value)}
                            placeholder="Describe the evidence..."
                            rows={2}
                            className="block w-full rounded border border-border bg-background px-2 py-1.5 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleAddEvidence(outcome.id)}
                              className="rounded-md bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-700"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setAddingEvidence(null)}
                              className="rounded-md border border-border px-3 py-1 text-xs font-medium hover:bg-muted"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {entries.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No evidence recorded yet.</p>
                      ) : (
                        <ul className="space-y-2">
                          {entries.slice().sort((a, b) => b.date.localeCompare(a.date)).map((e) => (
                            <li key={e.id} className="flex items-start gap-2 text-xs">
                              <span className="font-mono text-muted-foreground mt-0.5 flex-shrink-0">{e.date}</span>
                              <SourceBadge source={e.source} />
                              <span className="flex-1 text-foreground/80 leading-relaxed">{e.text}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {/* Phase indicator */}
                    {outcome.track && (
                      <div className="text-xs text-muted-foreground">
                        <span className="font-medium">Track: </span>
                        <span>{outcome.track}</span>
                      </div>
                    )}

                    {/* Delete outcome */}
                    {onUpdate && (
                      <button
                        type="button"
                        onClick={() => handleDeleteOutcome(outcome.id)}
                        className="text-xs text-red-500 hover:text-red-700 mt-2"
                      >
                        Delete Outcome
                      </button>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

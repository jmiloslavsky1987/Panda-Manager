// intentional: Decisions are append-only — no bulk actions or status lifecycle

'use client'

import { useMemo, useCallback, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { KeyDecision, Artifact } from '@/lib/queries'
import { SourceBadge } from '@/components/SourceBadge'
import { AddDecisionModal } from '@/components/AddDecisionModal'
import { EmptyState } from '@/components/EmptyState'

interface DecisionsTableClientProps {
  decisions: KeyDecision[]
  projectId: number
  artifacts?: Artifact[]
}

export default function DecisionsTableClient({ decisions, projectId, artifacts = [] }: DecisionsTableClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [addModalOpen, setAddModalOpen] = useState(false)

  const q = searchParams.get('q') ?? ''
  const fromDate = searchParams.get('from') ?? ''
  const toDate = searchParams.get('to') ?? ''

  const updateParam = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    router.push(`?${params.toString()}`, { scroll: false })
  }, [router, searchParams])

  const filtered = useMemo(() => {
    let result = decisions

    // Text filter on decision and context fields
    if (q) {
      const lowerQ = q.toLowerCase()
      result = result.filter(d =>
        d.decision.toLowerCase().includes(lowerQ) ||
        d.context?.toLowerCase().includes(lowerQ)
      )
    }

    // Date range filters (use date field if present, otherwise created_at)
    if (fromDate) {
      result = result.filter(d => {
        const date = d.date ?? new Date(d.created_at).toISOString().split('T')[0]
        return date >= fromDate
      })
    }

    if (toDate) {
      result = result.filter(d => {
        const date = d.date ?? new Date(d.created_at).toISOString().split('T')[0]
        return date <= toDate
      })
    }

    // Sort by created_at descending (newest first)
    return result.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  }, [decisions, q, fromDate, toDate])

  // Create artifact map for SourceBadge
  const artifactMap = useMemo(() => {
    return new Map(artifacts.map((a) => [a.id, a.name]))
  }, [artifacts])

  // Show empty state when no decisions exist
  if (decisions.length === 0) {
    return (
      <>
        <EmptyState
          title="No decisions logged"
          description="Decisions record key choices and their rationale. Log the first decision to build your record."
          action={{
            label: 'Log a Decision',
            onClick: () => setAddModalOpen(true),
          }}
        />
        <AddDecisionModal
          projectId={projectId}
          open={addModalOpen}
          onOpenChange={setAddModalOpen}
        />
      </>
    )
  }

  return (
    <div data-testid="decisions-tab" className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-zinc-900">Key Decisions</h2>
        <AddDecisionModal projectId={projectId} open={addModalOpen} onOpenChange={setAddModalOpen} />
      </div>

      {/* Filter controls */}
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="Search decisions..."
          value={q}
          onChange={(e) => updateParam('q', e.target.value)}
          className="flex-1 px-3 py-2 border border-zinc-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
        />
        <input
          type="date"
          placeholder="From"
          value={fromDate}
          onChange={(e) => updateParam('from', e.target.value)}
          className="px-3 py-2 border border-zinc-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
        />
        <input
          type="date"
          placeholder="To"
          value={toDate}
          onChange={(e) => updateParam('to', e.target.value)}
          className="px-3 py-2 border border-zinc-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
        />
      </div>

      {/* Count display */}
      <p className="text-sm text-zinc-500 mb-2">
        {filtered.length} decision{filtered.length !== 1 ? 's' : ''}
      </p>

      {/* Decisions list */}
      {/* intentional: Decisions are immutable append-only records — no edit modal */}
      {filtered.length === 0 ? (
        <div className="text-center py-8 text-sm text-zinc-500 border rounded-md bg-zinc-50">
          No decisions match your filters.
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((decision) => (
            <div
              key={decision.id}
              className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm space-y-2"
            >
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs text-zinc-500">
                  {decision.date ?? new Date(decision.created_at).toLocaleDateString()}
                </span>
                <SourceBadge
                  source={decision.source}
                  artifactName={decision.source_artifact_id ? (artifactMap.get(decision.source_artifact_id) ?? null) : null}
                  discoverySource={decision.discovery_source}
                />
              </div>

              <p className="text-sm text-zinc-900">{decision.decision}</p>

              {decision.context && (
                <details className="text-sm">
                  <summary className="cursor-pointer text-zinc-500 hover:text-zinc-700 select-none">
                    Show context
                  </summary>
                  <p className="mt-2 text-zinc-700 whitespace-pre-wrap">{decision.context}</p>
                </details>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

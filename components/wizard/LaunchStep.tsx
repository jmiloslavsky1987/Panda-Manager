'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import type { ReviewItem } from '@/components/IngestionModal'
import type { ManualItem } from '@/components/ProjectWizard'
import { ENTITY_TABS } from './ManualEntryStep'

// ─── Props ────────────────────────────────────────────────────────────────────

interface LaunchStepProps {
  projectId: number
  approvedItems: ReviewItem[]
  manualItems: ManualItem[]
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LaunchStep({ projectId, approvedItems, manualItems }: LaunchStepProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ── Summary: count by entity type ────────────────────────────────────────

  const allItems = [...approvedItems, ...manualItems.map(m => ({
    entityType: m.entityType,
    fields: m.fields,
    approved: true,
    edited: false,
    confidence: 1,
    sourceExcerpt: '',
  } as ReviewItem))]

  const summaryCounts: Array<{ label: string; count: number }> = ENTITY_TABS.map(tab => ({
    label: tab.label,
    count: allItems.filter(i => i.entityType === tab.type).length,
  })).filter(entry => entry.count > 0)

  const totalItems = allItems.length

  // ── Launch: PATCH status to active then navigate ──────────────────────────

  async function handleLaunch() {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      })
      const data = await res.json() as { ok?: boolean; error?: string }
      if (!res.ok) throw new Error(data.error ?? `Launch failed (${res.status})`)

      router.push(`/customer/${projectId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Launch failed')
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-full py-12 gap-8">
      <div className="max-w-md w-full space-y-6">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-xl font-semibold text-zinc-900 mb-2">Ready to Launch</h2>
          <p className="text-sm text-zinc-500">
            Review the summary below and launch your project.
          </p>
        </div>

        {/* Summary card */}
        <div className="border rounded-lg overflow-hidden bg-white">
          <div className="px-4 py-3 bg-zinc-50 border-b">
            <p className="text-sm font-medium text-zinc-700">
              Project Data Summary
              <span className="ml-2 text-zinc-400 font-normal">
                ({totalItems} item{totalItems !== 1 ? 's' : ''} total)
              </span>
            </p>
          </div>

          {summaryCounts.length > 0 ? (
            <div className="divide-y divide-zinc-100">
              {summaryCounts.map(({ label, count }) => (
                <div key={label} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-sm text-zinc-700">{label}</span>
                  <span className="text-sm font-medium text-zinc-900">{count}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-4 py-6 text-center text-zinc-400 text-sm">
              No data added yet — you can enrich this project from the workspace tabs after launch.
            </div>
          )}
        </div>

        {/* Completeness note */}
        <p className="text-xs text-zinc-400 text-center">
          Project Completeness will be calculated after launch.
        </p>

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Launch button */}
        <div className="flex justify-center">
          <Button
            size="lg"
            onClick={handleLaunch}
            disabled={loading}
            className="min-w-[160px]"
          >
            {loading ? 'Launching…' : 'Launch Project'}
          </Button>
        </div>
      </div>
    </div>
  )
}

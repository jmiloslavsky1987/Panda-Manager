'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/EmptyState'

// Minimal type matching what getWorkspaceData() returns for workstreams
interface WorkstreamRow {
  id: number
  name: string
  track: string | null
  lead: string | null
  state: string | null
  percent_complete: number | null
  last_updated: string | null
}

interface WorkstreamTableClientProps {
  streams: WorkstreamRow[]
}

// intentional: Workstreams use progress-slider UX — bulk status updates not applicable
// intentional: WorkstreamTableClient has no filter bar — workstream counts remain small (<10 per project); add track/lead/progress-range filters if row counts grow

export function WorkstreamTableClient({ streams }: WorkstreamTableClientProps) {
  const router = useRouter()
  const [pendingPct, setPendingPct] = useState<Record<number, number>>({})
  const [dirtyIds, setDirtyIds] = useState<Set<number>>(new Set())
  const [savingIds, setSavingIds] = useState<Set<number>>(new Set())
  const [errors, setErrors] = useState<Record<number, string>>({})

  function handleSliderChange(id: number, value: number, originalPct: number | null) {
    setPendingPct(prev => ({ ...prev, [id]: value }))
    const isDirty = value !== (originalPct ?? 0)
    setDirtyIds(prev => {
      const next = new Set(prev)
      isDirty ? next.add(id) : next.delete(id)
      return next
    })
  }

  async function handleSave(ws: WorkstreamRow) {
    const pct = pendingPct[ws.id] ?? (ws.percent_complete ?? 0)
    setSavingIds(prev => new Set(prev).add(ws.id))
    setErrors(prev => { const n = { ...prev }; delete n[ws.id]; return n })

    const res = await fetch(`/api/workstreams/${ws.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ percent_complete: pct }),
    })
    const data = await res.json()

    setSavingIds(prev => { const n = new Set(prev); n.delete(ws.id); return n })
    if (!res.ok) {
      setErrors(prev => ({ ...prev, [ws.id]: data.error ?? 'Save failed' }))
      return
    }
    setDirtyIds(prev => { const n = new Set(prev); n.delete(ws.id); return n })
    router.refresh()
  }

  if (streams.length === 0) {
    return (
      <EmptyState
        title="No workstreams yet"
        description="Workstreams organize delivery tracks. Add the first workstream to get started."
        action={{ label: 'Add Workstream', onClick: () => {} }}
      />
    )
  }

  return (
    <table className="w-full text-sm border-collapse" data-testid="workstream-table">
      <thead>
        <tr className="border-b text-left text-zinc-500">
          <th className="py-2 pr-4 font-medium">Workstream</th>
          <th className="py-2 pr-4 font-medium">Lead</th>
          <th className="py-2 pr-4 font-medium">State</th>
          <th className="py-2 pr-4 font-medium">Last Updated</th>
          <th className="py-2 pr-4 font-medium">Progress</th>
          <th className="py-2 font-medium"></th>
        </tr>
      </thead>
      <tbody>
        {streams.map(ws => {
          const currentPct = pendingPct[ws.id] ?? (ws.percent_complete ?? 0)
          const isDirty = dirtyIds.has(ws.id)
          const isSaving = savingIds.has(ws.id)
          const err = errors[ws.id]
          return (
            <tr key={ws.id} className="border-b">
              <td className="py-2 pr-4">{ws.name}</td>
              <td className="py-2 pr-4">{ws.lead ?? '—'}</td>
              <td className="py-2 pr-4">{ws.state ?? '—'}</td>
              <td className="py-2 pr-4">{ws.last_updated ?? '—'}</td>
              <td className="py-2 pr-4">
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={currentPct}
                    onChange={e => handleSliderChange(ws.id, parseInt(e.target.value, 10), ws.percent_complete)}
                    className="w-24"
                    data-testid={`slider-${ws.id}`}
                  />
                  <span className="text-xs text-zinc-600 tabular-nums w-8">{currentPct}%</span>
                </div>
                {err && <p className="text-red-600 text-xs mt-1">{err}</p>}
              </td>
              <td className="py-2">
                {isDirty && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isSaving}
                    onClick={() => handleSave(ws)}
                    data-testid={`save-progress-${ws.id}`}
                  >
                    {isSaving ? 'Saving…' : 'Save'}
                  </Button>
                )}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

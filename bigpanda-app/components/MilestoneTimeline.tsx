'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface MilestoneTimelineProps {
  projectId: number
}

interface Milestone {
  id: number
  name: string
  date: string | null
  target: string | null
  status: string | null
}

// ─── Status Colors ─────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  completed: '#22c55e',    // green-500
  complete: '#22c55e',     // green-500
  in_progress: '#3b82f6',  // blue-500
  upcoming: '#a1a1aa',     // zinc-400
  not_started: '#a1a1aa',  // zinc-400
  blocked: '#ef4444',      // red-500
}

function getStatusColor(status: string | null): string {
  if (!status) return '#a1a1aa'
  const key = status.toLowerCase().replace(/\s+/g, '_')
  return STATUS_COLORS[key] ?? '#a1a1aa'
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function MilestoneTimeline({ projectId }: MilestoneTimelineProps) {
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    async function fetchMilestones() {
      try {
        const res = await fetch(`/api/projects/${projectId}/milestones`)
        if (!res.ok) {
          setError(true)
          setLoading(false)
          return
        }
        const data = await res.json()
        const fetchedMilestones: Milestone[] = data.milestones ?? data ?? []
        setMilestones(fetchedMilestones)
      } catch (err) {
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    fetchMilestones()
  }, [projectId])

  // ─── Loading state ───────────────────────────────────────────────────────────

  if (loading) {
    return <div className="h-48 bg-zinc-100 rounded-lg animate-pulse" />
  }

  // ─── Error state ─────────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-sm text-red-600">Failed to load milestones.</p>
      </div>
    )
  }

  // ─── Empty state ─────────────────────────────────────────────────────────────

  if (milestones.length === 0) {
    return (
      <div className="px-4 py-6 text-center">
        <p className="text-sm text-zinc-400">No milestones recorded.</p>
      </div>
    )
  }

  // ─── Transform data for chart ────────────────────────────────────────────────

  const chartData = milestones.map((m) => ({
    id: m.id,
    name: m.name.length > 12 ? m.name.substring(0, 12) + '…' : m.name,
    fullName: m.name,
    value: 1, // Fixed height for all bars
    status: m.status,
    date: m.date,
    target: m.target,
    color: getStatusColor(m.status),
  }))

  // ─── Custom tooltip ──────────────────────────────────────────────────────────

  function CustomTooltip({ active, payload }: any) {
    if (!active || !payload || !payload[0]) return null
    const data = payload[0].payload
    return (
      <div className="bg-white px-3 py-2 border border-zinc-300 rounded shadow-lg text-xs">
        <p className="font-semibold text-zinc-800">{data.fullName}</p>
        {(data.target || data.date) && (
          <p className="text-zinc-600">{data.target || data.date}</p>
        )}
        <p className="text-zinc-500 capitalize">{data.status ?? 'unknown'}</p>
      </div>
    )
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <section data-testid="milestone-timeline" className="px-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide">
          Milestone Timeline
        </h2>
        <Link
          href={`/customer/${projectId}/milestones`}
          className="text-xs text-blue-600 hover:underline"
        >
          View all →
        </Link>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} margin={{ top: 20, right: 10, left: 10, bottom: 40 }}>
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: '#52525b' }}
            angle={-45}
            textAnchor="end"
            interval={0}
            height={80}
          />
          <YAxis hide domain={[0, 1]} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {chartData.map((entry) => (
              <Cell key={entry.id} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </section>
  )
}

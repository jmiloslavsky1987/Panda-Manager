'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Clock, AlertTriangle, RefreshCw, CheckCircle } from 'lucide-react'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ExceptionsPanelProps {
  projectId: number
}

type ExceptionRecord = {
  type: 'overdue_task' | 'at_risk_milestone' | 'stale_item'
  id: number
  name: string
  reason: string
  link: string
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function ExceptionsPanel({ projectId }: ExceptionsPanelProps) {
  const [data, setData] = useState<ExceptionRecord[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  // Shared fetch function for initial load and invalidation
  const fetchExceptions = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/exceptions`)
      if (!res.ok) {
        setError(true)
        setLoading(false)
        return
      }
      const exceptions = await res.json()
      setData(exceptions)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  // Initial fetch on mount
  useEffect(() => {
    fetchExceptions()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  // Listen for metrics:invalidate events (same invalidation bus as HealthDashboard)
  useEffect(() => {
    const handleInvalidate = () => { fetchExceptions() }
    window.addEventListener('metrics:invalidate', handleInvalidate)
    return () => { window.removeEventListener('metrics:invalidate', handleInvalidate) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  // ─── Loading state ───────────────────────────────────────────────────────────

  if (loading) {
    return (
      <section className="px-4 mt-4">
        <div className="h-4 w-28 bg-zinc-100 rounded animate-pulse mb-3" />
        <div className="bg-white border border-zinc-200 rounded-lg p-4 space-y-2">
          <div className="h-3.5 w-full bg-zinc-100 rounded animate-pulse" />
          <div className="h-3.5 w-4/5 bg-zinc-100 rounded animate-pulse" />
          <div className="h-3.5 w-3/5 bg-zinc-100 rounded animate-pulse" />
        </div>
      </section>
    )
  }

  // ─── Error state ─────────────────────────────────────────────────────────────

  if (error || data === null) {
    return (
      <section className="px-4 mt-4">
        <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide mb-3">Exceptions</h2>
        <div className="bg-white border border-zinc-200 rounded-lg p-4">
          <p className="text-sm text-red-500">Failed to load exceptions.</p>
        </div>
      </section>
    )
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  const visibleItems = data.slice(0, 10)
  const overflowCount = data.length - visibleItems.length

  return (
    <section className="px-4 mt-4">
      <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide mb-3">Exceptions</h2>

      <div className="bg-white border border-zinc-200 rounded-lg p-4 space-y-2">

        {/* Empty state */}
        {data.length === 0 && (
          <div className="flex items-center gap-2 py-1.5">
            <CheckCircle className="w-3.5 h-3.5 shrink-0 text-green-500" />
            <span className="text-sm text-zinc-500">No issues detected</span>
          </div>
        )}

        {/* Exception entries */}
        {visibleItems.map((record) => {
          let icon: React.ReactNode
          if (record.type === 'overdue_task') {
            icon = <Clock className="w-3.5 h-3.5 shrink-0 text-red-500" />
          } else if (record.type === 'at_risk_milestone') {
            icon = <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-500" />
          } else {
            icon = <RefreshCw className="w-3.5 h-3.5 shrink-0 text-zinc-400" />
          }

          return (
            <Link
              key={`${record.type}-${record.id}`}
              href={record.link}
              className="flex items-center gap-2 py-1.5 hover:bg-zinc-50 rounded px-1 -mx-1 group"
            >
              {icon}
              <span className="flex-1 text-xs text-zinc-700 truncate group-hover:text-zinc-900">
                {record.name}
              </span>
              <span className="text-xs text-zinc-400 shrink-0">{record.reason}</span>
            </Link>
          )
        })}

        {/* Overflow indicator */}
        {overflowCount > 0 && (
          <p className="text-xs text-zinc-400 pt-1">
            +{overflowCount} more issue{overflowCount !== 1 ? 's' : ''}
          </p>
        )}

      </div>
    </section>
  )
}

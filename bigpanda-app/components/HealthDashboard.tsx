'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface HealthDashboardProps {
  projectId: number
}

interface OverviewMetricsData {
  stepCounts: { track: string; status: string; count: number }[]
  riskCounts: { severity: string; count: number }[]
  integrationCounts: { status: string; count: number }[]
  milestoneOnTrack: { status: string; count: number }[]
  weeklyRollup: { weekLabel: string; hours: number; variance: number | null }[]
  weeklyTarget: number | null
  totalHoursThisWeek: number
  blockedTasks: { id: number; title: string }[]
}

// ─── Health Formula (exported for testing) ────────────────────────────────────

export function computeOverallHealth(metrics: {
  openCriticalRisks: number
  openHighRisks: number
  adrCompletion: number
  biggyCompletion: number
}): 'red' | 'yellow' | 'green' {
  // Priority 1: Any critical risk → red (trumps all)
  if (metrics.openCriticalRisks > 0) return 'red'
  // Priority 2: High risk OR low completion → yellow
  if (metrics.openHighRisks > 0 || metrics.adrCompletion < 50 || metrics.biggyCompletion < 50) return 'yellow'
  // Otherwise: green
  return 'green'
}

// ─── Per-track Health Formula ─────────────────────────────────────────────────

function computeTrackHealth(
  stepCounts: { track: string; status: string; count: number }[],
  track: 'ADR' | 'Biggy',
  openCriticalRisks: number
): 'red' | 'yellow' | 'green' {
  const trackSteps = stepCounts.filter(s => s.track.toLowerCase() === track.toLowerCase())
  const total = trackSteps.reduce((sum, s) => sum + s.count, 0)
  if (total === 0) return 'green'
  const blocked = trackSteps.find(s => s.status === 'blocked')?.count ?? 0
  const blockedRatio = blocked / total
  if (blockedRatio >= 0.5 || openCriticalRisks > 0) return 'red'
  if (blockedRatio > 0) return 'yellow'
  return 'green'
}

// ─── RAG Badge Configuration ──────────────────────────────────────────────────

const ragConfig = {
  green: { label: 'Healthy', className: 'inline-flex px-2 py-0.5 text-xs rounded-full border bg-green-100 text-green-800 border-green-200' },
  yellow: { label: 'At Risk', className: 'inline-flex px-2 py-0.5 text-xs rounded-full border bg-yellow-100 text-yellow-800 border-yellow-200' },
  red: { label: 'Critical', className: 'inline-flex px-2 py-0.5 text-xs rounded-full border bg-red-100 text-red-800 border-red-200' },
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function HealthDashboard({ projectId }: HealthDashboardProps) {
  const [data, setData] = useState<OverviewMetricsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  // Shared fetchMetrics function for initial load and invalidation
  const fetchMetrics = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/overview-metrics`)
      if (!res.ok) {
        setError(true)
        setLoading(false)
        return
      }
      const metrics = await res.json()
      setData(metrics)
    } catch (err) {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  // Initial fetch on mount
  useEffect(() => {
    fetchMetrics()
  }, [projectId])

  // Listen for metrics:invalidate events
  useEffect(() => {
    const handleInvalidate = () => { fetchMetrics() }
    window.addEventListener('metrics:invalidate', handleInvalidate)
    return () => { window.removeEventListener('metrics:invalidate', handleInvalidate) }
  }, [projectId])

  // ─── Loading state ───────────────────────────────────────────────────────────

  if (loading) {
    return (
      <section data-testid="health-dashboard" className="px-4 space-y-4">
        <div className="h-24 bg-zinc-100 rounded-lg animate-pulse" />
      </section>
    )
  }

  // ─── Error state ─────────────────────────────────────────────────────────────

  if (error || !data) {
    return (
      <section data-testid="health-dashboard" className="px-4 space-y-4">
        <p className="text-sm text-red-500">Failed to load health data.</p>
      </section>
    )
  }

  // ─── Calculate metrics ───────────────────────────────────────────────────────

  // Track completion percentages
  const adrSteps = data.stepCounts.filter(s => s.track.toLowerCase() === 'adr')
  const biggySteps = data.stepCounts.filter(s => s.track.toLowerCase() === 'biggy')

  const adrComplete = adrSteps.filter(s => s.status === 'complete').reduce((sum, s) => sum + s.count, 0)
  const adrTotal = adrSteps.reduce((sum, s) => sum + s.count, 0)
  const adrCompletion = adrTotal > 0 ? (adrComplete / adrTotal) * 100 : 0

  const biggyComplete = biggySteps.filter(s => s.status === 'complete').reduce((sum, s) => sum + s.count, 0)
  const biggyTotal = biggySteps.reduce((sum, s) => sum + s.count, 0)
  const biggyCompletion = biggyTotal > 0 ? (biggyComplete / biggyTotal) * 100 : 0

  // Risk counts
  const criticalRisks = data.riskCounts.find(r => r.severity.toLowerCase() === 'critical')?.count ?? 0
  const highRisks = data.riskCounts.find(r => r.severity.toLowerCase() === 'high')?.count ?? 0

  // Overall health
  const overallHealth = computeOverallHealth({
    openCriticalRisks: criticalRisks,
    openHighRisks: highRisks,
    adrCompletion,
    biggyCompletion,
  })

  // Per-track health
  const adrHealth = computeTrackHealth(data.stepCounts, 'ADR', criticalRisks)
  const biggyHealth = computeTrackHealth(data.stepCounts, 'Biggy', criticalRisks)

  // Active blockers (sum of blocked steps across all tracks)
  const activeBlockers = data.stepCounts
    .filter(s => s.status === 'blocked')
    .reduce((sum, s) => sum + s.count, 0)

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <section data-testid="health-dashboard" className="px-4 space-y-4">
      <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide">Health Dashboard</h2>

      <div className="bg-white border border-zinc-200 rounded-lg p-4 space-y-4">
        {/* Overall Health */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-zinc-600">Overall Health:</span>
          <span data-testid="overall-health-badge" className={ragConfig[overallHealth].className}>
            {ragConfig[overallHealth].label}
          </span>
        </div>

        {/* Per-track Health */}
        <div className="flex items-center gap-4">
          <span data-testid="adr-health-badge" className={ragConfig[adrHealth].className}>
            ADR: {ragConfig[adrHealth].label}
          </span>
          <span data-testid="biggy-health-badge" className={ragConfig[biggyHealth].className}>
            Biggy: {ragConfig[biggyHealth].label}
          </span>
        </div>

        {/* Active Blockers */}
        <div>
          <p className="text-sm font-medium text-zinc-600 mb-2">Active Blockers</p>
          {(data.blockedTasks ?? []).length === 0 ? (
            <p className="text-sm text-zinc-400">No blocked tasks</p>
          ) : (
            <ul className="space-y-1">
              {(data.blockedTasks ?? []).slice(0, 5).map(task => (
                <li key={task.id}>
                  <Link
                    href={`/customer/${projectId}/plan/tasks`}
                    className="text-sm text-blue-600 hover:underline truncate block"
                  >
                    {task.title}
                  </Link>
                </li>
              ))}
              {(data.blockedTasks ?? []).length > 5 && (
                <li className="text-sm text-zinc-400">
                  and {(data.blockedTasks ?? []).length - 5} more
                </li>
              )}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}

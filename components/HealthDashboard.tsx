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
  overdueMilestones: number
}

// ─── Health Formula (exported for testing) ────────────────────────────────────

export function computeOverallHealth(metrics: {
  openCriticalRisks: number
  openHighRisks: number
  overdueMilestones: number
}): 'red' | 'yellow' | 'green' {
  // Priority 1: Any critical risk → red (trumps all)
  if (metrics.openCriticalRisks > 0) return 'red'
  // Priority 2: High risk OR overdue milestone → yellow
  if (metrics.openHighRisks > 0 || metrics.overdueMilestones > 0) return 'yellow'
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
  green: { label: 'Healthy', className: 'bg-green-100 text-green-800 border-green-200' },
  yellow: { label: 'At Risk', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  red: { label: 'Critical', className: 'bg-red-100 text-red-800 border-red-200' },
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
      <section data-testid="health-dashboard" className="px-4">
        <div className="h-4 w-36 bg-zinc-100 rounded animate-pulse mb-3" />
        <div className="bg-white border border-zinc-200 rounded-lg p-5 space-y-4">
          <div className="flex justify-center">
            <div className="h-10 w-48 bg-zinc-100 rounded-full animate-pulse" />
          </div>
          <div className="flex justify-center gap-2">
            <div className="h-6 w-32 bg-zinc-100 rounded-full animate-pulse" />
          </div>
          <div className="flex justify-center gap-4 pt-1 border-t border-zinc-100">
            <div className="h-5 w-24 bg-zinc-100 rounded-full animate-pulse" />
            <div className="h-5 w-24 bg-zinc-100 rounded-full animate-pulse" />
          </div>
        </div>
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

  // Risk counts
  const criticalRisks = data.riskCounts.find(r => r.severity.toLowerCase() === 'critical')?.count ?? 0
  const highRisks = data.riskCounts.find(r => r.severity.toLowerCase() === 'high')?.count ?? 0
  const overdueMilestones = data.overdueMilestones

  // Overall health
  const overallHealth = computeOverallHealth({
    openCriticalRisks: criticalRisks,
    openHighRisks: highRisks,
    overdueMilestones,
  })

  // Per-track health
  const adrHealth = computeTrackHealth(data.stepCounts, 'ADR', criticalRisks)
  const biggyHealth = computeTrackHealth(data.stepCounts, 'Biggy', criticalRisks)

  // ─── Verdict label with inline trigger ───────────────────────────────────────

  let verdictLabel = ragConfig[overallHealth].label
  if (criticalRisks > 0) {
    verdictLabel = `Critical — ${criticalRisks} critical risk${criticalRisks !== 1 ? 's' : ''}`
  } else if (overdueMilestones > 0 && highRisks > 0) {
    verdictLabel = `At Risk — ${overdueMilestones} overdue milestone${overdueMilestones !== 1 ? 's' : ''}, ${highRisks} high risk${highRisks !== 1 ? 's' : ''}`
  } else if (overdueMilestones > 0) {
    verdictLabel = `At Risk — ${overdueMilestones} overdue milestone${overdueMilestones !== 1 ? 's' : ''}`
  } else if (highRisks > 0) {
    verdictLabel = `At Risk — ${highRisks} high risk${highRisks !== 1 ? 's' : ''}`
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <section data-testid="health-dashboard" className="px-4">
      <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide mb-3">Health Dashboard</h2>

      <div className="bg-white border border-zinc-200 rounded-lg p-5 space-y-4">

        {/* Large verdict badge */}
        <div className="flex items-center justify-center py-2">
          <span
            data-testid="overall-health-badge"
            className={`inline-flex items-center px-5 py-2 text-base font-semibold rounded-full border ${ragConfig[overallHealth].className}`}
          >
            {verdictLabel}
          </span>
        </div>

        {/* Reason chips (only non-zero signals) */}
        <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
          {criticalRisks > 0 && (
            <Link href={`/customer/${projectId}/risks`}
              className="text-red-700 bg-red-50 border border-red-200 rounded-full px-3 py-0.5 hover:bg-red-100 transition-colors">
              {criticalRisks} critical risk{criticalRisks !== 1 ? 's' : ''}
            </Link>
          )}
          {highRisks > 0 && (
            <Link href={`/customer/${projectId}/risks`}
              className="text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-full px-3 py-0.5 hover:bg-yellow-100 transition-colors">
              {highRisks} high risk{highRisks !== 1 ? 's' : ''}
            </Link>
          )}
          {overdueMilestones > 0 && (
            <Link href={`/customer/${projectId}/milestones`}
              className="text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-full px-3 py-0.5 hover:bg-yellow-100 transition-colors">
              {overdueMilestones} overdue milestone{overdueMilestones !== 1 ? 's' : ''}
            </Link>
          )}
          {criticalRisks === 0 && highRisks === 0 && overdueMilestones === 0 && (
            <span className="text-zinc-400 text-sm">No issues detected</span>
          )}
        </div>

        {/* Per-track badges (unchanged formula) */}
        <div className="flex items-center justify-center gap-4 pt-1 border-t border-zinc-100">
          <span data-testid="adr-health-badge"
            className={`inline-flex px-2 py-0.5 text-xs rounded-full border ${ragConfig[adrHealth].className}`}>
            ADR: {ragConfig[adrHealth].label}
          </span>
          <span data-testid="biggy-health-badge"
            className={`inline-flex px-2 py-0.5 text-xs rounded-full border ${ragConfig[biggyHealth].className}`}>
            Biggy: {ragConfig[biggyHealth].label}
          </span>
        </div>

      </div>
    </section>
  )
}

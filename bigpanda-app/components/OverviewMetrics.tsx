'use client'

import { useEffect, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface OverviewMetricsProps {
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
}

// ─── ProgressRing (copied from OnboardingDashboard) ───────────────────────────

const circumference = 138.23

function ProgressRing({ pct }: { pct: number }) {
  const offset = circumference * (1 - pct / 100)
  return (
    <div data-testid="progress-ring" className="relative flex items-center justify-center">
      <svg width="52" height="52" viewBox="0 0 52 52">
        <circle
          r="22"
          cx="26"
          cy="26"
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="5"
          strokeDasharray={circumference}
        />
        <circle
          r="22"
          cx="26"
          cy="26"
          fill="none"
          stroke="#22c55e"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: 'stroke-dashoffset 1.5s ease',
            transform: 'rotate(-90deg)',
            transformOrigin: '50% 50%',
          }}
        />
      </svg>
      <span className="absolute text-[10px] font-bold text-zinc-700">{Math.round(pct)}%</span>
    </div>
  )
}

// ─── Risk severity colors ──────────────────────────────────────────────────────

const RISK_SEVERITY_COLORS: Record<string, string> = {
  critical: '#dc2626', // red-600
  high: '#f97316',     // orange-500
  medium: '#eab308',   // yellow-500
  low: '#71717a',      // zinc-500
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function OverviewMetrics({ projectId }: OverviewMetricsProps) {
  const [data, setData] = useState<OverviewMetricsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    async function fetchMetrics() {
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

    fetchMetrics()
  }, [projectId])

  // ─── Loading state ───────────────────────────────────────────────────────────

  if (loading) {
    return (
      <section className="px-4 space-y-4">
        <div className="h-40 bg-zinc-100 rounded-lg animate-pulse" />
      </section>
    )
  }

  // ─── Error state ─────────────────────────────────────────────────────────────

  if (error || !data) {
    return (
      <section className="px-4 space-y-4">
        <p className="text-sm text-red-500">Failed to load metrics.</p>
      </section>
    )
  }

  // ─── Calculate track completion percentages ─────────────────────────────────

  const adrSteps = data.stepCounts.filter(s => s.track.toLowerCase() === 'adr')
  const biggySteps = data.stepCounts.filter(s => s.track.toLowerCase() === 'biggy')

  const adrComplete = adrSteps.filter(s => s.status === 'complete').reduce((sum, s) => sum + s.count, 0)
  const adrTotal = adrSteps.reduce((sum, s) => sum + s.count, 0)
  const adrPct = adrTotal > 0 ? (adrComplete / adrTotal) * 100 : 0

  const biggyComplete = biggySteps.filter(s => s.status === 'complete').reduce((sum, s) => sum + s.count, 0)
  const biggyTotal = biggySteps.reduce((sum, s) => sum + s.count, 0)
  const biggyPct = biggyTotal > 0 ? (biggyComplete / biggyTotal) * 100 : 0

  // ─── Prepare risk chart data ─────────────────────────────────────────────────

  const riskChartData = data.riskCounts.map(r => ({
    severity: r.severity,
    count: r.count,
    color: RISK_SEVERITY_COLORS[r.severity.toLowerCase()] || '#71717a',
  }))

  const hasRisks = data.riskCounts.length > 0 && data.riskCounts.some(r => r.count > 0)

  // ─── Prepare hours chart data ────────────────────────────────────────────────

  const hasHours = data.weeklyRollup.some(w => w.hours > 0)

  // ─── Custom tooltips ─────────────────────────────────────────────────────────

  function RiskTooltip({ active, payload }: any) {
    if (!active || !payload || !payload[0]) return null
    const item = payload[0].payload
    return (
      <div className="bg-white px-3 py-2 border border-zinc-300 rounded shadow-lg text-xs">
        <p className="font-semibold capitalize">{item.severity}</p>
        <p className="text-zinc-600">{item.count} risk{item.count !== 1 ? 's' : ''}</p>
      </div>
    )
  }

  function HoursTooltip({ active, payload }: any) {
    if (!active || !payload || !payload[0]) return null
    const item = payload[0].payload
    return (
      <div className="bg-white px-3 py-2 border border-zinc-300 rounded shadow-lg text-xs">
        <p className="font-semibold">{item.weekLabel}</p>
        <p className="text-zinc-600">{item.hours} hours</p>
      </div>
    )
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <section data-testid="overview-metrics" className="px-4 space-y-4">
      <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide">Metrics</h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Card 1: Onboarding Progress */}
        <div className="bg-white border border-zinc-200 rounded-lg p-4 space-y-3">
          <h3 className="text-xs font-semibold text-zinc-600 uppercase">Onboarding Progress</h3>
          <div className="flex items-center justify-around gap-4">
            <div className="flex flex-col items-center">
              <ProgressRing pct={adrPct} />
              <p className="text-xs text-zinc-500 mt-1 font-medium">ADR</p>
            </div>
            <div className="flex flex-col items-center">
              <ProgressRing pct={biggyPct} />
              <p className="text-xs text-zinc-500 mt-1 font-medium">Biggy</p>
            </div>
          </div>
        </div>

        {/* Card 2: Risk Distribution */}
        <div className="bg-white border border-zinc-200 rounded-lg p-4 space-y-3">
          <h3 className="text-xs font-semibold text-zinc-600 uppercase">Risk Distribution</h3>
          {!hasRisks ? (
            <p className="text-sm text-zinc-400 text-center py-8">No risks recorded.</p>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={riskChartData}
                  dataKey="count"
                  nameKey="severity"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {riskChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<RiskTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Card 3: Hours Spent */}
        <div className="bg-white border border-zinc-200 rounded-lg p-4 space-y-3">
          <h3 className="text-xs font-semibold text-zinc-600 uppercase">Hours This Project</h3>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-zinc-800">{data.totalHoursThisWeek}</span>
            <span className="text-sm text-zinc-500">hrs this week</span>
          </div>
          {!hasHours ? (
            <p className="text-sm text-zinc-400 text-center py-4">No time entries.</p>
          ) : (
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={data.weeklyRollup} margin={{ top: 5, right: 5, left: -20, bottom: 20 }}>
                <XAxis
                  dataKey="weekLabel"
                  tick={{ fontSize: 9, fill: '#71717a' }}
                  angle={-45}
                  textAnchor="end"
                  height={50}
                />
                <YAxis tick={{ fontSize: 10, fill: '#71717a' }} />
                <Tooltip content={<HoursTooltip />} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                <Bar dataKey="hours" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </section>
  )
}

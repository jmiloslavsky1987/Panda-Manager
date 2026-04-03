'use client'

import { useEffect, useState } from 'react'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface WeeklyFocusProps {
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

// ─── ProgressRing (copied from OverviewMetrics) ───────────────────────────────

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

// ─── Component ─────────────────────────────────────────────────────────────────

export function WeeklyFocus({ projectId }: WeeklyFocusProps) {
  const [bullets, setBullets] = useState<string[] | null>(null)
  const [bulletsLoading, setBulletsLoading] = useState(true)
  const [overallPct, setOverallPct] = useState(0)
  const [generating, setGenerating] = useState(false)
  const [generateMessage, setGenerateMessage] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch both endpoints in parallel
        const [wfRes, metricsRes] = await Promise.all([
          fetch(`/api/projects/${projectId}/weekly-focus`),
          fetch(`/api/projects/${projectId}/overview-metrics`),
        ])

        // Parse weekly focus
        if (wfRes.ok) {
          const wfData = await wfRes.json()
          setBullets(wfData.bullets ?? null)
        }

        // Parse overview metrics and compute overallPct
        if (metricsRes.ok) {
          const metricsData: OverviewMetricsData = await metricsRes.json()

          // Extract ADR and Biggy step counts
          const adrSteps = metricsData.stepCounts.filter(s => s.track.toLowerCase() === 'adr')
          const biggySteps = metricsData.stepCounts.filter(s => s.track.toLowerCase() === 'biggy')

          // Calculate completion for ADR
          const adrComplete = adrSteps
            .filter(s => s.status === 'complete')
            .reduce((sum, s) => sum + s.count, 0)
          const adrTotal = adrSteps.reduce((sum, s) => sum + s.count, 0)
          const adrPct = adrTotal > 0 ? (adrComplete / adrTotal) * 100 : 0

          // Calculate completion for Biggy
          const biggyComplete = biggySteps
            .filter(s => s.status === 'complete')
            .reduce((sum, s) => sum + s.count, 0)
          const biggyTotal = biggySteps.reduce((sum, s) => sum + s.count, 0)
          const biggyPct = biggyTotal > 0 ? (biggyComplete / biggyTotal) * 100 : 0

          // Overall percentage is average of ADR and Biggy
          const overall = (adrPct + biggyPct) / 2
          setOverallPct(overall)
        }
      } catch (err) {
        console.error('Failed to fetch weekly focus data:', err)
      } finally {
        setBulletsLoading(false)
      }
    }

    fetchData()
  }, [projectId])

  async function handleGenerateNow() {
    setGenerating(true)
    setGenerateMessage(null)
    try {
      const res = await fetch(`/api/projects/${projectId}/weekly-focus`, {
        method: 'POST',
      })
      if (res.ok) {
        // Job queued successfully - show success message and refetch after delay
        setGenerateMessage('Generation started. Refreshing in 10 seconds...')
        setTimeout(async () => {
          try {
            const wfRes = await fetch(`/api/projects/${projectId}/weekly-focus`)
            if (wfRes.ok) {
              const wfData = await wfRes.json()
              setBullets(wfData.bullets ?? null)
              setGenerateMessage('Weekly focus updated successfully!')
              setTimeout(() => setGenerateMessage(null), 3000)
            }
          } catch (err) {
            console.error('Failed to refetch weekly focus:', err)
            setGenerateMessage('Generation queued. Refresh the page to see results.')
          }
        }, 10000)
      } else {
        setGenerateMessage('Failed to generate. Please try again.')
        setTimeout(() => setGenerateMessage(null), 3000)
      }
    } catch (err) {
      console.error('Failed to trigger weekly focus generation:', err)
      setGenerateMessage('Error: Could not start generation.')
      setTimeout(() => setGenerateMessage(null), 3000)
    } finally {
      setGenerating(false)
    }
  }

  // ─── Loading state ───────────────────────────────────────────────────────────

  if (bulletsLoading) {
    return (
      <section className="px-4">
        <div className="h-40 bg-zinc-100 rounded-lg animate-pulse" />
      </section>
    )
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <section data-testid="weekly-focus-section" className="px-4">
      <div className="bg-white border border-zinc-200 rounded-lg p-4 space-y-3">
        {/* Header row with title and progress ring */}
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide">
            Weekly Focus
          </h2>
          <ProgressRing pct={overallPct} />
        </div>

        {/* Content: bullets or empty state */}
        {bullets && bullets.length > 0 ? (
          <ul className="space-y-2">
            {bullets.map((bullet, index) => (
              <li
                key={index}
                data-testid="weekly-focus-bullet"
                className="flex items-start gap-2 text-sm text-zinc-700"
              >
                <span className="text-green-600 mt-0.5">•</span>
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-6 space-y-3">
            <p className="text-sm text-zinc-500">
              No weekly focus generated yet. The scheduled job runs every Monday at 6am.
            </p>
            <button
              data-testid="generate-now-btn"
              onClick={handleGenerateNow}
              disabled={generating}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? 'Generating...' : 'Generate Now'}
            </button>
            {generateMessage && (
              <p className="text-sm text-blue-600 font-medium">{generateMessage}</p>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

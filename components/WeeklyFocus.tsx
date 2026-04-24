'use client'

import { useEffect, useState } from 'react'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface WeeklyFocusProps {
  projectId: number
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function WeeklyFocus({ projectId }: WeeklyFocusProps) {
  const [bullets, setBullets] = useState<string[] | null>(null)
  const [bulletsLoading, setBulletsLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [generateMessage, setGenerateMessage] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const wfRes = await fetch(`/api/projects/${projectId}/weekly-focus`)

        if (wfRes.ok) {
          const wfData = await wfRes.json()
          setBullets(wfData.bullets ?? null)
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
      if (!res.ok) {
        setGenerateMessage('Failed to generate. Please try again.')
        setTimeout(() => setGenerateMessage(null), 3000)
        return
      }

      // Poll every 3s until bullets arrive (max 60s)
      setGenerateMessage('Generating…')
      const INTERVAL = 3000
      const MAX_ATTEMPTS = 20
      let attempts = 0

      const poll = async () => {
        attempts++
        try {
          const wfRes = await fetch(`/api/projects/${projectId}/weekly-focus`)
          if (wfRes.ok) {
            const wfData = await wfRes.json()
            if (Array.isArray(wfData.bullets) && wfData.bullets.length > 0) {
              setBullets(wfData.bullets)
              setGenerateMessage('Weekly focus updated!')
              setTimeout(() => setGenerateMessage(null), 3000)
              return
            }
          }
        } catch (err) {
          console.error('Failed to poll weekly focus:', err)
        }
        if (attempts < MAX_ATTEMPTS) {
          setTimeout(poll, INTERVAL)
        } else {
          setGenerateMessage('Taking longer than expected — refresh the page to see results.')
        }
      }

      setTimeout(poll, INTERVAL)
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
        {/* Header row: title | Generate Now button | progress ring */}
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide">
            Weekly Focus
          </h2>
          <button
            data-testid="generate-now-btn"
            onClick={handleGenerateNow}
            disabled={generating}
            className="px-3 py-1 text-xs font-medium text-zinc-600 border border-zinc-300 rounded hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? 'Generating...' : 'Generate Now'}
          </button>
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
          <p className="text-xs text-zinc-400 italic">
            Weekly focus generates automatically every Monday at 6am.
          </p>
        )}

        {/* Generation message */}
        {generateMessage && (
          <p className="text-sm text-zinc-500 font-medium">{generateMessage}</p>
        )}
      </div>
    </section>
  )
}

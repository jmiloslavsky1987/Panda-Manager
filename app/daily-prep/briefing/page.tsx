'use client'
// Phase 85.2 — Today's Briefing tab.
// Fetches today's row from GET /api/daily-prep/briefing on mount;
// renders markdown with ReactMarkdown + rehype-sanitize.
// Regenerate Briefing button re-runs synthesis (POST) and streams updates inline.
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeSanitize from 'rehype-sanitize'

interface BriefingRow {
  id: number
  date: string
  briefing_content: string
  generated_at: string
}

export default function BriefingPage() {
  const today = new Date().toISOString().slice(0, 10)
  const [briefing, setBriefing] = useState<BriefingRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [streaming, setStreaming] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(`/api/daily-prep/briefing?date=${today}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (!cancelled) { setBriefing(data); setLoading(false) } })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [today])

  async function handleRegenerate() {
    setStreaming(true)
    setStreamingText('')
    setError(null)
    try {
      const response = await fetch('/api/daily-prep/briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: today }),
      })
      if (!response.ok || !response.body) {
        setError(`HTTP ${response.status}`)
        setStreaming(false)
        return
      }
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''
      let lineBuffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        lineBuffer += decoder.decode(value, { stream: true })
        const lines = lineBuffer.split('\n')
        lineBuffer = lines.pop() ?? ''
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(line.slice(6))
              if (parsed.text) {
                accumulated += parsed.text
                setStreamingText(accumulated)
              }
              if (parsed.error) {
                setError(parsed.error)
              }
            } catch { /* partial SSE chunk */ }
          }
          if (line.startsWith('event: done')) {
            // Re-fetch the persisted row to get the canonical record (with id, generated_at)
            const refreshed = await fetch(`/api/daily-prep/briefing?date=${today}`).then((r) => r.json()).catch(() => null)
            setBriefing(refreshed ?? { id: 0, date: today, briefing_content: accumulated, generated_at: new Date().toISOString() })
            setStreaming(false)
            setStreamingText('')
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setStreaming(false)
    }
  }

  function handleCopy() {
    if (!briefing) return
    navigator.clipboard.writeText(briefing.briefing_content).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }).catch(() => { /* ignore */ })
  }

  function handlePrint() {
    document.body.classList.add('printing-all')
    window.addEventListener('afterprint', () => document.body.classList.remove('printing-all'), { once: true })
    window.print()
  }

  if (loading) {
    return <div className="px-4 py-4 text-sm text-zinc-500">Loading briefing…</div>
  }

  // Streaming state — show in-flight text
  if (streaming) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-4">
        <div className="mb-3 text-xs text-zinc-500">Synthesizing…</div>
        <div className="prose prose-sm prose-zinc">
          <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{streamingText || 'Working…'}</ReactMarkdown>
        </div>
      </div>
    )
  }

  // Empty state — no briefing for today
  if (!briefing) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="rounded border border-zinc-200 dark:border-zinc-700 p-4 text-sm text-zinc-600 dark:text-zinc-400">
          <p className="mb-2 font-medium text-zinc-900 dark:text-zinc-100">No briefing for {today}</p>
          <p>Go to the Calendar tab, select your meetings, and click Generate Prep to produce today&apos;s briefing.</p>
        </div>
        <div className="mt-4">
          <button
            type="button"
            onClick={handleRegenerate}
            className="inline-flex items-center rounded border border-zinc-200 dark:border-zinc-700 px-3 py-1 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Regenerate Briefing
          </button>
        </div>
        {error && <p className="mt-3 text-xs text-red-600">Error: {error}</p>}
      </div>
    )
  }

  // Rendered state — full markdown
  return (
    <div className="max-w-3xl mx-auto px-4 py-4 print-target">
      <div className="mb-3 flex items-center gap-2 no-print">
        <button
          type="button"
          onClick={handleRegenerate}
          className="inline-flex items-center rounded border border-zinc-200 dark:border-zinc-700 px-3 py-1 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          Regenerate Briefing
        </button>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center rounded border border-zinc-200 dark:border-zinc-700 px-3 py-1 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          {copied ? 'Copied' : 'Copy to Clipboard'}
        </button>
        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex items-center rounded border border-zinc-200 dark:border-zinc-700 px-3 py-1 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          Print
        </button>
        <span className="ml-auto text-xs text-zinc-400">
          Generated {new Date(briefing.generated_at).toLocaleString()}
        </span>
      </div>
      <div className="prose prose-sm prose-zinc">
        <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{briefing.briefing_content}</ReactMarkdown>
      </div>
      {error && <p className="mt-3 text-xs text-red-600 no-print">Error: {error}</p>}
    </div>
  )
}

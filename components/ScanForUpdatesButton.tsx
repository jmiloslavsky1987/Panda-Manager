'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from './Icon'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'

// ─── Types ────────────────────────────────────────────────────────────────────

type Source = 'slack' | 'gmail' | 'glean' | 'gong'

const ALL_SOURCES: Source[] = ['slack', 'gmail', 'glean', 'gong']

const SOURCE_LABELS: Record<Source, string> = {
  slack: 'Slack',
  gmail: 'Gmail',
  glean: 'Glean',
  gong: 'Gong',
}

type Lookback = '7d' | '14d' | '1m' | '3m'

const LOOKBACK_OPTIONS: Array<{ value: Lookback; label: string }> = [
  { value: '7d',  label: 'Last 7 days'   },
  { value: '14d', label: 'Last 14 days'  },
  { value: '1m',  label: 'Last month'    },
  { value: '3m',  label: 'Last 3 months' },
]

function lookbackToMs(lb: Lookback): number {
  if (lb === '7d')  return 7  * 24 * 60 * 60 * 1000
  if (lb === '14d') return 14 * 24 * 60 * 60 * 1000
  if (lb === '1m')  return 30 * 24 * 60 * 60 * 1000
  return 90 * 24 * 60 * 60 * 1000
}

interface ScanForUpdatesButtonProps {
  projectId: number
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ScanForUpdatesButton({ projectId }: ScanForUpdatesButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [scanProgress, setScanProgress] = useState<string>('')
  const [sources, setSources] = useState<Source[]>(ALL_SOURCES)
  const [lookback, setLookback] = useState<Lookback>('7d')
  const abortRef = useRef<AbortController | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Load saved source config on mount
  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await fetch(`/api/discovery/scan-config?projectId=${projectId}`)
        if (res.ok) {
          const data = await res.json() as { sources?: Source[]; lookback?: Lookback }
          if (data.sources && data.sources.length > 0) {
            setSources(data.sources as Source[])
          }
          if (data.lookback) {
            setLookback(data.lookback)
          }
        }
      } catch {
        // Ignore — defaults already set
      }
    }
    loadConfig()
  }, [projectId])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  function toggleSource(source: Source) {
    setSources(prev =>
      prev.includes(source)
        ? prev.filter(s => s !== source)
        : [...prev, source]
    )
  }

  async function handleStartScan() {
    if (sources.length === 0) {
      toast.error('Select at least one source to scan')
      return
    }

    setOpen(false)
    setScanning(true)
    setScanProgress('Starting scan…')

    // Save source selection and lookback
    try {
      await fetch('/api/discovery/scan-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, sources, lookback }),
      })
    } catch {
      // Non-fatal — proceed with scan
    }

    // Start SSE scan via fetch + ReadableStream
    abortRef.current = new AbortController()

    try {
      const since = new Date(Date.now() - lookbackToMs(lookback)).toISOString()
      const response = await fetch('/api/discovery/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, sources, since }),
        signal: abortRef.current.signal,
      })

      if (!response.ok || !response.body) {
        throw new Error(`Scan request failed: ${response.status}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const events = buffer.split('\n\n')
        buffer = events.pop() ?? ''

        for (const event of events) {
          const dataLine = event.split('\n').find(l => l.startsWith('data: '))
          if (!dataLine) continue

          try {
            const payload = JSON.parse(dataLine.slice(6)) as {
              type: string
              message?: string
              itemCount?: number
              newItems?: number
              sourceSummary?: Record<string, { fetched: number; skipped: boolean; reason?: string }>
            }

            if (payload.type === 'progress' && payload.message) {
              setScanProgress(payload.message)
            } else if (payload.type === 'warning' && payload.message) {
              toast.warning(payload.message)
            } else if (payload.type === 'complete') {
              setScanning(false)
              setScanProgress('')
              const newItems = payload.newItems ?? payload.itemCount ?? 0

              // Build per-source breakdown description
              const breakdown = payload.sourceSummary
                ? Object.entries(payload.sourceSummary)
                    .map(([src, stat]) =>
                      stat.skipped
                        ? `${SOURCE_LABELS[src as Source] ?? src}: no credentials`
                        : `${SOURCE_LABELS[src as Source] ?? src}: ${stat.fetched} message${stat.fetched === 1 ? '' : 's'}`
                    )
                    .join(' · ')
                : undefined

              if (newItems > 0) {
                toast.success(
                  `Scan complete — ${newItems} new items ready for review`,
                  breakdown ? { description: breakdown } : undefined
                )
              } else {
                toast.info('Scan complete — no new items found', breakdown ? { description: breakdown } : undefined)
              }
              router.push(`/customer/${projectId}/queue`)
              return
            } else if (payload.type === 'error') {
              throw new Error(payload.message ?? 'Scan error')
            }
          } catch {
            // Skip malformed SSE line
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      console.error('[ScanForUpdatesButton] scan error:', err)
      toast.error(
        err instanceof Error ? err.message : 'Scan failed — check console for details'
      )
    } finally {
      setScanning(false)
      setScanProgress('')
    }
  }

  // ─── Scanning state ──────────────────────────────────────────────────────────

  if (scanning) {
    return (
      <div className="flex items-center gap-2 text-sm text-zinc-500">
        <Icon name="refresh" size={16} className="animate-spin" />
        <span>{scanProgress || 'Scanning…'}</span>
      </div>
    )
  }

  // ─── Idle state — button + source selector dropdown ──────────────────────────

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="outline"
        size="sm"
        className="h-7 gap-1.5 text-xs"
        onClick={() => setOpen(prev => !prev)}
        disabled={scanning}
      >
        <Icon name="refresh" size={14} />
        Scan for Updates
        <Icon name="expand_more" size={12} className="ml-0.5" />
      </Button>

      {open && (
        <div className="absolute right-0 top-8 z-50 w-52 rounded-md border border-zinc-200 bg-white shadow-lg p-4">
          <p className="text-sm font-medium mb-3 text-zinc-700">Scan sources</p>
          <div className="space-y-2 mb-4">
            {ALL_SOURCES.map(source => (
              <div key={source} className="flex items-center gap-2">
                <Checkbox
                  id={`source-${source}`}
                  checked={sources.includes(source)}
                  onCheckedChange={() => toggleSource(source)}
                />
                <label
                  htmlFor={`source-${source}`}
                  className="text-sm cursor-pointer select-none text-zinc-700"
                >
                  {SOURCE_LABELS[source]}
                </label>
              </div>
            ))}
          </div>
          <div className="mb-4">
            <p className="text-sm font-medium mb-1.5 text-zinc-700">Timeframe</p>
            <select
              value={lookback}
              onChange={(e) => setLookback(e.target.value as Lookback)}
              className="w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-700 cursor-pointer focus:outline-none focus:ring-1 focus:ring-zinc-400"
            >
              {LOOKBACK_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <Button
            size="sm"
            className="w-full"
            onClick={handleStartScan}
            disabled={sources.length === 0}
          >
            Start Scan
          </Button>
        </div>
      )}
    </div>
  )
}

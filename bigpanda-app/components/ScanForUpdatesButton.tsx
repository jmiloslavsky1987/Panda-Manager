'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, ChevronDown } from 'lucide-react'
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
  const abortRef = useRef<AbortController | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Load saved source config on mount
  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await fetch(`/api/discovery/scan-config?projectId=${projectId}`)
        if (res.ok) {
          const data = await res.json() as { sources?: Source[] }
          if (data.sources && data.sources.length > 0) {
            setSources(data.sources as Source[])
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

    // Save source selection
    try {
      await fetch('/api/discovery/scan-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, sources }),
      })
    } catch {
      // Non-fatal — proceed with scan
    }

    // Start SSE scan via fetch + ReadableStream
    abortRef.current = new AbortController()

    try {
      const response = await fetch('/api/discovery/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, sources }),
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
            }

            if (payload.type === 'progress' && payload.message) {
              setScanProgress(payload.message)
            } else if (payload.type === 'warning' && payload.message) {
              toast.warning(payload.message)
            } else if (payload.type === 'complete') {
              setScanning(false)
              setScanProgress('')
              const newItems = payload.newItems ?? payload.itemCount ?? 0
              if (newItems > 0) {
                toast.success(
                  `Scan complete — ${newItems} new items ready for review`
                )
              } else {
                toast.info('Scan complete — no new items found')
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
        <RefreshCw className="h-4 w-4 animate-spin" />
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
        <RefreshCw className="h-3.5 w-3.5" />
        Scan for Updates
        <ChevronDown className="h-3 w-3 ml-0.5" />
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

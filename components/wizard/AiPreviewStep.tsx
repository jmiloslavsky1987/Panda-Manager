'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { ExtractionPreview } from '@/components/ExtractionPreview'
import { IngestionStepper } from '@/components/IngestionStepper'
import type { ReviewItem } from '@/components/IngestionModal'
import type { ExtractionItem } from '@/lib/extraction-types'

// ─── Constants ────────────────────────────────────────────────────────────────

const PASS_LABELS = ['Project data', 'Architecture', 'Teams & delivery', 'People & outcomes']

// ─── Types ────────────────────────────────────────────────────────────────────

interface FileStatus {
  name: string
  status: 'pending' | 'extracting' | 'done' | 'error'
  artifactId?: number
}

interface AiPreviewStepProps {
  projectId: number
  fileStatuses: FileStatus[]
  reviewItems: ReviewItem[]
  onReviewItemsChange: (items: ReviewItem[]) => void
  onApprove: (approvedItems: ReviewItem[]) => void
  onSkip: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AiPreviewStep({
  projectId,
  fileStatuses,
  reviewItems,
  onReviewItemsChange,
  onApprove,
  onSkip,
}: AiPreviewStepProps) {
  const [localStatuses, setLocalStatuses] = useState<FileStatus[]>(fileStatuses)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [extractionMessage, setExtractionMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isExtracting, setIsExtracting] = useState(false)
  const [isApproving, setIsApproving] = useState(false)

  const hasStartedRef = useRef(false)
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isPollingRef = useRef(false)

  // ── Poll job statuses ─────────────────────────────────────────────────────

  const startPolling = useCallback((ids: number[], statuses: FileStatus[]) => {
    if (isPollingRef.current) return
    isPollingRef.current = true

    const poll = async () => {
      try {
        const responses = await Promise.all(
          ids.map(jobId =>
            fetch(`/api/ingestion/jobs/${jobId}`).then(r => r.ok ? r.json() : null)
          )
        )

        let progressMessage: string | null = null
        let runningCount = 0
        let pendingCount = 0

        responses.forEach((data, idx) => {
          if (!data) return
          if (data.status === 'pending') {
            pendingCount++
          } else if (data.status === 'running') {
            runningCount++
            const progress_pct = data.progress_pct || 0
            const fileLabel = statuses.length > 1 ? ` (file ${idx + 1}/${statuses.length})` : ''
            if (progress_pct === 0) {
              progressMessage = `Analyzing document…${fileLabel}`
            } else {
              const passIdx = progress_pct <= 32 ? 0 : progress_pct <= 54 ? 1 : progress_pct <= 76 ? 2 : 3
              const passLabel = PASS_LABELS[passIdx]
              const passNum = passIdx + 1
              const passStartPcts = [10, 32, 54, 76]
              const withinPassRaw = Math.round(Math.max(0, progress_pct - passStartPcts[passIdx]) * (100 / 22))
              const withinPassPct = Math.min(100, withinPassRaw)
              progressMessage = `Pass ${passNum} of 4 — ${passLabel} (${withinPassPct}%)${fileLabel}`
            }
          } else if (data.status === 'failed') {
            setLocalStatuses(prev => prev.map((f, i) =>
              i === idx ? { ...f, status: 'error' } : f
            ))
            setError(data.error_message || `Extraction failed for ${statuses[idx]?.name}`)
          } else if (data.status === 'completed') {
            setLocalStatuses(prev => prev.map((f, i) =>
              i === idx ? { ...f, status: 'done' } : f
            ))
          }
        })

        if (progressMessage) {
          setExtractionMessage(progressMessage)
        } else if (pendingCount > 0 && runningCount === 0) {
          const queuedLabel = pendingCount > 1 ? `${pendingCount} files queued` : 'Queued'
          setExtractionMessage(`${queuedLabel} — waiting for worker…`)
        }

        const allCompleted = responses.every(data => data && data.status === 'completed')
        const anyFailed = responses.some(data => data && data.status === 'failed')

        if (allCompleted || anyFailed) {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current)
            pollingIntervalRef.current = null
          }
          isPollingRef.current = false
          setIsExtracting(false)

          if (allCompleted) {
            const statusRes = await fetch(`/api/projects/${projectId}/extraction-status`)
            const statusData = await statusRes.json()

            const allItems: ReviewItem[] = []
            for (const job of (statusData.jobs ?? [])) {
              if (ids.includes(job.id) && job.status === 'completed') {
                const items = Array.isArray(job.staged_items_json) ? job.staged_items_json : []
                allItems.push(...items
                  .filter((item: unknown): item is ExtractionItem =>
                    item != null && typeof (item as ExtractionItem).entityType === 'string'
                  )
                  .map((item: ExtractionItem) => ({
                    ...item,
                    approved: true,
                    edited: false,
                  })))
              }
            }
            onReviewItemsChange(allItems)
          }
        }
      } catch (err) {
        console.error('Polling error:', err)
      }
    }

    poll()
    pollingIntervalRef.current = setInterval(poll, 2000)
  }, [projectId, onReviewItemsChange])

  // ── Enqueue extraction jobs on mount ──────────────────────────────────────

  useEffect(() => {
    if (hasStartedRef.current) return
    hasStartedRef.current = true

    const filesToExtract = fileStatuses.filter(f => f.artifactId)
    if (filesToExtract.length === 0) return

    setIsExtracting(true)
    setExtractionMessage('Starting extraction…')
    setLocalStatuses(fileStatuses.map(f => f.artifactId ? { ...f, status: 'extracting' } : f))

    const artifactIds = filesToExtract.map(f => f.artifactId!)

    fetch('/api/ingestion/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ artifactIds, projectId }),
    })
      .then(async res => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error((err as { error?: string }).error ?? `Extraction failed (${res.status})`)
        }
        const data = await res.json() as { jobIds: number[]; batchId: string }
        startPolling(data.jobIds, fileStatuses)
      })
      .catch(err => {
        setError(err instanceof Error ? err.message : 'Extraction failed')
        setIsExtracting(false)
        setLocalStatuses(fileStatuses.map(f => f.artifactId ? { ...f, status: 'error' } : f))
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Cleanup polling on unmount ────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
      isPollingRef.current = false
    }
  }, [])

  // ── Item change passthrough ───────────────────────────────────────────────

  function handleItemChange(index: number, changes: Partial<ReviewItem>) {
    onReviewItemsChange(
      reviewItems.map((item, i) => i === index ? { ...item, ...changes } : item)
    )
  }

  // ── Approve — writes to DB via ingestion approve route ───────────────────

  async function handleApprove(approvedItems: ReviewItem[]) {
    setIsApproving(true)
    setError(null)

    try {
      const artifactId = localStatuses.find(s => s.artifactId)?.artifactId ?? null
      const res = await fetch('/api/ingestion/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          artifactId,
          items: approvedItems,
          totalExtracted: reviewItems.length,
        }),
      })
      const data = await res.json() as { error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Approve failed')

      onApprove(approvedItems)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Approve failed')
    } finally {
      setIsApproving(false)
    }
  }

  // ── No files uploaded — skip directly ────────────────────────────────────

  const hasFiles = fileStatuses.length > 0 && fileStatuses.some(f => f.artifactId)
  const allDone = localStatuses.every(f => f.status === 'done' || f.status === 'error' || !f.artifactId)

  if (!hasFiles) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-16">
        <p className="text-zinc-500 text-sm">No files were uploaded. You can skip this step.</p>
        <Button variant="outline" onClick={onSkip}>Skip to Manual Entry</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full gap-0">
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden gap-0">
        {/* Sidebar — file stepper */}
        <div className="w-56 border-r bg-zinc-50 shrink-0 overflow-y-auto">
          <IngestionStepper
            files={localStatuses}
            currentIndex={currentIndex}
            onSelectFile={setCurrentIndex}
          />
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-y-auto p-6">
          {(isExtracting || !allDone) && (
            <div className="space-y-4">
              <p className="text-sm text-zinc-600 animate-pulse">
                {extractionMessage || 'Preparing extraction…'}
              </p>
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="h-12 bg-zinc-100 rounded animate-pulse"
                    style={{ opacity: 1 - i * 0.15 }}
                  />
                ))}
              </div>
            </div>
          )}

          {allDone && reviewItems.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <p className="text-zinc-500 text-sm">No items were extracted from the uploaded files.</p>
              <Button variant="outline" onClick={onSkip}>Skip to Manual Entry</Button>
            </div>
          )}

          {allDone && reviewItems.length > 0 && (
            <>
              {isApproving && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-blue-700 text-sm animate-pulse">
                  Saving approved items…
                </div>
              )}
              <ExtractionPreview
                items={reviewItems}
                onItemChange={handleItemChange}
                onApprove={handleApprove}
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}

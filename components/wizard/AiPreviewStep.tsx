'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ExtractionPreview } from '@/components/ExtractionPreview'
import { IngestionStepper } from '@/components/IngestionStepper'
import type { ReviewItem } from '@/components/IngestionModal'
import type { ExtractionItem } from '@/lib/extraction-types'

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
  const [lastExtractedArtifactId, setLastExtractedArtifactId] = useState<number | null>(null)

  const hasStartedRef = useRef(false)
  const reviewItemsRef = useRef(reviewItems)

  // Keep ref in sync with prop (for accumulation reads inside async callbacks)
  useEffect(() => {
    reviewItemsRef.current = reviewItems
  }, [reviewItems])

  // ── Extraction: run all files on mount ────────────────────────────────────

  useEffect(() => {
    if (hasStartedRef.current) return
    hasStartedRef.current = true

    const filesToExtract = fileStatuses.filter(f => f.artifactId)
    if (filesToExtract.length === 0) return

    // Run extractions sequentially
    ;(async () => {
      for (let idx = 0; idx < fileStatuses.length; idx++) {
        const file = fileStatuses[idx]
        if (!file.artifactId || file.status === 'done') continue
        await extractFileByIndex(idx, fileStatuses)
      }
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── SSE extraction for a single file ─────────────────────────────────────

  async function extractFileByIndex(idx: number, statuses: FileStatus[]) {
    const file = statuses[idx]
    if (!file?.artifactId) return

    setCurrentIndex(idx)
    setIsExtracting(true)
    setExtractionMessage(`Extracting ${file.name}…`)
    setLocalStatuses(prev => prev.map((f, i) =>
      i === idx ? { ...f, status: 'extracting' } : f
    ))

    try {
      const res = await fetch('/api/ingestion/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artifactId: file.artifactId, projectId }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error ?? `Extraction failed (${res.status})`)
      }

      const items: ReviewItem[] = await new Promise((resolve, reject) => {
        const accumulated: ReviewItem[] = []
        const reader = res.body!.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        async function pump() {
          try {
            while (true) {
              const { done, value } = await reader.read()
              if (done) { resolve(accumulated); break }
              buffer += decoder.decode(value, { stream: true })
              const lines = buffer.split('\n')
              buffer = lines.pop() ?? ''
              for (const line of lines) {
                if (!line.startsWith('data: ')) continue
                try {
                  const parsed = JSON.parse(line.slice(6)) as {
                    type: string
                    message?: string
                    item?: ExtractionItem & { conflict?: ReviewItem['conflict'] }
                    items?: Array<ExtractionItem & { conflict?: ReviewItem['conflict'] }>
                    filteredCount?: number
                  }
                  if (parsed.type === 'progress') {
                    setExtractionMessage(parsed.message ?? `Extracting ${file.name}…`)
                  } else if (parsed.type === 'item' && parsed.item) {
                    accumulated.push({
                      ...(parsed.item as ExtractionItem),
                      approved: true,
                      edited: false,
                      conflict: parsed.item.conflict,
                    })
                  } else if (parsed.type === 'complete') {
                    for (const raw of (parsed.items ?? [])) {
                      accumulated.push({
                        ...(raw as ExtractionItem),
                        approved: true,
                        edited: false,
                        conflict: (raw as ExtractionItem & { conflict?: ReviewItem['conflict'] }).conflict,
                      })
                    }
                    resolve(accumulated)
                    return
                  } else if (parsed.type === 'done') {
                    resolve(accumulated)
                    return
                  } else if (parsed.type === 'error') {
                    reject(new Error((parsed as { message?: string }).message ?? 'Extraction error'))
                    return
                  }
                } catch { /* ignore malformed SSE frames */ }
              }
            }
          } catch (err) {
            reject(err)
          }
        }
        pump()
      })

      // Accumulate — never replace
      onReviewItemsChange([...reviewItemsRef.current, ...items])
      setLastExtractedArtifactId(file.artifactId)
      setLocalStatuses(prev => prev.map((f, i) =>
        i === idx ? { ...f, status: 'done' } : f
      ))
    } catch (err) {
      setLocalStatuses(prev => prev.map((f, i) =>
        i === idx ? { ...f, status: 'error' } : f
      ))
      setError(err instanceof Error ? err.message : 'Extraction failed')
    } finally {
      setIsExtracting(false)
    }
  }

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
      const artifactId = lastExtractedArtifactId ?? localStatuses.find(s => s.artifactId)?.artifactId ?? null
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

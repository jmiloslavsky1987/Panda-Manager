'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { IngestionStepper } from './IngestionStepper'
import { ExtractionPreview } from './ExtractionPreview'
import type { ExtractionItem } from '@/lib/extraction-types'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReviewItem extends ExtractionItem {
  approved: boolean
  edited: boolean
  conflictResolution?: 'merge' | 'replace' | 'skip'
  conflict?: {
    existingId: number
    existingRecord: Record<string, string>
    resolution?: 'merge' | 'replace' | 'skip'
  }
}

type Stage = 'uploading' | 'extracting' | 'reviewing' | 'submitting' | 'done'

interface FileStatus {
  name: string
  status: 'pending' | 'extracting' | 'done' | 'error'
  fileId?: string  // returned by upload endpoint
}

interface IngestionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: number
  artifactId?: number
  /** Pre-populate the upload queue with files (e.g. from drag-and-drop on the Artifacts tab) */
  initialFiles?: File[]
  /** Initial stage for modal (default: 'uploading') — use 'reviewing' to reopen at review stage */
  initialStage?: Stage
  /** Pre-loaded review items when opening at review stage (e.g. from Context Hub) */
  initialReviewItems?: ExtractionItem[]
  /** Artifact ID to use for approval when reopening from Context Hub (first job's artifact_id) */
  initialArtifactId?: number
  /** Pre-computed dedup filtered count when reopening from Context Hub */
  initialFilteredCount?: number
}

// ─── Component ────────────────────────────────────────────────────────────────

export function IngestionModal({
  open,
  onOpenChange,
  projectId,
  artifactId,
  initialFiles,
  initialStage = 'uploading',
  initialReviewItems = [],
  initialArtifactId,
  initialFilteredCount,
}: IngestionModalProps) {
  const router = useRouter()
  const [stage, setStage] = useState<Stage>(initialStage)
  const [fileStatuses, setFileStatuses] = useState<FileStatus[]>([])
  const [currentFileIndex, setCurrentFileIndex] = useState(0)
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([])
  const [filteredCount, setFilteredCount] = useState<number>(0)
  // Track the artifact ID used during extraction (drop-zone flow has no prop-level artifactId)
  const [lastExtractedArtifactId, setLastExtractedArtifactId] = useState<number | null>(null)
  const [extractionMessage, setExtractionMessage] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [unresolvedRefs, setUnresolvedRefs] = useState<string | null>(null)
  // Ref prevents double-firing in React StrictMode
  const autoStartedRef = useRef(false)
  // Store jobIds for polling
  const [jobIds, setJobIds] = useState<number[]>([])
  // Polling interval ref for cleanup
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isPollingRef = useRef(false)

  // ── Poll job status ───────────────────────────────────────────────────────
  const startPolling = useCallback((jobIdsToCheck: number[], statuses: FileStatus[]) => {
    if (isPollingRef.current) return // Already polling
    isPollingRef.current = true

    const poll = async () => {
      try {
        // Fetch status for all jobs
        const responses = await Promise.all(
          jobIdsToCheck.map(jobId =>
            fetch(`/api/ingestion/jobs/${jobId}`).then(r => r.ok ? r.json() : null)
          )
        )

        // Update per-file progress
        responses.forEach((data, idx) => {
          if (!data) return
          const file = statuses[idx]
          if (!file) return

          if (data.status === 'running' || data.status === 'pending') {
            const progress_pct = data.progress_pct || 0
            const current_chunk = data.current_chunk || 0
            const total_chunks = data.total_chunks || 0

            if (total_chunks > 0) {
              setExtractionMessage(
                `${progress_pct}% — Processing chunk ${current_chunk} of ${total_chunks}`
              )
            } else {
              setExtractionMessage(`Extracting ${file.name}...`)
            }
          } else if (data.status === 'failed') {
            setFileStatuses(prev => prev.map((f, i) =>
              i === idx ? { ...f, status: 'error' } : f
            ))
            setError(data.error_message || `Extraction failed for ${file.name}`)
          } else if (data.status === 'completed') {
            setFileStatuses(prev => prev.map((f, i) =>
              i === idx ? { ...f, status: 'done' } : f
            ))
          }
        })

        // Check if all jobs are done
        const allCompleted = responses.every(data => data && data.status === 'completed')
        const anyFailed = responses.some(data => data && data.status === 'failed')

        if (allCompleted || anyFailed) {
          // Stop polling
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current)
            pollingIntervalRef.current = null
          }
          isPollingRef.current = false

          if (allCompleted) {
            // Fetch completed jobs to get staged_items_json
            const completedJobsRes = await fetch(
              `/api/projects/${projectId}/extraction-status`
            )
            const completedData = await completedJobsRes.json()

            // Find our batch and extract all items
            const allItems: ReviewItem[] = []
            let totalFiltered = 0

            for (const job of completedData.jobs) {
              if (jobIdsToCheck.includes(job.id) && job.status === 'completed') {
                const items = Array.isArray(job.staged_items_json) ? job.staged_items_json : []
                allItems.push(...items.map((item: ExtractionItem) => ({
                  ...item,
                  approved: true,
                  edited: false,
                })))

                // Track filtered count if available
                if (job.filtered_count) {
                  totalFiltered += job.filtered_count
                }
              }
            }

            setReviewItems(allItems)
            setFilteredCount(totalFiltered)
            setStage('reviewing')
          }
        }
      } catch (err) {
        console.error('Polling error:', err)
      }
    }

    // Initial poll
    poll()
    // Poll every 2 seconds
    pollingIntervalRef.current = setInterval(poll, 2000)
  }, [projectId])

  // ── Enqueue extraction jobs and start polling ─────────────────────────────
  const startExtraction = useCallback(async (statuses: FileStatus[]) => {
    // Extract artifact IDs from uploaded files
    const artifactIds = statuses
      .map(s => s.fileId ? Number(s.fileId) : null)
      .filter((id): id is number => id !== null)

    if (artifactIds.length === 0) {
      setError('No valid artifact IDs to extract')
      return
    }

    try {
      // Enqueue all jobs at once
      const res = await fetch('/api/ingestion/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artifactIds, projectId }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? `Extraction failed (${res.status})`)
      }

      const data = await res.json() as { jobIds: number[], batchId: string }
      setJobIds(data.jobIds)

      // Mark all files as extracting
      setFileStatuses(prev => prev.map(f => ({ ...f, status: 'extracting' })))

      // Start polling
      startPolling(data.jobIds, statuses)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Extraction failed')
      setFileStatuses(prev => prev.map(f => ({ ...f, status: 'error' })))
    }
  }, [projectId, startPolling])

  // ── Upload all files upfront ──────────────────────────────────────────────
  const handleFileDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return

    setStage('uploading')
    setFileStatuses(acceptedFiles.map(f => ({ name: f.name, status: 'pending' })))
    setCurrentFileIndex(0)
    setReviewItems([])
    setFilteredCount(0)
    setError(null)
    setUnresolvedRefs(null)

    const formData = new FormData()
    formData.append('project_id', String(projectId))
    if (artifactId != null) formData.append('artifact_id', String(artifactId))
    acceptedFiles.forEach(f => formData.append('files', f))

    let uploadedIds: string[] = []
    try {
      const res = await fetch('/api/ingestion/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Upload failed')
      // API returns { artifacts: [{ id, name, ingestion_status }] }
      uploadedIds = (data.artifacts ?? []).map((a: { id: number }) => String(a.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
      return
    }

    const newStatuses: FileStatus[] = acceptedFiles.map((f, i) => ({
      name: f.name,
      status: 'pending',
      fileId: uploadedIds[i],
    }))
    setFileStatuses(newStatuses)
    setStage('extracting')
    // Start extraction for all files
    await startExtraction(newStatuses)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, artifactId, startExtraction])

  // Pre-populate reviewItems when opened at review stage
  useEffect(() => {
    if (open && initialStage === 'reviewing' && initialReviewItems.length > 0) {
      setReviewItems(initialReviewItems.map(item => ({
        ...item,
        approved: true,
        edited: false,
      })))
      setStage('reviewing')
      if (initialFilteredCount !== undefined) setFilteredCount(initialFilteredCount)
    }
  }, [open, initialStage, initialReviewItems, initialFilteredCount])

  // Auto-start upload when modal opens with initialFiles from ArtifactsDropZone
  useEffect(() => {
    if (open && initialFiles && initialFiles.length > 0 && !autoStartedRef.current) {
      autoStartedRef.current = true
      handleFileDrop(initialFiles)
    }
    // Reset when modal closes so next open can re-trigger
    if (!open) {
      autoStartedRef.current = false
    }
  }, [open, initialFiles, handleFileDrop])

  // Cleanup polling on unmount or stage change
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
      isPollingRef.current = false
    }
  }, [])

  // Stop polling when leaving extracting stage
  useEffect(() => {
    if (stage !== 'extracting' && pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
      isPollingRef.current = false
    }
  }, [stage])

  // ── User selects a file in the stepper ────────────────────────────────────
  async function handleSelectFile(idx: number) {
    const file = fileStatuses[idx]
    if (!file) return

    // In new flow, all files extract simultaneously via polling
    // User just navigates between files to see their progress
    setCurrentFileIndex(idx)
  }

  // ── Item change handler from ExtractionPreview ────────────────────────────
  function handleItemChange(index: number, changes: Partial<ReviewItem>) {
    setReviewItems(prev => prev.map((item, i) => i === index ? { ...item, ...changes } : item))
  }

  // ── Final approve submission ───────────────────────────────────────────────
  async function handleApprove(approvedItems: ReviewItem[]) {
    setStage('submitting')
    setError(null)

    try {
      const res = await fetch('/api/ingestion/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          artifactId: artifactId ?? lastExtractedArtifactId ?? initialArtifactId,
          items: approvedItems.map(item => ({ ...item, conflictResolution: item.conflictResolution ?? 'skip' })),
          totalExtracted: reviewItems.length,
        }),
      })
      const text = await res.text()
      if (!text) throw new Error(`Empty response (status ${res.status})`)
      let data: Record<string, unknown>
      try {
        data = JSON.parse(text)
      } catch {
        throw new Error(`Server error (${res.status}): ${text.slice(0, 200)}`)
      }
      if (!res.ok) throw new Error(data.error as string ?? 'Approve failed')

      // Extract unresolvedRefs from response and store it
      setUnresolvedRefs(data.unresolvedRefs as string ?? null)
      setStage('done')
      window.dispatchEvent(new CustomEvent('metrics:invalidate'))
      router.refresh()

      // Auto-close only if no unresolved refs
      if (!data.unresolvedRefs) {
        setTimeout(() => onOpenChange(false), 1200)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Approve failed')
      setStage('reviewing')
    }
  }

  // ── Drag-and-drop handlers ─────────────────────────────────────────────────
  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files)
    handleFileDrop(files)
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    handleFileDrop(files)
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-screen-xl h-[90vh] p-0 flex flex-col overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle>Document Ingestion</DialogTitle>
        </DialogHeader>

        {/* Upload drop zone — shown before files are loaded */}
        {(stage === 'uploading' && fileStatuses.length === 0) && (
          <div
            className="flex-1 flex flex-col items-center justify-center gap-4"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <div className="border-2 border-dashed border-zinc-300 rounded-xl p-16 text-center space-y-3 hover:border-zinc-400 transition-colors">
              <p className="text-lg font-medium text-zinc-600">
                Drop files here to ingest
              </p>
              <p className="text-sm text-zinc-400">
                Supported: PDF, DOCX, PPTX, XLSX, MD, TXT
              </p>
              <label className="inline-block cursor-pointer mt-2">
                <span className="text-sm text-blue-600 underline">or browse files</span>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.docx,.pptx,.xlsx,.md,.txt"
                  className="sr-only"
                  onChange={handleFileInput}
                />
              </label>
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
          </div>
        )}

        {/* Main layout: sidebar + content */}
        {(fileStatuses.length > 0 || stage === 'reviewing' || stage === 'submitting' || stage === 'done') && (
          <div className="flex-1 flex overflow-hidden">
            {/* Sidebar — file stepper */}
            <div className="w-64 border-r bg-zinc-50 overflow-y-auto shrink-0">
              <IngestionStepper
                files={fileStatuses}
                currentIndex={currentFileIndex}
                onSelectFile={handleSelectFile}
              />
            </div>

            {/* Main content area */}
            <div className="flex-1 overflow-y-auto p-6">
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                  {error}
                </div>
              )}

              {/* Extracting stage: progress message + pulsing skeleton */}
              {(stage === 'extracting' || stage === 'uploading') && (
                <div className="space-y-4">
                  <p className="text-sm text-zinc-600 animate-pulse">{extractionMessage || 'Uploading files…'}</p>
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

              {/* Reviewing stage: extraction preview */}
              {stage === 'reviewing' && (
                <>
                  {filteredCount > 0 && (
                    <div className="mb-3 px-3 py-2 bg-zinc-100 border border-zinc-200 rounded text-xs text-zinc-500">
                      <span className="font-medium text-zinc-700">{filteredCount} item{filteredCount !== 1 ? 's' : ''} already in your project</span> — skipped as duplicates and not shown below.
                    </div>
                  )}
                  <ExtractionPreview
                    items={reviewItems}
                    onItemChange={handleItemChange}
                    onApprove={handleApprove}
                  />
                </>
              )}

              {/* Submitting stage */}
              {stage === 'submitting' && (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-zinc-500 animate-pulse">Saving approved items…</p>
                </div>
              )}

              {/* Done stage */}
              {stage === 'done' && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center space-y-2">
                    <p className="text-green-600 font-medium">Ingestion complete!</p>
                    <p className="text-sm text-zinc-500">Items saved to your project.</p>
                    {unresolvedRefs && (
                      <p className="mt-2 text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded px-3 py-2">
                        {unresolvedRefs}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

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
import { NOTE_RECLASSIFY_PRIMARY_FIELD, type NoteReclassifyTarget } from './ExtractionItemEditForm'

// ─── Constants ────────────────────────────────────────────────────────────────

const PASS_LABELS = ['Project data', 'Architecture', 'Teams & delivery', 'People & outcomes']

// ─── Cross-job dedup ──────────────────────────────────────────────────────────

function norm(s: unknown) { return String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '') }

function dedupeKey(item: ExtractionItem): string | null {
  const t = item.entityType
  const f = item.fields ?? {}
  switch (t) {
    case 'action': return f.description ? `${t}::${norm(f.description)}` : null
    case 'risk': return f.description ? `${t}::${norm(f.description)}` : null
    case 'decision': return f.decision ? `${t}::${norm(f.decision)}` : null
    case 'milestone': return f.name ? `${t}::${norm(f.name)}` : null
    case 'stakeholder': return f.name ? `${t}::${norm(f.name)}` : null
    case 'task': return f.title ? `${t}::${norm(f.title)}` : null
    case 'architecture': return f.tool_name ? `${t}::${norm(f.tool_name)}` : null
    case 'integration': return f.tool_name ? `${t}::${norm(f.tool_name)}` : null
    case 'team': return f.team_name ? `${t}::${norm(f.team_name)}` : null
    case 'businessOutcome': return f.title ? `${t}::${norm(f.title)}` : null
    case 'focus_area': return f.title ? `${t}::${norm(f.title)}` : null
    case 'workstream': return f.name ? `${t}::${norm(f.name)}` : null
    case 'wbs_task': return (f.title && f.track) ? `${t}::${norm(f.title)}::${norm(f.track)}` : (f.title ? `${t}::${norm(f.title)}` : null)
    case 'onboarding_step': return f.step_name ? `${t}::${norm(f.step_name)}` : null
    case 'arch_node': return (f.node_name && f.track) ? `${t}::${norm(f.node_name)}::${norm(f.track)}` : null
    case 'e2e_workflow': return f.workflow_name ? `${t}::${norm(f.workflow_name)}` : null
    default: return null
  }
}

function deduplicateCrossJob(items: ReviewItem[]): ReviewItem[] {
  const seen = new Set<string>()
  return items.filter(item => {
    const key = dedupeKey(item)
    if (key === null) return true
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

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

export interface ProposedChange {
  intent: 'update' | 'close' | 'remove'
  entityType: string
  existingId: number
  existingRecord: Record<string, unknown>
  proposedFields?: Record<string, unknown>
  confidence: number
  reasoning: string
}

type Stage = 'uploading' | 'extracting' | 'reviewing' | 'submitting' | 'done'
type InitialStage = 'uploading' | 'extracting' | 'reviewing'

interface ExtractionJob {
  id: number
  status: string
  filename?: string
  artifact_id?: number
}

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
  /** Initial stage for modal (default: 'uploading') — use 'reviewing' or 'extracting' to reopen at those stages */
  initialStage?: InitialStage
  /** Pre-loaded review items when opening at review stage (e.g. from Context Hub) */
  initialReviewItems?: ExtractionItem[]
  /** Artifact ID to use for approval when reopening from Context Hub (first job's artifact_id) */
  initialArtifactId?: number
  /** Pre-computed dedup filtered count when reopening from Context Hub */
  initialFilteredCount?: number
  /** Pre-loaded proposed changes from Pass 5 when opening at review stage */
  initialProposedChanges?: ProposedChange[]
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
  initialProposedChanges = [],
}: IngestionModalProps) {
  const router = useRouter()
  const [stage, setStage] = useState<Stage>(initialStage)
  const [fileStatuses, setFileStatuses] = useState<FileStatus[]>([])
  const [currentFileIndex, setCurrentFileIndex] = useState(0)
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([])
  const [filteredCount, setFilteredCount] = useState<number>(0)
  const [proposedChanges, setProposedChanges] = useState<ProposedChange[]>([])
  const [rejectedChangeIds, setRejectedChangeIds] = useState<Set<number>>(new Set())
  // Track the artifact ID used during extraction (drop-zone flow has no prop-level artifactId)
  const [lastExtractedArtifactId, setLastExtractedArtifactId] = useState<number | null>(null)
  const [extractionMessage, setExtractionMessage] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [unresolvedRefs, setUnresolvedRefs] = useState<string | null>(null)
  const [approvalResult, setApprovalResult] = useState<{
    written: Record<string, number>
    skipped: Record<string, number>
    errors: Array<{ entityType: string; error: string }>
  } | null>(null)
  // Ref prevents double-firing in React StrictMode
  const autoStartedRef = useRef(false)
  // Store jobIds for polling and cancellation
  const [jobIds, setJobIds] = useState<number[]>([])
  const [cancelling, setCancelling] = useState(false)
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
        let progressMessage: string | null = null
        let runningCount = 0
        let pendingCount = 0

        responses.forEach((data, idx) => {
          if (!data) return
          const file = statuses[idx]
          if (!file) return

          if (data.status === 'pending') {
            pendingCount++
          } else if (data.status === 'running') {
            runningCount++
            // Running jobs take priority for the progress message
            const progress_pct = data.progress_pct || 0
            const fileLabel = statuses.length > 1 ? ` (file ${idx + 1}/${statuses.length})` : ''
            if (progress_pct === 0) {
              // Pass 0 (pre-analysis) still running — no percentage yet
              progressMessage = `Analyzing document…${fileLabel}`
            } else {
              // Pass-aware message using global progress scale: pass 1=10-32%, 2=32-54%, 3=54-76%, 4=76-100%
              const passIdx = progress_pct <= 32 ? 0 : progress_pct <= 54 ? 1 : progress_pct <= 76 ? 2 : 3
              const passLabel = PASS_LABELS[passIdx]
              const passNum = passIdx + 1
              const passStartPcts = [10, 32, 54, 76]
              const withinPassRaw = Math.round(Math.max(0, progress_pct - passStartPcts[passIdx]) * (100 / 22))
              const withinPassPct = Math.min(100, withinPassRaw)
              progressMessage = `Pass ${passNum} of 4 — ${passLabel} (${withinPassPct}%)${fileLabel}`
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

        // Set message: running job progress takes priority over queued state
        if (progressMessage) {
          setExtractionMessage(progressMessage)
        } else if (pendingCount > 0 && runningCount === 0) {
          const queuedLabel = pendingCount > 1 ? `${pendingCount} files queued` : 'Queued'
          setExtractionMessage(`${queuedLabel} — waiting for worker…`)
        }

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
            // Capture the artifact ID for the approve payload
            const firstFileId = statuses.find(s => s.fileId)?.fileId
            if (firstFileId) setLastExtractedArtifactId(Number(firstFileId))

            // Fetch completed jobs to get staged_items_json
            const completedJobsRes = await fetch(
              `/api/projects/${projectId}/extraction-status`
            )
            const completedData = await completedJobsRes.json()

            // Find our batch and extract all items + proposed changes
            const allItems: ReviewItem[] = []
            const allChanges: ProposedChange[] = []
            let totalFiltered = 0

            for (const job of completedData.jobs) {
              if (jobIdsToCheck.includes(job.id) && job.status === 'completed') {
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

                // Extract proposed changes from Pass 5 (change detection)
                const changes = Array.isArray(job.proposed_changes_json) ? job.proposed_changes_json as ProposedChange[] : []
                allChanges.push(...changes)

                // Track filtered count if available
                if (job.filtered_count) {
                  totalFiltered += job.filtered_count
                }
              }
            }

            // Dedup across files: same entity type + same primary identifier
            const deduped = deduplicateCrossJob(allItems)
            setReviewItems(deduped)
            setProposedChanges(allChanges)
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

  // ── Cancel all active extraction jobs ────────────────────────────────────
  const cancelExtraction = useCallback(async () => {
    if (jobIds.length === 0) return
    setCancelling(true)
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }
    isPollingRef.current = false
    await Promise.allSettled(
      jobIds.map(id => fetch(`/api/ingestion/jobs/${id}`, { method: 'DELETE' }))
    )
    setCancelling(false)
    setStage('uploading')
    setJobIds([])
    setFileStatuses([])
    setExtractionMessage('')
  }, [jobIds])

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
    setApprovalResult(null)

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
      const mapped = initialReviewItems.map(item => ({
        ...item,
        approved: true,
        edited: false,
      }))
      setReviewItems(deduplicateCrossJob(mapped))
      setStage('reviewing')
      if (initialFilteredCount !== undefined) setFilteredCount(initialFilteredCount)
      if (initialProposedChanges.length > 0) setProposedChanges(initialProposedChanges)
    }
  }, [open, initialStage, initialReviewItems, initialFilteredCount, initialProposedChanges])


  // Resume in-progress extraction when modal is opened at 'extracting' stage after a page refresh
  useEffect(() => {
    if (!open || initialStage !== 'extracting' || isPollingRef.current) return

    const resume = async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/extraction-status`)
        if (!res.ok) return
        const data = await res.json()

        const batchEntries = Object.entries(data.batches ?? {})
        if (batchEntries.length === 0) return
        const [, batch] = batchEntries[batchEntries.length - 1] as [string, { jobs: ExtractionJob[], batch_complete: boolean }]

        if (batch.batch_complete) return // already done — ContextTab will show "Review Items" instead

        const activeJobs: ExtractionJob[] = batch.jobs.filter(j => j.status !== 'failed')
        if (activeJobs.length === 0) return

        const resumedStatuses: FileStatus[] = activeJobs.map(j => ({
          name: j.filename ?? `File ${j.id}`,
          status: 'extracting' as const,
          fileId: j.artifact_id != null ? String(j.artifact_id) : undefined,
        }))
        const resumedIds = activeJobs.map(j => j.id)

        setFileStatuses(resumedStatuses)
        setJobIds(resumedIds)
        setStage('extracting')
        startPolling(resumedIds, resumedStatuses)
      } catch (err) {
        console.error('Failed to resume extraction status:', err)
      }
    }

    resume()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialStage, projectId])

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
    let resolvedChanges = changes

    // Reclassification field remapping
    if (changes.entityType && changes.entityType !== reviewItems[index]?.entityType) {
      const contentValue = reviewItems[index]?.fields?.content ?? ''
      const primaryField = NOTE_RECLASSIFY_PRIMARY_FIELD[changes.entityType as NoteReclassifyTarget]
      if (primaryField) {
        resolvedChanges = {
          ...changes,
          fields: { [primaryField]: contentValue },
          edited: true,
        }
      }
    }

    setReviewItems(prev => prev.map((item, i) => i === index ? { ...item, ...resolvedChanges } : item))
  }

  // ── Final approve submission ───────────────────────────────────────────────
  async function handleApprove(approvedItems: ReviewItem[]) {
    setStage('submitting')
    setError(null)

    try {
      // Filter out rejected proposed changes
      const approvedChanges = proposedChanges.filter(c => !rejectedChangeIds.has(c.existingId))

      const res = await fetch('/api/ingestion/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          artifactId: artifactId ?? lastExtractedArtifactId ?? initialArtifactId,
          items: approvedItems.map(item => ({ ...item, conflictResolution: item.conflictResolution ?? 'skip' })),
          totalExtracted: reviewItems.length,
          approvedChanges,
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

      // Extract unresolvedRefs and approval result from response
      setUnresolvedRefs((data.unresolvedRefs as string) ?? null)
      setApprovalResult({
        written: (data.written as Record<string, number>) ?? {},
        skipped: (data.skipped as Record<string, number>) ?? {},
        errors: (data.errors as Array<{ entityType: string; error: string }>) ?? [],
      })
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
        {(fileStatuses.length > 0 || stage === 'extracting' || stage === 'reviewing' || stage === 'submitting' || stage === 'done') && (
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
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-zinc-600 animate-pulse">{extractionMessage || 'Uploading files…'}</p>
                    {stage === 'extracting' && (
                      <button
                        onClick={cancelExtraction}
                        disabled={cancelling}
                        className="text-xs text-zinc-500 hover:text-red-600 underline underline-offset-2 disabled:opacity-50 transition-colors shrink-0"
                      >
                        {cancelling ? 'Cancelling…' : 'Cancel extraction'}
                      </button>
                    )}
                  </div>
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

                  {/* Proposed Changes section (Pillar 1 — document-driven lifecycle) */}
                  {proposedChanges.length > 0 && (
                    <div className="mb-4 px-4">
                      <h3 className="text-sm font-semibold text-amber-700 mb-2">
                        Proposed Changes ({proposedChanges.filter(c => !rejectedChangeIds.has(c.existingId)).length} pending)
                      </h3>
                      <div className="space-y-2">
                        {proposedChanges.map((change) => {
                          const isRejected = rejectedChangeIds.has(change.existingId)
                          const entityName = String(
                            change.existingRecord.description ??
                            change.existingRecord.name ??
                            change.existingRecord.title ??
                            (change.existingRecord as any).workflow_name ??
                            `ID ${change.existingId}`
                          )
                          return (
                            <div
                              key={change.existingId}
                              className={`border rounded p-3 text-sm transition-all ${
                                isRejected ? 'opacity-40 line-through bg-zinc-50' : 'border-amber-200 bg-amber-50'
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-mono bg-white px-1.5 py-0.5 rounded border border-zinc-200">
                                  {change.entityType}
                                </span>
                                <span className={`text-xs font-semibold uppercase ${
                                  change.intent === 'close' ? 'text-blue-600' :
                                  change.intent === 'remove' ? 'text-red-600' : 'text-amber-700'
                                }`}>
                                  {change.intent}
                                </span>
                                <span className="text-xs text-zinc-500 ml-auto">
                                  {Math.round(change.confidence * 100)}% confidence
                                </span>
                              </div>
                              <p className="font-medium text-zinc-800">{entityName}</p>
                              <p className="text-xs text-zinc-600 mt-1">{change.reasoning}</p>
                              <div className="flex gap-2 mt-2">
                                {!isRejected ? (
                                  <button
                                    onClick={() => setRejectedChangeIds(prev => new Set([...prev, change.existingId]))}
                                    className="text-xs text-zinc-500 hover:text-red-600 underline"
                                  >
                                    Reject
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => setRejectedChangeIds(prev => {
                                      const s = new Set(prev)
                                      s.delete(change.existingId)
                                      return s
                                    })}
                                    className="text-xs text-blue-600 underline"
                                  >
                                    Undo reject
                                  </button>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
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

                    {approvalResult && (() => {
                      const writtenEntries = Object.entries(approvalResult.written)
                      const skippedEntries = Object.entries(approvalResult.skipped)
                      const totalWritten = writtenEntries.reduce((s, [, n]) => s + n, 0)

                      return (
                        <div className="text-sm text-zinc-600 space-y-1">
                          {totalWritten > 0 ? (
                            <p>
                              <span className="font-medium text-zinc-800">Written:</span>{' '}
                              {writtenEntries.map(([type, count]) => `${count} ${type}`).join(', ')}
                            </p>
                          ) : (
                            <p className="text-zinc-500">No items were written.</p>
                          )}
                          {skippedEntries.length > 0 && (
                            <p className="text-yellow-700 bg-yellow-50 border border-yellow-200 rounded px-2 py-1">
                              <span className="font-medium">Skipped:</span>{' '}
                              {skippedEntries.map(([type, count]) => `${count} ${type}`).join(', ')}
                            </p>
                          )}
                          {approvalResult.errors.length > 0 && (
                            <p className="text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1">
                              <span className="font-medium">Errors:</span>{' '}
                              {approvalResult.errors.map(e => `${e.entityType}: ${e.error}`).join('; ')}
                            </p>
                          )}
                        </div>
                      )
                    })()}

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
